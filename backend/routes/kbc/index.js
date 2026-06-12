const express = require('express');
const router = express.Router();
const kbcService = require('../../services/kbc');
const kbcRooms = require('../../services/kbc/rooms');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { awardXP } = require('../../utils/xp');
const { checkAchievements } = require('../../services/achievements');
const { updateQuestProgress } = require('../../services/quests');
const { requireAuth } = require('../../middleware/auth');

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
router.get('/questions', async (req, res) => {
  const { category } = req.query;
  try {
    const questionSet = await kbcService.generateQuestionSet(category);
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
router.post('/room/create', requireAuth, async (req, res) => {
  // Use JWT-authenticated userId, ignore any client-supplied userId
  const userId = req.userId;
  const { category, wager = 0 } = req.body;
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
router.post('/solo/end', requireAuth, async (req, res) => {
  // Use JWT-authenticated userId, ignore any client-supplied userId
  const userId = req.userId;
  const { questionsCleared, timePerQuestion, lifelinesUsed, status } = req.body;
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

  // Calculate average answer time
  let averageAnswerTime = 0;
  if (Array.isArray(timePerQuestion) && timePerQuestion.length > 0) {
    const validTimes = timePerQuestion.filter(t => t !== null && t !== undefined && typeof t === 'number');
    if (validTimes.length > 0) {
      const sum = validTimes.reduce((acc, t) => acc + t, 0);
      averageAnswerTime = Math.round((sum / validTimes.length) * 10) / 10;
    }
  }

  // Determine safety milestone prize (KBC Safety guarantees at Level 5 and 10)
  let prizeEarned = 0;
  if (status === 'quit') {
    // Walk away: get exact prize for cleared levels
    const walkAwayPrizes = [0, 10, 20, 30, 40, 50, 80, 110, 140, 170, 200, 260, 320, 380, 440, 500];
    prizeEarned = walkAwayPrizes[Math.min(15, Math.max(0, cleared))];
  } else if (status === 'win' || cleared === 15) {
    prizeEarned = 500;
  } else {
    // Loss or Timeout: drop to safety milestones
    if (cleared >= 10) {
      prizeEarned = 200;
    } else if (cleared >= 5) {
      prizeEarned = 50;
    } else {
      prizeEarned = 0;
    }
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
          averageAnswerTime,
          lifelinesUsed: lifelinesStr,
          prizeEarned
        }
      });

      // 2. Increment user tokens and award XP
      const xpAward = (status === 'win' || cleared === 15) ? 40 : 10;
      await awardXP(userId, xpAward, tx);

      await tx.user.update({
        where: { id: userId },
        data: {
          tokens: { increment: prizeEarned }
        }
      });

      // Audit achievements and quests
      const io = req.app.get('io');
      await checkAchievements(userId, tx, io);
      await updateQuestProgress(userId, "play_kbc", 1, tx, io);
      if (status === 'win' || cleared === 15 || questionsAnswered === 15) {
        await updateQuestProgress(userId, "win_kbc", 1, tx, io);
      }
      if (prizeEarned > 0) {
        await updateQuestProgress(userId, "earn_tokens", prizeEarned, tx, io);
      }
      await updateQuestProgress(userId, "gain_xp", xpAward, tx, io);

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
      averageAnswerTime,
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

// Fetch daily challenge questions
router.get('/daily/questions', requireAuth, async (req, res) => {
  // Use JWT-authenticated userId
  const userId = req.userId;

  const todayStr = new Date().toISOString().split('T')[0];

  try {
    // Check if user already completed the challenge today
    const existingRun = await prisma.dailyChallengeRun.findUnique({
      where: {
        userId_date: {
          userId,
          date: todayStr
        }
      }
    });

    if (existingRun) {
      return res.status(400).json({ hasAttempted: true, error: "You have already attempted today's Daily Challenge." });
    }

    // Find or create daily challenge
    let challenge = await prisma.dailyChallenge.findUnique({
      where: { date: todayStr }
    });

    if (!challenge) {
      const questionSet = await kbcService.generateQuestionSet("general_tech");
      challenge = await prisma.dailyChallenge.create({
        data: {
          date: todayStr,
          questions: JSON.stringify(questionSet)
        }
      });
    }

    res.json(JSON.parse(challenge.questions));
  } catch (error) {
    console.error("Failed to fetch/generate daily challenge:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// End KBC Daily Challenge run and store stats & rewards (double tokens)
router.post('/daily/end', requireAuth, async (req, res) => {
  // Use JWT-authenticated userId, ignore any client-supplied userId
  const userId = req.userId;
  const { questionsCleared, timePerQuestion, status } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const cleared = Number(questionsCleared || 0);

  let totalTime = 0;
  if (Array.isArray(timePerQuestion) && timePerQuestion.length > 0) {
    const validTimes = timePerQuestion.filter(t => t !== null && t !== undefined && typeof t === 'number');
    totalTime = validTimes.reduce((acc, t) => acc + t, 0);
  }

  let basePrize = 0;
  if (status === 'quit') {
    const walkAwayPrizes = [0, 10, 20, 30, 40, 50, 80, 110, 140, 170, 200, 260, 320, 380, 440, 500];
    basePrize = walkAwayPrizes[Math.min(15, Math.max(0, cleared))];
  } else if (status === 'win' || cleared === 15) {
    basePrize = 500;
  } else {
    if (cleared >= 10) {
      basePrize = 200;
    } else if (cleared >= 5) {
      basePrize = 50;
    } else {
      basePrize = 0;
    }
  }
  const prizeEarned = basePrize * 2; // Double tokens for Daily Challenge

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Check if user already completed the challenge today
      const existingRun = await tx.dailyChallengeRun.findUnique({
        where: {
          userId_date: {
            userId,
            date: todayStr
          }
        }
      });

      if (existingRun) {
        throw new Error("ALREADY_ATTEMPTED");
      }

      // Create daily challenge run log
      const runLog = await tx.dailyChallengeRun.create({
        data: {
          userId,
          date: todayStr,
          questionsCleared: cleared,
          timeTaken: totalTime,
          prizeEarned
        }
      });

      // Increment user tokens and award XP
      const xpAward = (status === 'win' || cleared === 15) ? 40 : 10;
      await awardXP(userId, xpAward, tx);

      await tx.user.update({
        where: { id: userId },
        data: {
          tokens: { increment: prizeEarned }
        }
      });

      // Audit achievements and quests
      const io = req.app.get('io');
      await checkAchievements(userId, tx, io);
      await updateQuestProgress(userId, "play_kbc", 1, tx, io);
      if (status === 'win' || cleared === 15) {
        await updateQuestProgress(userId, "win_kbc", 1, tx, io);
      }
      if (prizeEarned > 0) {
        await updateQuestProgress(userId, "earn_tokens", prizeEarned, tx, io);
      }
      await updateQuestProgress(userId, "gain_xp", xpAward, tx, io);

      // Fetch final user record
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
      xp: result.xp,
      level: result.level
    });

  } catch (error) {
    console.error("Failed to save KBC Daily Challenge run:", error);
    if (error.message === "ALREADY_ATTEMPTED") {
      res.status(400).json({ error: "You have already attempted today's Daily Challenge." });
    } else {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});

// Fetch Daily Challenge leaderboard
router.get('/daily/leaderboard', async (req, res) => {
  const todayStr = new Date().toISOString().split('T')[0];
  try {
    const runs = await prisma.dailyChallengeRun.findMany({
      where: { date: todayStr },
      include: {
        user: {
          select: {
            username: true,
            avatar: true,
            level: true
          }
        }
      },
      orderBy: [
        { questionsCleared: 'desc' },
        { timeTaken: 'asc' }
      ],
      take: 20
    });
    res.json(runs);
  } catch (error) {
    console.error("Failed to fetch KBC daily leaderboard:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;

