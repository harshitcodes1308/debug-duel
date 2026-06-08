require('dotenv').config();
const { io } = require('socket.io-client');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SERVER_URL = 'http://localhost:5001';

// We will use two existing users from our DB lookup
const PLAYER_A = {
  id: 'cmpx2wdm400001zesqs5mo51t',
  username: 'syntax_master'
};
const PLAYER_B = {
  id: 'cmpx31zhd0004119y71gi8ran',
  username: 'cyber_ninja'
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log("=== STARTING RANKED SYSTEM INTEGRATION TEST ===");

  // Ensure active season is set up
  let activeSeason = await prisma.season.findFirst({ where: { isActive: true } });
  if (!activeSeason) {
    console.log("No active season found, seeding Season 1...");
    // Let's seed an active season if none exists
    activeSeason = await prisma.season.create({
      data: {
        name: "Test Season 1",
        description: "Integration Testing Season",
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        isActive: true
      }
    });
  }
  console.log(`Active Season: ${activeSeason.name} (${activeSeason.id})`);

  // Ensure participants exist in database
  for (const player of [PLAYER_A, PLAYER_B]) {
    const participant = await prisma.seasonParticipant.findUnique({
      where: {
        seasonId_userId: {
          seasonId: activeSeason.id,
          userId: player.id
        }
      }
    });
    if (!participant) {
      console.log(`Adding ${player.username} as a participant of ${activeSeason.name}...`);
      await prisma.seasonParticipant.create({
        data: {
          seasonId: activeSeason.id,
          userId: player.id,
          currentRank: "Bronze III",
          rankPoints: 0,
          peakRank: "Bronze III",
          wins: 0,
          losses: 0
        }
      });
    }
  }

  // 1. Establish sockets for matchmaking queue
  console.log("\n1. Connecting Player A and Player B to Socket.io...");
  const socketA = io(SERVER_URL);
  const socketB = io(SERVER_URL);

  let matchId = null;

  const matchFoundPromise = new Promise((resolve, reject) => {
    let aFound = false;
    let bFound = false;

    socketA.on('ranked_match_found', (data) => {
      console.log(`[Socket A] Match Found! Match ID: ${data.matchId}`);
      matchId = data.matchId;
      aFound = true;
      if (aFound && bFound) resolve(data);
    });

    socketB.on('ranked_match_found', (data) => {
      console.log(`[Socket B] Match Found! Match ID: ${data.matchId}`);
      bFound = true;
      if (aFound && bFound) resolve(data);
    });

    setTimeout(() => {
      reject(new Error("Timeout waiting for ranked_match_found"));
    }, 15000);
  });

  socketA.on('connect', () => {
    console.log("[Socket A] Connected. Registering...");
    socketA.emit('register_user', { userId: PLAYER_A.id });
    socketA.emit('ranked_queue_join', {
      userId: PLAYER_A.id,
      username: PLAYER_A.username,
      gameType: 'color_match'
    });
  });

  socketB.on('connect', () => {
    console.log("[Socket B] Connected. Registering...");
    socketB.emit('register_user', { userId: PLAYER_B.id });
    socketB.emit('ranked_queue_join', {
      userId: PLAYER_B.id,
      username: PLAYER_B.username,
      gameType: 'color_match'
    });
  });

  console.log("Waiting for matchmaker tick...");
  const matchDetails = await matchFoundPromise;
  console.log("Match successfully found! Details:", JSON.stringify(matchDetails, null, 2));

  // 2. Accept the match
  console.log("\n2. Accepting the match...");
  const startPromise = new Promise((resolve, reject) => {
    let aStarted = false;
    let bStarted = false;
    let startPayload = null;

    socketA.on('ranked_match_start', (data) => {
      console.log("[Socket A] Ranked match started! Arena redirect received.");
      aStarted = true;
      startPayload = data;
      if (aStarted && bStarted) resolve(startPayload);
    });

    socketB.on('ranked_match_start', (data) => {
      console.log("[Socket B] Ranked match started! Arena redirect received.");
      bStarted = true;
      if (aStarted && bStarted) resolve(startPayload);
    });

    setTimeout(() => {
      reject(new Error("Timeout waiting for ranked_match_start"));
    }, 10000);
  });

  socketA.emit('ranked_match_accept', { matchId, userId: PLAYER_A.id });
  socketB.emit('ranked_match_accept', { matchId, userId: PLAYER_B.id });

  const startPayload = await startPromise;
  const { duelId } = startPayload;
  console.log(`Duel ID established: ${duelId}`);

  // Disconnect queue sockets
  socketA.disconnect();
  socketB.disconnect();

  // 3. Connect to the Duel Arena
  console.log("\n3. Connecting players to the Duel Arena socket room...");
  const gameSocketA = io(SERVER_URL);
  const gameSocketB = io(SERVER_URL);

  const resultPromise = new Promise((resolve, reject) => {
    let aResult = null;
    let bResult = null;

    gameSocketA.on('duel_result', (data) => {
      console.log("[Game Socket A] Received duel_result!");
      aResult = data;
      if (aResult && bResult) resolve({ aResult, bResult });
    });

    gameSocketB.on('duel_result', (data) => {
      console.log("[Game Socket B] Received duel_result!");
      bResult = data;
      if (aResult && bResult) resolve({ aResult, bResult });
    });

    setTimeout(() => {
      reject(new Error("Timeout waiting for duel_result"));
    }, 30000);
  });

  gameSocketA.on('connect', () => {
    console.log("[Game Socket A] Connected. Joining duel...");
    
    // Add debugging listeners
    gameSocketA.on('error_message', (err) => console.log('[Socket A Error]', err));
    gameSocketA.on('color_guess_submitted', (res) => console.log('[Socket A Guess Response]', res));
    gameSocketA.on('opponent_submitted', (msg) => console.log('[Socket A Opponent Submitted]', msg));
    gameSocketA.on('lobby_update', (data) => console.log('[Socket A Lobby Update] Status:', data.status));
    gameSocketA.on('countdown_started', (data) => console.log('[Socket A Countdown Started] Duration:', data.duration));
    
    gameSocketA.on('duel_started', (data) => {
      console.log('[Socket A Duel Started] targetColor:', data.targetColor);
      console.log("[Game Socket A] Game active. Submitting color guess in 1s...");
      setTimeout(() => {
        console.log("[Game Socket A] Submitting color guess...");
        gameSocketA.emit('submit_color_guess', {
          duelId,
          userId: PLAYER_A.id,
          r: 100, g: 100, b: 100
        });
      }, 1000);
    });

    gameSocketA.emit('join_duel', { duelId, userId: PLAYER_A.id });
  });

  gameSocketB.on('connect', () => {
    console.log("[Game Socket B] Connected. Joining duel...");
    
    // Add debugging listeners
    gameSocketB.on('error_message', (err) => console.log('[Socket B Error]', err));
    gameSocketB.on('color_guess_submitted', (res) => console.log('[Socket B Guess Response]', res));
    gameSocketB.on('opponent_submitted', (msg) => console.log('[Socket B Opponent Submitted]', msg));
    gameSocketB.on('lobby_update', (data) => console.log('[Socket B Lobby Update] Status:', data.status));
    gameSocketB.on('countdown_started', (data) => console.log('[Socket B Countdown Started] Duration:', data.duration));
    
    gameSocketB.on('duel_started', (data) => {
      console.log('[Socket B Duel Started] targetColor:', data.targetColor);
      console.log("[Game Socket B] Game active. Submitting color guess in 1.5s...");
      setTimeout(() => {
        console.log("[Game Socket B] Submitting color guess...");
        gameSocketB.emit('submit_color_guess', {
          duelId,
          userId: PLAYER_B.id,
          r: 200, g: 200, b: 200
        });
      }, 1500);
    });

    gameSocketB.emit('join_duel', { duelId, userId: PLAYER_B.id });
  });

  const duelOutcome = await resultPromise;
  console.log("\nDuel Outcomes received successfully!");
  console.log("Player A Results:", JSON.stringify(duelOutcome.aResult, null, 2));

  // Disconnect game sockets
  gameSocketA.disconnect();
  gameSocketB.disconnect();

  // Verify that tokens and XP changes are 0
  const winner = duelOutcome.aResult.winnerId;
  console.log(`Winner of the match: ${winner}`);
  const aTokens = duelOutcome.aResult.tokenChanges[PLAYER_A.id] || 0;
  const bTokens = duelOutcome.aResult.tokenChanges[PLAYER_B.id] || 0;
  console.log(`Tokens changes: PLAYER_A = ${aTokens}, PLAYER_B = ${bTokens}`);
  if (aTokens !== 0 || bTokens !== 0) {
    throw new Error("Ranked matches should have 0 token changes!");
  } else {
    console.log("CONFIRMED: Ranked match token reward/wager is 0.");
  }

  // 4. End Season and Distribute Prestige Rewards
  console.log("\n4. Triggering Developer Season End Endpoint...");
  const devEndRes = await fetch(`${SERVER_URL}/api/season/dev-end`, {
    method: 'POST'
  });

  if (!devEndRes.ok) {
    const errorText = await devEndRes.text();
    throw new Error(`dev-end endpoint failed: ${errorText}`);
  }

  const devEndData = await devEndRes.json();
  console.log("Season end response success:", JSON.stringify(devEndData, null, 2));

  // 5. Query Database to verify rewards and rollover
  console.log("\n5. Verifying database state post season rollover...");
  const pastSeason = await prisma.season.findUnique({
    where: { id: activeSeason.id }
  });
  console.log(`Old Season Status - ${pastSeason.name}: isActive = ${pastSeason.isActive}`);
  if (pastSeason.isActive) {
    throw new Error("Old season is still marked as active!");
  }

  const currentActiveSeason = await prisma.season.findFirst({
    where: { isActive: true }
  });
  console.log(`New Active Season: ${currentActiveSeason ? currentActiveSeason.name : 'NONE'}`);
  if (!currentActiveSeason || currentActiveSeason.id === activeSeason.id) {
    throw new Error("New season was not initialized/activated correctly!");
  }

  const claims = await prisma.seasonRewardClaim.findMany({
    where: { seasonId: activeSeason.id },
    include: { reward: true, user: true }
  });
  console.log(`Prestige Rewards distributed to participants: ${claims.length}`);
  for (const c of claims) {
    console.log(`- Reward: ${c.reward.rewardName} (${c.rewardType}) awarded to player: @${c.user.username}`);
  }

  // Verify rank reset
  const userA = await prisma.user.findUnique({ where: { id: PLAYER_A.id } });
  const userB = await prisma.user.findUnique({ where: { id: PLAYER_B.id } });
  console.log(`User A Reset Rank: ${userA.currentRank}, Rank Points: ${userA.rankPoints}`);
  console.log(`User B Reset Rank: ${userB.currentRank}, Rank Points: ${userB.rankPoints}`);

  if (userA.currentRank !== "Bronze III" || userA.rankPoints !== 0) {
    throw new Error("Ranked reset failed for User A");
  }
  if (userB.currentRank !== "Bronze III" || userB.rankPoints !== 0) {
    throw new Error("Ranked reset failed for User B");
  }

  console.log("\n=== ALL RANKED SYSTEM INTEGRATION TESTS PASSED SUCCESSFULLY! ===");
}

runTest()
  .catch(e => {
    console.error("\nTEST FAILED:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
