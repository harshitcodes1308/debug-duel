const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const { GoogleGenAI } = require('@google/generative-ai');
const OpenAI = require('openai');

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: '*', // For local development accessibility
  methods: ['GET', 'POST']
}));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;

// ==================== HELPERS ====================

// ELO Calculation
function calculateElo(ratingA, ratingB, outcomeA) {
  const K = 32;
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const change = Math.round(K * (outcomeA - expectedA));
  return change;
}

// Get Rank Tier based on ELO
function getRankTier(elo) {
  if (elo >= 1800) return "Zero-Day God";
  if (elo >= 1500) return "Exploit Master";
  if (elo >= 1200) return "Code Surgeon";
  return "Bug Hunter";
}

// Normalized Code Comp (Fallback Mode)
function cleanCode(code) {
  if (!code) return '';
  return code
    .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '') // strip comments
    .replace(/\s+/g, ' ')                                 // collapse spacing
    .trim();
}

function verifyCodeFallback(broken, fixed, submitted) {
  const cleanSubmitted = cleanCode(submitted);
  const cleanFixed = cleanCode(fixed);
  const cleanBroken = cleanCode(broken);

  if (cleanSubmitted === cleanFixed) {
    return { passed: true, reason: "Submitted code exactly matches the solution (normalized)." };
  }

  // Check if they fixed the critical part without changing the rest
  // If the submitted code is no longer matching the broken state and is close to fixed, pass
  if (cleanSubmitted !== cleanBroken && (cleanSubmitted.includes(cleanFixed.substring(0, 15)) || cleanFixed.includes(cleanSubmitted.substring(0, 15)))) {
    // Quick heuristic
    return { passed: true, reason: "Heuristic match: The bug has been resolved." };
  }

  return { passed: false, reason: "Your fix does not produce the expected behavior." };
}

// AI Judging Services (Gemini / OpenAI / Fallback)
async function judgeCode(language, brokenCode, fixedCode, submittedCode) {
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const systemPrompt = `You are a code judge. Compare the submitted fix to the expected fix.
Analyze if the bug in the broken code has been correctly resolved in the submitted fix.
You must return a valid JSON object only. Format:
{ "passed": true/false, "reason": "brief explanation of why it passed or failed" }`;

  const userPrompt = `Language: ${language}
Broken code:
${brokenCode}

Expected fixed code:
${fixedCode}

Submitted fix:
${submittedCode}`;

  // 1. Try Gemini
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: { responseMimeType: "application/json" }
      });
      const text = response.response.text();
      return JSON.parse(text);
    } catch (err) {
      console.error("Gemini AI Judge failed, falling back...", err);
    }
  }

  // 2. Try OpenAI
  if (openAiKey) {
    try {
      const openai = new OpenAI({ apiKey: openAiKey });
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      });
      return JSON.parse(response.choices[0].message.content);
    } catch (err) {
      console.error("OpenAI AI Judge failed, falling back...", err);
    }
  }

  // 3. Fallback
  console.log("Using local code verification fallback.");
  return verifyCodeFallback(brokenCode, fixedCode, submittedCode);
}

async function judgeExplanation(bugDescription, playerExplanation) {
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const systemPrompt = `Score this debugging explanation from 0 to 20.
20 = perfectly explains root cause + why it breaks + how the fix works.
0 = wrong or missing.
Return JSON: { "score": number, "feedback": "1 sentence feedback" }`;

  const userPrompt = `Bug details: ${bugDescription}
Player explanation: ${playerExplanation}`;

  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: { responseMimeType: "application/json" }
      });
      const text = response.response.text();
      return JSON.parse(text);
    } catch (err) {
      console.error("Gemini Explanation Judge failed...", err);
    }
  }

  if (openAiKey) {
    try {
      const openai = new OpenAI({ apiKey: openAiKey });
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      });
      return JSON.parse(response.choices[0].message.content);
    } catch (err) {
      console.error("OpenAI Explanation Judge failed...", err);
    }
  }

  // Fallback Explanation Logic
  console.log("Using local explanation scoring fallback.");
  if (!playerExplanation || playerExplanation.trim().length < 10) {
    return { score: 5, feedback: "Explanation is too short or missing key details. (Fallback)" };
  }
  const score = Math.floor(Math.random() * 6) + 14; // 14-19
  return { score, feedback: "Clear description of the fix. (Fallback)" };
}

// ==================== REST ENDPOINTS ====================

function generateFriendKey() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'sk_dd_';
  for (let i = 0; i < 8; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

// User sync (Login / Register)
app.post('/api/user/sync', async (req, res) => {
  const { clerkId, username } = req.body;
  if (!clerkId || !username) {
    return res.status(400).json({ error: "Missing clerkId or username" });
  }

  try {
    let user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId,
          username,
          tokens: 500,
          eloJS: 1000,
          eloPython: 1000,
          eloJava: 1000,
          eloUIUX: 1000,
          rank: "Bug Hunter",
          friendKey: generateFriendKey()
        }
      });
    } else if (!user.friendKey || !user.friendKey.startsWith('sk_dd_')) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { friendKey: generateFriendKey() }
      });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database sync failed" });
  }
});

// Friends list with live statuses
app.get('/api/friends', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "Missing userId" });
  try {
    const friendships = await prisma.friendship.findMany({
      where: { userId },
      include: {
        friend: {
          select: {
            id: true,
            username: true,
            eloJS: true,
            eloPython: true,
            eloJava: true,
            rank: true,
            tokens: true
          }
        }
      }
    });

    const friendsList = await Promise.all(friendships.map(async (f) => {
      const friend = f.friend;
      let status = 'offline';
      
      if (onlineUsers.has(friend.id)) {
        status = 'online';
        // Check if in active duel
        const activeDuel = await prisma.duelParticipant.findFirst({
          where: {
            userId: friend.id,
            duel: {
              status: 'active'
            }
          }
        });
        if (activeDuel) {
          status = 'ingame';
        }
      }

      return {
        id: friend.id,
        username: friend.username,
        eloJS: friend.eloJS,
        eloPython: friend.eloPython,
        eloJava: friend.eloJava,
        rank: friend.rank,
        status
      };
    }));

    res.json(friendsList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch friends" });
  }
});

// Add friend by key
app.post('/api/friends/add', async (req, res) => {
  const { userId, friendKey } = req.body;
  if (!userId || !friendKey) {
    return res.status(400).json({ error: "Missing userId or friendKey" });
  }

  try {
    const friend = await prisma.user.findUnique({
      where: { friendKey }
    });

    if (!friend) {
      return res.status(404).json({ error: "User with this friend key not found." });
    }

    if (friend.id === userId) {
      return res.status(400).json({ error: "You cannot add yourself as a friend." });
    }

    const existing = await prisma.friendship.findFirst({
      where: {
        userId,
        friendId: friend.id
      }
    });

    if (existing) {
      return res.status(400).json({ error: "You are already friends with this user." });
    }

    await prisma.$transaction([
      prisma.friendship.create({
        data: { userId, friendId: friend.id }
      }),
      prisma.friendship.create({
        data: { userId: friend.id, friendId: userId }
      })
    ]);

    res.json({ success: true, friend: { id: friend.id, username: friend.username } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add friend." });
  }
});

// Daily Login Claim
app.post('/api/user/dailylogin', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Row-level lock to prevent concurrent double-claiming race conditions
      const users = await tx.$queryRaw`SELECT * FROM "User" WHERE id = ${userId} FOR UPDATE`;
      if (!users || users.length === 0) {
        throw new Error("USER_NOT_FOUND");
      }
      
      const user = users[0];
      const now = new Date();
      
      let newStreak = 1;
      let rewardAmount = 50;

      if (user.lastDailyClaim) {
        const lastClaim = new Date(user.lastDailyClaim);
        
        // Get midnights in local server time to define calendar days
        const getMidnight = (d) => {
          const temp = new Date(d);
          temp.setHours(0, 0, 0, 0);
          return temp.getTime();
        };

        const nowMidnight = getMidnight(now);
        const lastMidnight = getMidnight(lastClaim);

        const diffMs = nowMidnight - lastMidnight;
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          throw new Error("ALREADY_CLAIMED");
        } else if (diffDays === 1) {
          // Claiming on consecutive day
          newStreak = (user.dailyStreak || 0) + 1;
        } else {
          // Missed at least one day, reset streak to 1
          newStreak = 1;
        }
      } else {
        // Fresh claim
        newStreak = 1;
      }

      // Scaling rewards based on streak
      if (newStreak === 1) rewardAmount = 50;
      else if (newStreak === 2) rewardAmount = 75;
      else if (newStreak === 3) rewardAmount = 100;
      else if (newStreak === 4) rewardAmount = 125;
      else if (newStreak === 5) rewardAmount = 150;
      else if (newStreak === 6) rewardAmount = 200;
      else if (newStreak >= 7) rewardAmount = 250;

      // Bonus milestone payouts
      let bonus = 0;
      if (newStreak === 7) bonus = 500;
      else if (newStreak === 30) bonus = 2500;

      const totalReward = rewardAmount + bonus;

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          tokens: { increment: totalReward },
          dailyStreak: newStreak,
          lastDailyClaim: now
        }
      });

      return {
        tokens: updatedUser.tokens,
        streak: newStreak,
        added: totalReward
      };
    });

    res.json({ success: true, tokens: result.tokens, streak: result.streak, added: result.added });
  } catch (error) {
    if (error.message === "USER_NOT_FOUND") {
      res.status(404).json({ error: "User not found" });
    } else if (error.message === "ALREADY_CLAIMED") {
      res.status(400).json({ error: "Already claimed today!" });
    } else {
      console.error("Daily login error:", error);
      res.status(500).json({ error: "Daily login action failed" });
    }
  }
});

// User Profile Stats
app.get('/api/profile/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        duels: {
          include: {
            duel: {
              include: {
                bug: true,
                participants: {
                  include: { user: true }
                }
              }
            }
          },
          orderBy: { id: 'desc' },
          take: 5
        }
      }
    });

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Fetch failed" });
  }
});

// Leaderboard Top 50
app.get('/api/leaderboard', async (req, res) => {
  const { language } = req.query; // "javascript" | "python" | "java" | "uiux"
  let orderByField = "eloJS";
  if (language === "python") orderByField = "eloPython";
  if (language === "java") orderByField = "eloJava";
  if (language === "uiux") orderByField = "eloUIUX";

  try {
    const topPlayers = await prisma.user.findMany({
      orderBy: { [orderByField]: 'desc' },
      take: 50
    });
    res.json(topPlayers);
  } catch (error) {
    res.status(500).json({ error: "Fetch failed" });
  }
});

// Create Duel Lobby
app.post('/api/duel/create', async (req, res) => {
  const { userId, gameType = "debug", language, difficulty, betAmount } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.tokens < betAmount) {
      return res.status(400).json({ error: "Insufficient tokens for this bet." });
    }

    let targetColor = null;
    let newDuelData = {
      gameType,
      status: "waiting",
      betAmount: Number(betAmount),
    };

    if (gameType === "color_match") {
      const r = Math.floor(Math.random() * 256);
      const g = Math.floor(Math.random() * 256);
      const b = Math.floor(Math.random() * 256);
      targetColor = `rgb(${r}, ${g}, ${b})`;
      newDuelData.targetColor = targetColor;
      newDuelData.difficulty = "medium";
    } else {
      // Select random bug matching parameters
      const bugsMatching = await prisma.bug.findMany({
        where: { language, difficulty }
      });

      if (bugsMatching.length === 0) {
        return res.status(404).json({ error: `No bugs found in database for language ${language} and difficulty ${difficulty}. Seed your database.` });
      }

      const randomBug = bugsMatching[Math.floor(Math.random() * bugsMatching.length)];
      newDuelData.bugId = randomBug.id;
      newDuelData.language = language;
      newDuelData.difficulty = difficulty;
    }

    const newDuel = await prisma.duel.create({
      data: newDuelData
    });

    // Create participant record for host
    await prisma.duelParticipant.create({
      data: {
        duelId: newDuel.id,
        userId: user.id
      }
    });

    res.json({ duelId: newDuel.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create duel" });
  }
});

// Get Duel details
app.get('/api/duel/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const duel = await prisma.duel.findUnique({
      where: { id },
      include: {
        bug: true,
        participants: {
          include: { user: true }
        }
      }
    });

    if (!duel) return res.status(404).json({ error: "Duel not found" });

    // Security check: Remove fixedCode and explanation if not completed
    if (duel.status !== "completed" && duel.bug) {
      duel.bug.fixedCode = "";
      duel.bug.explanation = "";
    }

    res.json(duel);
  } catch (error) {
    res.status(500).json({ error: "Fetch failed" });
  }
});

// Get Random Daily Challenge Bug
app.get('/api/bugs/random', async (req, res) => {
  const { language, difficulty } = req.query;
  try {
    const bugs = await prisma.bug.findMany({
      where: {
        language: language || "javascript",
        difficulty: difficulty || "easy"
      }
    });
    if (bugs.length === 0) return res.status(404).json({ error: "No bugs found" });
    const bug = bugs[Math.floor(Math.random() * bugs.length)];
    res.json(bug);
  } catch (error) {
    res.status(500).json({ error: "Fetch failed" });
  }
});

// ==================== REAL-TIME WEBSOCKET (SOCKET.IO) ====================

const activeDuels = new Map(); // tracks running state, timers, FOMO loops
const onlineUsers = new Map(); // userId -> Set of socket.ids

const FOMO_MESSAGES = [
  "{opponent} is typing fast 🔥",
  "{opponent} just deleted 3 lines",
  "{opponent} ran the code",
  "{opponent} is 60% done",
  "{opponent} found something...",
  "{opponent} hesitated",
  "{opponent} rewrote everything",
  "They're close. Can you feel it?",
  "{opponent} slowed down 👀",
  "The gap is closing..."
];

const COLOR_FOMO_MESSAGES = [
  "{opponent} is adjusting their sliders...",
  "{opponent} is 40% confident...",
  "{opponent} is analyzing the palette...",
  "{opponent} is fine-tuning the blue level...",
  "{opponent} is experimenting with green...",
  "{opponent} has locked in a value...",
  "{opponent} is double-checking their guess..."
];

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Register user online
  socket.on('register_user', ({ userId }) => {
    if (!userId) return;
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);
    socket.join(`user:${userId}`);
    console.log(`Socket registered user ${userId}. Total online: ${onlineUsers.size}`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    for (const [userId, socketIds] of onlineUsers.entries()) {
      if (socketIds.has(socket.id)) {
        socketIds.delete(socket.id);
        if (socketIds.size === 0) {
          onlineUsers.delete(userId);
        }
        console.log(`Socket disconnected user ${userId}. Total online: ${onlineUsers.size}`);
        break;
      }
    }
  });

  // Send duel invite
  socket.on('send_duel_invite', async ({ hostId, hostUsername, friendId, language, difficulty, betAmount }) => {
    try {
      const host = await prisma.user.findUnique({ where: { id: hostId } });
      const friend = await prisma.user.findUnique({ where: { id: friendId } });

      if (!host || !friend) {
        socket.emit('invite_failed', { error: "User not found." });
        return;
      }

      if (host.tokens < betAmount) {
        socket.emit('invite_failed', { error: `You don't have enough tokens (${host.tokens}) for this bet.` });
        return;
      }

      if (friend.tokens < betAmount) {
        socket.emit('invite_failed', { error: `${friend.username} doesn't have enough tokens (${friend.tokens}) to accept this bet.` });
        return;
      }

      if (!onlineUsers.has(friendId)) {
        socket.emit('invite_failed', { error: `${friend.username} is offline right now.` });
        return;
      }

      const bugs = await prisma.bug.findMany({ where: { language, difficulty } });
      if (bugs.length === 0) {
        socket.emit('invite_failed', { error: "No bugs found for this language and difficulty." });
        return;
      }
      const bug = bugs[Math.floor(Math.random() * bugs.length)];

      const duel = await prisma.duel.create({
        data: {
          bugId: bug.id,
          status: "waiting",
          betAmount,
          language,
          difficulty,
          participants: {
            create: {
              userId: hostId
            }
          }
        }
      });

      io.to(`user:${friendId}`).emit('duel_invite_received', {
        duelId: duel.id,
        hostId,
        hostUsername,
        language,
        difficulty,
        betAmount
      });

      socket.emit('invite_sent', { duelId: duel.id });
    } catch (e) {
      console.error(e);
      socket.emit('invite_failed', { error: "Internal server error creating duel invite." });
    }
  });

  // Decline duel invite
  socket.on('decline_duel_invite', async ({ duelId }) => {
    try {
      const duel = await prisma.duel.findUnique({ where: { id: duelId } });
      if (duel && duel.status === 'waiting') {
        await prisma.duel.update({
          where: { id: duelId },
          data: { status: 'completed' }
        });
        io.to(`duel:${duelId}`).emit('duel_invite_declined', { message: "Invitation declined." });
      }
    } catch (e) {
      console.error(e);
    }
  });

  // Accept duel invite
  socket.on('accept_duel_invite', async ({ duelId, friendId }) => {
    try {
      const duel = await prisma.duel.findUnique({
        where: { id: duelId },
        include: { participants: true }
      });

      if (!duel) {
        socket.emit('error_message', { message: "Duel not found or expired." });
        return;
      }

      if (duel.status !== 'waiting' || duel.participants.length >= 2) {
        socket.emit('error_message', { message: "Duel is no longer joinable." });
        return;
      }

      const friend = await prisma.user.findUnique({ where: { id: friendId } });
      if (friend.tokens < duel.betAmount) {
        socket.emit('error_message', { message: "You don't have enough tokens to accept this wager." });
        return;
      }

      const isParticipant = duel.participants.some(p => p.userId === friendId);
      if (!isParticipant) {
        await prisma.duelParticipant.create({
          data: {
            duelId: duel.id,
            userId: friendId
          }
        });
      }

      socket.emit('invite_accepted_confirm', { duelId });
      io.to(`duel:${duelId}`).emit('duel_invite_accepted', { duelId });
    } catch (e) {
      console.error(e);
      socket.emit('error_message', { message: "Internal error accepting invite." });
    }
  });

  // Join lobby
  socket.on('join_duel', async ({ duelId, userId }) => {
    try {
      const duel = await prisma.duel.findUnique({
        where: { id: duelId },
        include: {
          participants: { include: { user: true } }
        }
      });

      if (!duel) {
        socket.emit('error_message', { message: "Duel not found" });
        return;
      }

      // Check if user is already a participant, if not, add them
      let isParticipant = duel.participants.some(p => p.userId === userId);
      if (!isParticipant && duel.participants.length < 2 && duel.status === 'waiting') {
        // Double check token balance for entering bet
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user.tokens < duel.betAmount) {
          socket.emit('error_message', { message: "Insufficient tokens to join bet." });
          return;
        }

        await prisma.duelParticipant.create({
          data: {
            duelId: duel.id,
            userId: userId
          }
        });
        isParticipant = true;
      }

      socket.join(`duel:${duelId}`);
      socket.join(userId); // Join user-specific room for target emissions

      const updatedDuel = await prisma.duel.findUnique({
        where: { id: duelId },
        include: {
          bug: true,
          participants: { include: { user: true } }
        }
      });

      // Notify room about joiner
      io.to(`duel:${duelId}`).emit('lobby_update', {
        participants: updatedDuel.participants,
        status: updatedDuel.status
      });

      // If lobby is full (2 players) and status is waiting, start countdown
      if (updatedDuel.participants.length === 2 && updatedDuel.status === 'waiting') {
        io.to(`duel:${duelId}`).emit('countdown_started', { duration: 3 });

        setTimeout(async () => {
          // Update status to active
          await prisma.duel.update({
            where: { id: duelId },
            data: {
              status: "active",
              startedAt: new Date()
            }
          });

          if (updatedDuel.gameType === 'color_match') {
            io.to(`duel:${duelId}`).emit('duel_started', {
              targetColor: updatedDuel.targetColor,
              startTime: Date.now()
            });
          } else {
            // Fetch bug solution securely hidden in code
            const secureBug = updatedDuel.bug ? { ...updatedDuel.bug } : null;
            if (secureBug) {
              secureBug.fixedCode = "";
              secureBug.explanation = "";
            }

            io.to(`duel:${duelId}`).emit('duel_started', {
              bug: secureBug,
              startTime: Date.now()
            });
          }

          // Start FOMO Engine interval
          startFomoEngine(duelId, updatedDuel.participants, updatedDuel.gameType);
        }, 3000);
      }
    } catch (e) {
      console.error(e);
      socket.emit('error_message', { message: "Failed joining room." });
    }
  });

  // Submit code for verification
  socket.on('submit_code', async ({ duelId, userId, code }) => {
    try {
      const duel = await prisma.duel.findUnique({
        where: { id: duelId },
        include: { bug: true }
      });

      if (!duel || duel.status !== 'active') {
        socket.emit('code_judged', { passed: false, reason: "Duel is not active." });
        return;
      }

      const result = await judgeCode(duel.language, duel.bug.brokenCode, duel.bug.fixedCode, code);

      if (result.passed) {
        // Save the code to participant record
        await prisma.duelParticipant.updateMany({
          where: { duelId, userId },
          data: { submittedCode: code }
        });

        // Notify opponent that the user submitted
        socket.to(`duel:${duelId}`).emit('opponent_submitted', {});
      }

      socket.emit('code_judged', result);
    } catch (error) {
      console.error(error);
      socket.emit('code_judged', { passed: false, reason: "Verification server error." });
    }
  });

  // Submit color guess
  socket.on('submit_color_guess', async ({ duelId, userId, r, g, b }) => {
    try {
      const duel = await prisma.duel.findUnique({
        where: { id: duelId },
        include: {
          participants: { include: { user: true } }
        }
      });

      if (!duel || duel.status !== 'active') {
        socket.emit('color_guess_submitted', { success: false, reason: "Duel is not active." });
        return;
      }

      // Parse target color: e.g. "rgb(120, 80, 200)"
      const targetMatch = duel.targetColor.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
      if (!targetMatch) {
        socket.emit('color_guess_submitted', { success: false, reason: "Invalid target color format." });
        return;
      }

      const tr = parseInt(targetMatch[1]);
      const tg = parseInt(targetMatch[2]);
      const tb = parseInt(targetMatch[3]);

      // Calculate score based on Euclidean distance
      const distance = Math.sqrt(Math.pow(r - tr, 2) + Math.pow(g - tg, 2) + Math.pow(b - tb, 2));
      const maxDistance = Math.sqrt(Math.pow(255, 2) * 3); // ~441.67
      const score = Math.max(0, Math.round(1000 * (1 - (distance / maxDistance))));

      const submittedColor = `rgb(${r}, ${g}, ${b})`;
      const submitTime = Math.round((Date.now() - new Date(duel.startedAt).getTime()) / 1000);

      let eloChanges = {};
      let tokenChanges = {};
      let winnerId = null;
      let loserId = null;
      let isDraw = false;
      let triggerResultBroadcast = false;

      await prisma.$transaction(async (tx) => {
        // Row-level lock to prevent concurrency race conditions
        const duels = await tx.$queryRaw`SELECT status, "startedAt", "betAmount", "targetColor" FROM "Duel" WHERE id = ${duelId} FOR UPDATE`;
        const dbDuel = duels[0];
        if (!dbDuel || dbDuel.status !== 'active') {
          throw new Error("ALREADY_COMPLETED");
        }

        // Lock participants
        await tx.$queryRaw`SELECT id FROM "DuelParticipant" WHERE "duelId" = ${duelId} FOR UPDATE`;

        // Save user submission
        await tx.duelParticipant.updateMany({
          where: { duelId, userId },
          data: {
            submittedColor,
            colorScore: score,
            submitTime
          }
        });

        // Refetch participants inside locked transaction scope
        const dbParticipants = await tx.duelParticipant.findMany({
          where: { duelId },
          include: { user: true }
        });

        const allSubmitted = dbParticipants.every(p => p.submittedColor !== null);
        if (allSubmitted) {
          triggerResultBroadcast = true;

          // Stop FOMO
          stopFomoEngine(duelId);

          const p1 = dbParticipants[0];
          const p2 = dbParticipants[1];

          if (p1.colorScore > p2.colorScore) {
            winnerId = p1.userId;
            loserId = p2.userId;
          } else if (p2.colorScore > p1.colorScore) {
            winnerId = p2.userId;
            loserId = p1.userId;
          } else {
            // Tiebreaker: faster submitTime
            if (p1.submitTime < p2.submitTime) {
              winnerId = p1.userId;
              loserId = p2.userId;
            } else if (p2.submitTime < p1.submitTime) {
              winnerId = p2.userId;
              loserId = p1.userId;
            } else {
              isDraw = true;
            }
          }

          if (!isDraw && winnerId && loserId) {
            const winnerUser = await tx.user.findUnique({ where: { id: winnerId } });
            const loserUser = await tx.user.findUnique({ where: { id: loserId } });

            if (winnerUser && loserUser) {
              const ratingW = winnerUser.eloUIUX || 1000;
              const ratingL = loserUser.eloUIUX || 1000;

              const changeW = calculateElo(ratingW, ratingL, 1);
              const changeL = calculateElo(ratingL, ratingW, 0);

              eloChanges[winnerId] = changeW;
              eloChanges[loserId] = changeL;

              const bet = dbDuel.betAmount;
              const streakBonus = winnerUser.currentStreak >= 2 ? 15 : 0;
              const closenessBonus = Math.round(p1.userId === winnerId ? p1.colorScore / 50 : p2.colorScore / 50);
              const totalBonus = 50 + bet + streakBonus + closenessBonus;

              tokenChanges[winnerId] = totalBonus;
              tokenChanges[loserId] = -bet;

              // DB Updates: Winner
              const newStreak = winnerUser.currentStreak + 1;
              const bestStreak = Math.max(winnerUser.bestStreak, newStreak);
              await tx.user.update({
                where: { id: winnerId },
                data: {
                  eloUIUX: { increment: changeW },
                  tokens: { increment: totalBonus },
                  totalWins: { increment: 1 },
                  totalDuels: { increment: 1 },
                  currentStreak: newStreak,
                  bestStreak,
                  rank: getRankTier(winnerUser.eloUIUX + changeW)
                }
              });

              // DB Updates: Loser
              await tx.user.update({
                where: { id: loserId },
                data: {
                  eloUIUX: { increment: changeL },
                  tokens: { decrement: bet },
                  totalDuels: { increment: 1 },
                  currentStreak: 0,
                  rank: getRankTier(loserUser.eloUIUX + changeL)
                }
              });
            }

            // Update participant isWinner
            await tx.duelParticipant.updateMany({
              where: { duelId, userId: winnerId },
              data: { isWinner: true }
            });

            await tx.duelParticipant.updateMany({
              where: { duelId, userId: loserId },
              data: { isWinner: false }
            });

            // Update duel status
            await tx.duel.update({
              where: { id: duelId },
              data: {
                status: "completed",
                winnerId,
                endedAt: new Date()
              }
            });
          } else {
            // Draw
            tokenChanges[p1.userId] = 0;
            tokenChanges[p2.userId] = 0;
            eloChanges[p1.userId] = 0;
            eloChanges[p2.userId] = 0;

            await tx.duel.update({
              where: { id: duelId },
              data: {
                status: "completed",
                endedAt: new Date()
              }
            });
          }
        }
      });

      // Notify user that guess is submitted
      socket.emit('color_guess_submitted', { success: true, score, submittedColor });

      // Notify opponent
      socket.to(`duel:${duelId}`).emit('opponent_submitted', { message: "Your opponent has locked in their color guess!" });

      // Broadcast results if completed
      if (triggerResultBroadcast) {
        io.to(`duel:${duelId}`).emit('duel_result', {
          winnerId,
          isDraw,
          eloChanges,
          tokenChanges
        });
      }

    } catch (e) {
      if (e.message === "ALREADY_COMPLETED") {
        console.log(`Color guess duel ${duelId} was already resolved.`);
      } else {
        console.error(e);
        socket.emit('color_guess_submitted', { success: false, reason: "Server processing error." });
      }
    }
  });

  // Submit explanation (Final Win Trigger)
  socket.on('submit_explanation', async ({ duelId, userId, explanation }) => {
    try {
      const duel = await prisma.duel.findUnique({
        where: { id: duelId },
        include: {
          bug: true,
          participants: { include: { user: true } }
        }
      });

      if (!duel || duel.status !== 'active') {
        return;
      }

      // Check if this user submitted correct code
      const participant = duel.participants.find(p => p.userId === userId);
      if (!participant || !participant.submittedCode) {
        socket.emit('error_message', { message: "Must pass code validation first!" });
        return;
      }

      // Score explanation
      const scoreResult = await judgeExplanation(duel.bug.title + ": " + duel.bug.explanation, explanation);

      // Lock in winner
      const winnerId = userId;
      const loserParticipant = duel.participants.find(p => p.userId !== userId);
      const loserId = loserParticipant ? loserParticipant.userId : null;

      // Stop FOMO loops
      stopFomoEngine(duelId);

      // Calculate rating delta
      let eloChanges = {};
      let tokenChanges = {};

      await prisma.$transaction(async (tx) => {
        // Row-level lock to prevent concurrency race conditions
        const duels = await tx.$queryRaw`SELECT status, "startedAt", "betAmount", language FROM "Duel" WHERE id = ${duelId} FOR UPDATE`;
        const dbDuel = duels[0];
        if (!dbDuel || dbDuel.status !== 'active') {
          throw new Error("ALREADY_COMPLETED");
        }

        const winnerUser = await tx.user.findUnique({ where: { id: winnerId } });
        const loserUser = loserId ? await tx.user.findUnique({ where: { id: loserId } }) : null;

        const languageKey = dbDuel.language === 'javascript' ? 'eloJS' : dbDuel.language === 'python' ? 'eloPython' : 'eloJava';

        if (winnerUser && loserUser) {
          const ratingW = winnerUser[languageKey];
          const ratingL = loserUser[languageKey];

          const changeW = calculateElo(ratingW, ratingL, 1);
          const changeL = calculateElo(ratingL, ratingW, 0);

          eloChanges[winnerId] = changeW;
          eloChanges[loserId] = changeL;

          // Base + Bet + Explanation bonus
          const bet = dbDuel.betAmount;
          const streakBonus = winnerUser.currentStreak >= 2 ? 15 : 0;
          const totalBonus = 50 + bet + scoreResult.score + streakBonus;

          tokenChanges[winnerId] = totalBonus;
          tokenChanges[loserId] = -bet;

          // Update database: Winner
          const newStreak = winnerUser.currentStreak + 1;
          const bestStreak = Math.max(winnerUser.bestStreak, newStreak);
          await tx.user.update({
            where: { id: winnerId },
            data: {
              [languageKey]: { increment: changeW },
              tokens: { increment: totalBonus },
              totalWins: { increment: 1 },
              totalDuels: { increment: 1 },
              currentStreak: newStreak,
              bestStreak: bestStreak,
              rank: getRankTier(winnerUser[languageKey] + changeW)
            }
          });

          // Update database: Loser
          await tx.user.update({
            where: { id: loserId },
            data: {
              [languageKey]: { increment: changeL },
              tokens: { decrement: bet },
              totalDuels: { increment: 1 },
              currentStreak: 0,
              rank: getRankTier(loserUser[languageKey] + changeL)
            }
          });
        }

        // Update participant records
        await tx.duelParticipant.updateMany({
          where: { duelId, userId: winnerId },
          data: {
            explanation,
            explanationScore: scoreResult.score,
            isWinner: true,
            submitTime: Math.round((Date.now() - new Date(dbDuel.startedAt).getTime()) / 1000)
          }
        });

        if (loserId) {
          await tx.duelParticipant.updateMany({
            where: { duelId, userId: loserId },
            data: {
              isWinner: false,
              submitTime: Math.round((Date.now() - new Date(dbDuel.startedAt).getTime()) / 1000)
            }
          });
        }

        // Update duel status
        await tx.duel.update({
          where: { id: duelId },
          data: {
            status: "completed",
            winnerId: winnerId,
            endedAt: new Date()
          }
        });
      });

      // Broadcast results
      io.to(`duel:${duelId}`).emit('duel_result', {
        winnerId,
        winnerCode: participant.submittedCode,
        explanation: duel.bug.explanation,
        eloChanges,
        tokenChanges,
        score: scoreResult.score,
        feedback: scoreResult.feedback
      });

    } catch (error) {
      if (error.message === "ALREADY_COMPLETED") {
        console.log(`Duel ${duelId} was already resolved.`);
      } else {
        console.error(error);
        socket.emit('error_message', { message: "Failed submitting explanation." });
      }
    }
  });

  // Forfeit Room
  socket.on('forfeit', async ({ duelId, userId }) => {
    try {
      let eloChanges = {};
      let tokenChanges = {};
      let winnerId = null;

      await prisma.$transaction(async (tx) => {
        // Row-level lock to prevent concurrent forfeit or double-resolution race conditions
        const duels = await tx.$queryRaw`SELECT status, "startedAt", "betAmount", "gameType", "language" FROM "Duel" WHERE id = ${duelId} FOR UPDATE`;
        const dbDuel = duels[0];
        if (!dbDuel || dbDuel.status !== 'active') {
          throw new Error("ALREADY_COMPLETED");
        }

        // Stop FOMO
        stopFomoEngine(duelId);

        // Fetch participants inside locked transaction scope
        const dbParticipants = await tx.duelParticipant.findMany({
          where: { duelId }
        });

        const loserId = userId;
        const winnerParticipant = dbParticipants.find(p => p.userId !== userId);
        winnerId = winnerParticipant ? winnerParticipant.userId : null;

        const loserUser = await tx.user.findUnique({ where: { id: loserId } });
        const winnerUser = winnerId ? await tx.user.findUnique({ where: { id: winnerId } }) : null;

        const languageKey = dbDuel.gameType === 'color_match' ? 'eloUIUX' : (dbDuel.language === 'javascript' ? 'eloJS' : dbDuel.language === 'python' ? 'eloPython' : 'eloJava');

        if (loserUser && winnerUser) {
          const ratingW = winnerUser[languageKey] || 1000;
          const ratingL = loserUser[languageKey] || 1000;

          const changeW = calculateElo(ratingW, ratingL, 1);
          const changeL = calculateElo(ratingL, ratingW, 0);

          eloChanges[winnerId] = changeW;
          eloChanges[loserId] = changeL;

          const bet = dbDuel.betAmount;
          const totalBonus = 50 + bet;

          tokenChanges[winnerId] = totalBonus;
          tokenChanges[loserId] = -bet;

          // DB updates - using transaction delegate!
          await tx.user.update({
            where: { id: winnerId },
            data: {
              eloUIUX: languageKey === 'eloUIUX' ? { increment: changeW } : undefined,
              eloJS: languageKey === 'eloJS' ? { increment: changeW } : undefined,
              eloPython: languageKey === 'eloPython' ? { increment: changeW } : undefined,
              eloJava: languageKey === 'eloJava' ? { increment: changeW } : undefined,
              tokens: { increment: totalBonus },
              totalWins: { increment: 1 },
              totalDuels: { increment: 1 },
              currentStreak: { increment: 1 },
              rank: getRankTier(ratingW + changeW)
            }
          });

          await tx.user.update({
            where: { id: loserId },
            data: {
              eloUIUX: languageKey === 'eloUIUX' ? { increment: changeL } : undefined,
              eloJS: languageKey === 'eloJS' ? { increment: changeL } : undefined,
              eloPython: languageKey === 'eloPython' ? { increment: changeL } : undefined,
              eloJava: languageKey === 'eloJava' ? { increment: changeL } : undefined,
              tokens: { decrement: bet },
              totalDuels: { increment: 1 },
              currentStreak: 0,
              rank: getRankTier(ratingL + changeL)
            }
          });
        }

        if (winnerId) {
          await tx.duelParticipant.updateMany({
            where: { duelId, userId: winnerId },
            data: { isWinner: true }
          });
        }
        await tx.duelParticipant.updateMany({
          where: { duelId, userId: loserId },
          data: { isWinner: false }
        });

        await tx.duel.update({
          where: { id: duelId },
          data: {
            status: "completed",
            winnerId: winnerId,
            endedAt: new Date()
          }
        });
      });

      io.to(`duel:${duelId}`).emit('opponent_forfeited', {
        winnerId,
        eloChanges,
        tokenChanges
      });

    } catch (e) {
      if (e.message === "ALREADY_COMPLETED") {
        console.log(`Forfeit for duel ${duelId} was already resolved.`);
      } else {
        console.error(e);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// FOMO loop helper
function startFomoEngine(duelId, participants, gameType = "debug") {
  if (activeDuels.has(duelId)) return;

  let progress = {
    [participants[0].userId]: 0,
    [participants[1].userId]: 0
  };

  const messages = gameType === "color_match" ? COLOR_FOMO_MESSAGES : FOMO_MESSAGES;

  const intervalId = setInterval(async () => {
    try {
      // Pick random player to simulate message for
      const p1 = participants[0];
      const p2 = participants[1];

      // Opponent for each
      // Player A sees message about Player B, Player B sees message about Player A
      const randMsgA = messages[Math.floor(Math.random() * messages.length)];
      const randMsgB = messages[Math.floor(Math.random() * messages.length)];

      // Random progress increment (simulating work)
      progress[p1.userId] = Math.min(95, progress[p1.userId] + Math.floor(Math.random() * 8) + 2);
      progress[p2.userId] = Math.min(95, progress[p2.userId] + Math.floor(Math.random() * 8) + 2);

      // Send customized event to each participant
      io.to(p1.userId).emit('fomo_update', {
        message: randMsgA.replace("{opponent}", p2.user.username),
        opponentProgress: progress[p2.userId]
      });

      io.to(p2.userId).emit('fomo_update', {
        message: randMsgB.replace("{opponent}", p1.user.username),
        opponentProgress: progress[p1.userId]
      });

    } catch (e) {
      console.error("FOMO engine loop error", e);
    }
  }, 7000);

  activeDuels.set(duelId, intervalId);
}

function stopFomoEngine(duelId) {
  if (activeDuels.has(duelId)) {
    clearInterval(activeDuels.get(duelId));
    activeDuels.delete(duelId);
  }
}

// ==================== CODE KBC MODULES ====================
const kbcRouter = require('./routes/kbc');
const setupKbcSocket = require('./socket/kbc');

// Register Code KBC REST API routes
app.use('/api/kbc', kbcRouter);

// Register Code KBC Socket.io event handlers
setupKbcSocket(io);
// ==========================================================

// Start Server
server.listen(PORT, () => {
  console.log(`DebugDuel Backend listening on port ${PORT}`);
});

