const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getOrCreateActiveSeason } = require('./season');
const kbcRooms = require('./kbc/rooms');

const queue = [];
const pendingMatches = new Map();
let matchmakingInterval = null;

/**
 * Adds a player to the ranked matchmaking queue.
 */
async function joinQueue(userId, socketId, username, gameType, language) {
  // Check if player already in queue
  const exists = queue.some(p => p.userId === userId);
  if (exists) return { success: false, reason: "Already in queue" };

  // Fetch player ranked ELO
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { rankedElo: true }
  });

  if (!user) return { success: false, reason: "User not found" };

  const player = {
    userId,
    socketId,
    username,
    gameType,
    language: gameType === 'debug' ? language : 'mixed',
    elo: user.rankedElo || 1000,
    joinedAt: Date.now()
  };

  queue.push(player);
  console.log(`[Matchmaker] Player @${username} joined ranked queue for ${gameType} (${player.language}). Queue size: ${queue.length}`);
  return { success: true, elo: player.elo };
}

/**
 * Removes a player from the queue.
 */
function leaveQueue(userId) {
  const index = queue.findIndex(p => p.userId === userId);
  if (index !== -1) {
    const player = queue.splice(index, 1)[0];
    console.log(`[Matchmaker] Player @${player.username} left ranked queue. Queue size: ${queue.length}`);
    return true;
  }
  return false;
}

/**
 * Returns the queue status for a player (size and elapsed time).
 */
function getQueueStatus(userId) {
  const player = queue.find(p => p.userId === userId);
  if (!player) return null;

  return {
    gameType: player.gameType,
    language: player.language,
    elapsedSeconds: Math.floor((Date.now() - player.joinedAt) / 1000),
    queueSize: queue.length
  };
}

/**
 * Selects a bug for a ranked Debug Duel.
 */
async function getRankedBug(language) {
  // Try to find a medium difficulty bug first, then easy, then any
  let bug = await prisma.bug.findFirst({
    where: { language, difficulty: 'medium' }
  });

  if (!bug) {
    bug = await prisma.bug.findFirst({
      where: { language, difficulty: 'easy' }
    });
  }

  if (!bug) {
    bug = await prisma.bug.findFirst({
      where: { language }
    });
  }

  if (!bug) {
    bug = await prisma.bug.findFirst();
  }

  return bug;
}

/**
 * Creates the match records in the database.
 */
async function createRankedMatch(gameType, language, p1, p2) {
  const season = await getOrCreateActiveSeason();

  let duelData = {
    gameType,
    status: 'waiting',
    betAmount: 0,
    isRanked: true,
    seasonId: season.id,
    difficulty: 'medium'
  };

  if (gameType === 'debug') {
    const bug = await getRankedBug(language);
    if (bug) {
      duelData.bugId = bug.id;
      duelData.language = language;
    }
  } else if (gameType === 'color_match') {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    duelData.targetColor = `rgb(${r}, ${g}, ${b})`;
  } else if (gameType === 'kbc') {
    duelData.language = 'general_tech'; // Default category
    duelData.difficulty = 'mixed';
  } else if (gameType === 'change_design') {
    const { designChallenges } = require('./designChallenges');
    const randomChallenge = designChallenges[Math.floor(Math.random() * designChallenges.length)];
    duelData.designChallengeId = randomChallenge.id;
    duelData.difficulty = randomChallenge.difficulty.toLowerCase();
  }

  // Create Duel and Participants in a transaction
  return await prisma.$transaction(async (tx) => {
    const duel = await tx.duel.create({
      data: duelData
    });

    await tx.duelParticipant.create({
      data: {
        duelId: duel.id,
        userId: p1.userId
      }
    });

    await tx.duelParticipant.create({
      data: {
        duelId: duel.id,
        userId: p2.userId
      }
    });

    return duel;
  });
}

/**
 * Handles timeout if any player fails to accept the match.
 */
function handlePendingMatchTimeout(matchId, io) {
  const match = pendingMatches.get(matchId);
  if (!match) return;

  pendingMatches.delete(matchId);
  console.log(`[Matchmaker] Match ${matchId} timed out. p1: ${match.p1.accepted}, p2: ${match.p2.accepted}`);

  // Put players back in queue if they accepted
  if (match.p1.accepted) {
    requeuePlayer(match.p1);
    io.to(match.p1.socketId).emit('ranked_match_requeued', { reason: "Opponent failed to accept" });
  } else {
    io.to(match.p1.socketId).emit('ranked_match_cancelled', { reason: "You failed to accept" });
  }

  if (match.p2.accepted) {
    requeuePlayer(match.p2);
    io.to(match.p2.socketId).emit('ranked_match_requeued', { reason: "Opponent failed to accept" });
  } else {
    io.to(match.p2.socketId).emit('ranked_match_cancelled', { reason: "You failed to accept" });
  }
}

/**
 * Re-adds an accepted player back to the front of the queue.
 */
function requeuePlayer(p) {
  const exists = queue.some(player => player.userId === p.userId);
  if (!exists) {
    queue.unshift({
      userId: p.userId,
      socketId: p.socketId,
      username: p.username,
      gameType: p.gameType,
      language: p.language,
      elo: p.elo,
      joinedAt: p.joinedAt // Retain original queue priority
    });
  }
}

/**
 * Matches players in the queue based on ELO search range expanding over time.
 */
function matchmakeCurrentQueue(io) {
  if (queue.length < 2) return;

  const matchedIndices = new Set();

  for (let i = 0; i < queue.length; i++) {
    if (matchedIndices.has(i)) continue;
    const p1 = queue[i];

    for (let j = i + 1; j < queue.length; j++) {
      if (matchedIndices.has(j)) continue;
      const p2 = queue[j];

      // Must be same game type and same language
      if (p1.gameType !== p2.gameType || p1.language !== p2.language) continue;

      const wait1 = (Date.now() - p1.joinedAt) / 1000;
      const wait2 = (Date.now() - p2.joinedAt) / 1000;

      // ELO search range starts at 100, expands by 50 ELO every 5 seconds wait time
      const range1 = 100 + Math.floor(wait1 / 5) * 50;
      const range2 = 100 + Math.floor(wait2 / 5) * 50;

      const eloDiff = Math.abs(p1.elo - p2.elo);

      if (eloDiff <= range1 && eloDiff <= range2) {
        // Match found!
        matchedIndices.add(i);
        matchedIndices.add(j);

        const matchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const pendingMatch = {
          id: matchId,
          gameType: p1.gameType,
          language: p1.language,
          p1: { ...p1, accepted: false },
          p2: { ...p2, accepted: false },
          timeoutId: setTimeout(() => handlePendingMatchTimeout(matchId, io), 15000)
        };

        pendingMatches.set(matchId, pendingMatch);
        console.log(`[Matchmaker] Found match! ${p1.username} (${p1.elo} ELO) vs ${p2.username} (${p2.elo} ELO). matchId: ${matchId}`);

        // Notify players
        io.to(p1.socketId).emit('ranked_match_found', {
          matchId,
          opponentUsername: p2.username,
          gameType: p1.gameType,
          language: p1.language,
          timeoutSeconds: 15
        });

        io.to(p2.socketId).emit('ranked_match_found', {
          matchId,
          opponentUsername: p1.username,
          gameType: p1.gameType,
          language: p1.language,
          timeoutSeconds: 15
        });

        break;
      }
    }
  }

  // Remove matched players from queue (reverse order to preserve indices)
  const sortedIndices = Array.from(matchedIndices).sort((a, b) => b - a);
  for (const idx of sortedIndices) {
    queue.splice(idx, 1);
  }
}

/**
 * Accept match action.
 */
async function acceptMatch(matchId, userId, io) {
  const match = pendingMatches.get(matchId);
  if (!match) return { success: false, reason: "Match not found or expired" };

  let p = null;
  if (match.p1.userId === userId) p = match.p1;
  else if (match.p2.userId === userId) p = match.p2;

  if (!p) return { success: false, reason: "User not part of this match" };

  p.accepted = true;
  console.log(`[Matchmaker] Player @${p.username} accepted match ${matchId}`);

  // Check if both players accepted
  if (match.p1.accepted && match.p2.accepted) {
    clearTimeout(match.timeoutId);
    pendingMatches.delete(matchId);

    try {
      console.log(`[Matchmaker] Creating ranked match records...`);
      const duel = await createRankedMatch(match.gameType, match.language, match.p1, match.p2);

      let redirectPayload = {
        duelId: duel.id,
        gameType: match.gameType,
        language: match.language
      };

      // KBC Ranked initialization
      if (match.gameType === 'kbc') {
        const roomCode = `R-${duel.id.slice(0, 4)}`.toUpperCase();
        kbcRooms.set(roomCode, {
          roomCode,
          duelId: duel.id,
          host: {
            userId: match.p1.userId,
            username: match.p1.username,
            socketId: null,
            score: 0,
            isLocked: false,
            lockedOption: null,
            lockTime: null,
            lifelines: { fiftyFifty: false, audiencePoll: false, expertAdvice: false, skip: false },
            eliminated: false,
            reconnectTimeout: null
          },
          guest: {
            userId: match.p2.userId,
            username: match.p2.username,
            socketId: null,
            score: 0,
            isLocked: false,
            lockedOption: null,
            lockTime: null,
            lifelines: { fiftyFifty: false, audiencePoll: false, expertAdvice: false, skip: false },
            eliminated: false,
            reconnectTimeout: null
          },
          status: 'waiting',
          category: 'javascript', // Default category for tech quiz
          questions: [],
          currentQuestionIndex: 0,
          timeLeft: 30,
          timerInterval: null,
          winnerId: null
        });

        redirectPayload.roomCode = roomCode;
      }

      // Start the match for both clients
      io.to(match.p1.socketId).emit('ranked_match_start', redirectPayload);
      io.to(match.p2.socketId).emit('ranked_match_start', redirectPayload);
      console.log(`[Matchmaker] Match ${matchId} started! redirectPayload:`, redirectPayload);
    } catch (e) {
      console.error("[Matchmaker] Error launching ranked game:", e);
      io.to(match.p1.socketId).emit('ranked_match_cancelled', { reason: "Server error creating match" });
      io.to(match.p2.socketId).emit('ranked_match_cancelled', { reason: "Server error creating match" });
    }
  }

  return { success: true };
}

/**
 * Decline match action.
 */
function declineMatch(matchId, userId, io) {
  const match = pendingMatches.get(matchId);
  if (!match) return false;

  clearTimeout(match.timeoutId);
  pendingMatches.delete(matchId);

  console.log(`[Matchmaker] Match ${matchId} declined by user ${userId}`);

  // Re-queue the non-declining player
  const decliningIsP1 = match.p1.userId === userId;
  const survivor = decliningIsP1 ? match.p2 : match.p1;
  const decliner = decliningIsP1 ? match.p1 : match.p2;

  io.to(decliner.socketId).emit('ranked_match_cancelled', { reason: "You declined the match" });

  requeuePlayer(survivor);
  io.to(survivor.socketId).emit('ranked_match_requeued', { reason: "Opponent declined the match" });

  return true;
}

/**
 * Starts the global matchmaking loop.
 */
function startMatchmaker(io) {
  if (matchmakingInterval) return;

  matchmakingInterval = setInterval(() => {
    try {
      matchmakeCurrentQueue(io);
    } catch (e) {
      console.error("[Matchmaker] Error in matchmaking ticker loop:", e);
    }
  }, 2000);

  console.log("[Matchmaker] Ranked matchmaker service initialized and ticking.");
}

module.exports = {
  joinQueue,
  leaveQueue,
  getQueueStatus,
  acceptMatch,
  declineMatch,
  startMatchmaker,
  queue
};
