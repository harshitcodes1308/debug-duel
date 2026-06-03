const express = require('express');
const router = express.Router();
const kbcService = require('../../services/kbc');
const kbcRooms = require('../../services/kbc/rooms');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { awardXP } = require('../../utils/xp');
const { checkAchievements } = require('../../services/achievements');

// Helper to generate a 6-character room code
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (kbcRooms.has(code));
  return code;
}

// Fetch 15 progressive questions for a specific category
router.get('/questions', (req, res) => {
  const { category } = req.query;
  try {
    const questionSet = kbcService.generateQuestionSet(category);
    res.json(questionSet);
  } catch (error) {
    console.error("Failed to generate KBC question set:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Verify answer endpoint (provides scaling for multiplayer later)
router.post('/verify', (req, res) => {
  const { questionId, selectedIndex } = req.body;
  if (questionId === undefined || selectedIndex === undefined) {
    return res.status(400).json({ error: "Missing questionId or selectedIndex" });
  }
  try {
    const verification = kbcService.verifyAnswer(questionId, selectedIndex);
    res.json(verification);
  } catch (error) {
    console.error("Failed to verify KBC answer:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Create KBC Private Room
router.post('/room/create', async (req, res) => {
  const { userId, category, wager = 0 } = req.body;
  if (!userId || !category) {
    return res.status(400).json({ error: "Missing userId or category" });
  }

  try {
    const hostUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!hostUser) {
      return res.status(404).json({ error: "Host user not found" });
    }

    if (hostUser.tokens < wager) {
      return res.status(400).json({ error: `Insufficient tokens (${hostUser.tokens}) for this wager.` });
    }

    const roomCode = generateRoomCode();
    
    // Create Duel record in DB to track match history
    const duel = await prisma.duel.create({
      data: {
        gameType: "kbc",
        status: "waiting",
        betAmount: Number(wager),
        language: category,
        difficulty: "mixed"
      }
    });

    // Create participant record
    await prisma.duelParticipant.create({
      data: {
        duelId: duel.id,
        userId: hostUser.id
      }
    });

    // Register room in memory map
    kbcRooms.set(roomCode, {
      roomCode,
      duelId: duel.id,
      host: {
        userId: hostUser.id,
        username: hostUser.username,
        score: 0,
        isLocked: false,
        lockedOption: null,
        lockTime: null,
        lifelines: { fiftyFifty: false, audiencePoll: false, expertAdvice: false, skip: false },
        eliminated: false,
        reconnectTimeout: null
      },
      guest: null,
      status: 'waiting',
      category,
      questions: [],
      currentQuestionIndex: 0,
      timeLeft: 30,
      timerInterval: null,
      winnerId: null
    });

    res.json({ success: true, roomCode, duelId: duel.id });
  } catch (error) {
    console.error("Failed to create KBC room:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Verify KBC Room Code
router.get('/room/verify/:roomCode', (req, res) => {
  const { roomCode } = req.params;
  const upperCode = roomCode.toUpperCase();
  const room = kbcRooms.get(upperCode);

  if (!room) {
    return res.json({ valid: false, error: "Room not found." });
  }

  if (room.status !== 'waiting') {
    return res.json({ valid: false, error: "Match is already in progress or completed." });
  }

  res.json({
    valid: true,
    category: room.category,
    wager: room.betAmount,
    host: room.host.username
  });
});

// KBC configurations/metadata endpoint
router.get('/config', (req, res) => {
  res.json({
    status: "active",
    gameMode: "Code KBC",
    phase: 1,
    categories: [
      "javascript",
      "react",
      "nodejs",
      "python",
      "sql",
      "git",
      "ai_llm",
      "sys_design"
    ]
  });
});

// End KBC Solo Challenge run and store stats & rewards
router.post('/solo/end', async (req, res) => {
  const { userId, questionsCleared, timePerQuestion, lifelinesUsed, status } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const cleared = Number(questionsCleared || 0);
  const attempted = status === 'win' || cleared === 15 ? 15 : cleared + 1;
  const questionsAnswered = Math.min(15, Math.max(1, attempted));
  
  // Calculate accuracy
  const accuracy = Math.round((cleared / questionsAnswered) * 100 * 10) / 10;

  // Calculate fastest answer
  let fastestAnswerTime = 0;
  if (Array.isArray(timePerQuestion) && timePerQuestion.length > 0) {
    const validTimes = timePerQuestion.filter(t => t !== null && t !== undefined && typeof t === 'number');
    if (validTimes.length > 0) {
      fastestAnswerTime = Math.min(...validTimes);
    }
  }

  // Determine safety milestone prize (KBC Safety guarantees at Level 5 and 10)
  let prizeEarned = 0;
  if (status === 'win' || cleared === 15) {
    prizeEarned = 500;
  } else if (cleared >= 10) {
    prizeEarned = 200;
  } else if (cleared >= 5) {
    prizeEarned = 50;
  } else {
    prizeEarned = cleared * 10;
  }

  const lifelinesStr = Array.isArray(lifelinesUsed) ? lifelinesUsed.join(',') : '';

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Row-level lock to prevent concurrency race conditions
      const users = await tx.$queryRaw`SELECT tokens FROM "User" WHERE id = ${userId} FOR UPDATE`;
      if (!users || users.length === 0) {
        throw new Error("USER_NOT_FOUND");
      }

      // 1. Create run log
      const runLog = await tx.kbcSoloRun.create({
        data: {
          userId,
          questionsAnswered,
          accuracy,
          fastestAnswerTime,
          lifelinesUsed: lifelinesStr,
          prizeEarned
        }
      });

      // 2. Increment user tokens and award XP
      const xpAward = (status === 'win' || cleared === 15) ? 40 : 10;
      await awardXP(userId, xpAward, tx);

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          tokens: { increment: prizeEarned }
        }
      });

      // Audit achievements
      const io = req.app.get('io');
      await checkAchievements(userId, tx, io);

      // Fetch final user record to ensure accurate return values
      const finalUser = await tx.user.findUnique({
        where: { id: userId }
      });

      return {
        runId: runLog.id,
        newTokens: finalUser.tokens,
        xp: finalUser.xp,
        level: finalUser.level
      };
    });

    res.json({
      success: true,
      prizeEarned,
      newTokens: result.newTokens,
      runId: result.runId,
      accuracy,
      fastestAnswerTime,
      xp: result.xp,
      level: result.level
    });

  } catch (error) {
    console.error("Failed to save KBC Solo run:", error);
    if (error.message === "USER_NOT_FOUND") {
      res.status(404).json({ error: "User not found" });
    } else {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});

module.exports = router;

