// Triggering nodemon restart
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const { GoogleGenAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const path = require('path');

// Clean up empty environment variables so dotenv can load them from another file or they can be overridden
for (const key of ['OPENAI_API_KEY', 'GEMINI_API_KEY', 'CLERK_SECRET_KEY', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY']) {
  if (process.env[key] !== undefined && process.env[key].trim() === '') {
    delete process.env[key];
  }
}

dotenv.config({ path: path.join(__dirname, '.env') });

// Clean up again after loading backend/.env if they are empty, so they can be loaded from frontend/.env.local
for (const key of ['OPENAI_API_KEY', 'GEMINI_API_KEY', 'CLERK_SECRET_KEY', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY']) {
  if (process.env[key] !== undefined && process.env[key].trim() === '') {
    delete process.env[key];
  }
}

// Load frontend/.env.local
dotenv.config({ path: path.join(__dirname, '../frontend/.env.local') });

// Clean up again to make sure everything is trimmed and clean
for (const key of ['OPENAI_API_KEY', 'GEMINI_API_KEY', 'CLERK_SECRET_KEY', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY']) {
  if (process.env[key]) {
    process.env[key] = process.env[key].trim();
  }
}

console.log("================== ENVIRONMENT STATUS ==================");
console.log("OPENAI_API_KEY length:", process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);
console.log("GEMINI_API_KEY length:", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0);
console.log("========================================================");

const prisma = new PrismaClient();
const { awardXP } = require('./utils/xp');
const { seedAchievements, checkAchievements } = require('./services/achievements');
const { seedQuests, ensureActiveQuests, updateQuestProgress } = require('./services/quests');
const { resolveRankedMatch } = require('./services/rank');
const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: '*', // For local development accessibility
  methods: ['GET', 'POST']
}));
app.use(express.json());

// ==================== SECURITY SANITIZATION MIDDLEWARE ====================
function sanitizeObject(obj) {
  if (!obj) return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  if (typeof obj === 'object') {
    if (obj.constructor && obj.constructor.name !== 'Object' && obj.constructor.name !== 'Array') {
      return obj;
    }
    const clean = { ...obj };
    if ('passwordHash' in clean) {
      delete clean.passwordHash;
    }
    for (const key in clean) {
      if (clean[key] && typeof clean[key] === 'object') {
        clean[key] = sanitizeObject(clean[key]);
      }
    }
    return clean;
  }
  return obj;
}

app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function(data) {
    return originalJson.call(this, sanitizeObject(data));
  };
  next();
});

// ==================== CRYPTO HELPERS ====================
const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPasswordHash) {
  if (!storedPasswordHash) return false;
  try {
    const [salt, originalHash] = storedPasswordHash.split(':');
    if (!salt || !originalHash) return false;
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === originalHash;
  } catch (err) {
    return false;
  }
}

// ==================== CUSTOM AUTH ENDPOINTS ====================

// Check Username Availability
app.post('/api/auth/check-username', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }
  const cleanUsername = username.toLowerCase().trim();
  if (cleanUsername.length < 3) {
    return res.json({ available: false, reason: "Username must be at least 3 characters" });
  }
  try {
    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername }
    });
    return res.json({ available: !existing });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Database error checking username" });
  }
});

// Custom Registration
app.post('/api/auth/register', async (req, res) => {
  const { fullName, username, email, password } = req.body;
  
  if (!fullName || !username || !email || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const cleanUsername = username.toLowerCase().trim();
  const cleanEmail = email.toLowerCase().trim();

  // Password validation: 8+ chars, 1 uppercase, 1 special char, 1 number
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters long" });
  }
  if (!/[A-Z]/.test(password)) {
    return res.status(400).json({ error: "Password must contain at least one uppercase letter" });
  }
  if (!/[0-9]/.test(password)) {
    return res.status(400).json({ error: "Password must contain at least one number" });
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return res.status(400).json({ error: "Password must contain at least one special character" });
  }

  try {
    // Check username
    const existingUser = await prisma.user.findUnique({
      where: { username: cleanUsername }
    });
    if (existingUser) {
      return res.status(400).json({ error: "Username is already taken" });
    }

    // Check email
    const existingEmail = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });
    if (existingEmail) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    const passwordHash = hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username: cleanUsername,
        fullName: fullName.trim(),
        email: cleanEmail,
        passwordHash,
        clerkId: `local-${cleanUsername}`,
        tokens: 500,
        eloJS: 1000,
        eloPython: 1000,
        eloJava: 1000,
        eloUIUX: 1000,
        rank: "Bug Hunter",
        friendKey: generateFriendKey()
      }
    });

    return res.json(user);
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Failed to register user" });
  }
});

// Custom Login
app.post('/api/auth/login', async (req, res) => {
  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  const identity = usernameOrEmail.toLowerCase().trim();

  try {
    // Find user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identity },
          { email: identity }
        ]
      }
    });

    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid username/email or password" });
    }

    return res.json(user);
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed" });
  }
});

// Session user details
app.get('/api/auth/me/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id }
    });
    if (!user) {
      return res.status(404).json({ error: "Session expired" });
    }
    return res.json(user);
  } catch (error) {
    console.error("Session load error:", error);
    return res.status(500).json({ error: "Failed to fetch session" });
  }
});

// Google Auth Login / Register
app.post('/api/auth/google', async (req, res) => {
  const { email, fullName, googleId, accessToken, isSandbox, username } = req.body;

  if (!email && isSandbox) {
    return res.status(400).json({ error: "Email is required in sandbox mode" });
  }

  let verifiedEmail = email ? email.toLowerCase().trim() : null;
  let verifiedName = fullName || "Google User";
  let verifiedGoogleId = googleId || "";

  if (!isSandbox && accessToken) {
    try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`);
      if (response.ok) {
        const payload = await response.json();
        verifiedEmail = payload.email.toLowerCase().trim();
        verifiedName = payload.name || verifiedName;
        verifiedGoogleId = payload.sub || verifiedGoogleId;
      } else {
        return res.status(400).json({ error: "Failed to verify Google access token" });
      }
    } catch (err) {
      console.error("Google userinfo fetch failed:", err);
      return res.status(500).json({ error: "Google Auth verification error" });
    }
  }

  if (!verifiedEmail) {
    return res.status(400).json({ error: "Could not retrieve email from Google" });
  }

  // Ensure verifiedGoogleId is not empty (especially in sandbox)
  if (!verifiedGoogleId) {
    verifiedGoogleId = "sandbox-" + verifiedEmail.split('@')[0];
  }

  try {
    // 1. Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: verifiedEmail }
    });

    if (user) {
      // If user exists, log them in. Ensure clerkId/googleId is linked
      if (!user.clerkId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { clerkId: `google-${verifiedGoogleId}` }
        });
      }
      return res.json(user);
    }

    // 2. Register flow - requires a username selection
    if (!username) {
      return res.json({
        registrationRequired: true,
        email: verifiedEmail,
        fullName: verifiedName,
        googleId: verifiedGoogleId
      });
    }

    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters" });
    }

    // Check username uniqueness
    const existingUsername = await prisma.user.findUnique({
      where: { username: cleanUsername }
    });
    if (existingUsername) {
      return res.status(400).json({ error: "Username is already taken" });
    }

    user = await prisma.user.create({
      data: {
        username: cleanUsername,
        fullName: verifiedName.trim(),
        email: verifiedEmail,
        clerkId: `google-${verifiedGoogleId}`,
        tokens: 500,
        eloJS: 1000,
        eloPython: 1000,
        eloJava: 1000,
        eloUIUX: 1000,
        rank: "Bug Hunter",
        friendKey: generateFriendKey()
      }
    });

    return res.json(user);
  } catch (error) {
    console.error("Google Auth register/login error:", error);
    return res.status(500).json({ error: "Failed to authenticate with Google" });
  }
});

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
app.set('io', io);

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

// Clean JSON response from LLM
function safeParseJson(text) {
  if (!text) return null;
  let cleanText = text.trim();
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '').trim();
  }
  cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();
  
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    const match = cleanText.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (innerErr) {
        console.error("Failed to parse extracted JSON:", match[0], innerErr);
      }
    }
    throw e;
  }
}

// Normalized Code Comp (Fallback Mode)
function cleanCode(code) {
  if (!code) return '';
  return code
    .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '') // strip comments
    .replace(/\s+/g, ' ')                                 // collapse spacing
    .trim();
}

function superCleanCode(code) {
  if (!code) return '';
  return code
    .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '') // strip comments
    .replace(/[`'"]/g, '"')                              // normalize quotes
    .replace(/;/g, '')                                   // remove semicolons
    .replace(/\s+/g, '')                                 // remove all whitespace/newlines
    .trim();
}

function verifyCodeFallback(broken, fixed, submitted) {
  const cleanSubmitted = cleanCode(submitted);
  const cleanFixed = cleanCode(fixed);

  if (cleanSubmitted === cleanFixed) {
    return { passed: true, reason: "Submitted code matches the solution (normalized spacing)." };
  }

  const superCleanSubmitted = superCleanCode(submitted);
  const superCleanFixed = superCleanCode(fixed);

  if (superCleanSubmitted === superCleanFixed) {
    return { passed: true, reason: "Submitted code matches the solution (flexible spacing/semicolons)." };
  }

  return { passed: false, reason: "Your fix does not produce the expected behavior." };
}

// AI Judging Services (Gemini / OpenAI / Fallback)
async function judgeCode(language, brokenCode, fixedCode, submittedCode) {
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const hasGemini = geminiKey && geminiKey.trim().length > 10;
  const hasOpenAi = openAiKey && openAiKey.trim().length > 10;

  const systemPrompt = `You are an intelligent, lenient programming code judge.
Your single goal is to determine if the bug in the broken code has been successfully resolved/patched in the submitted fix.
You will be given the broken code, the expected fixed code (as a reference), and the user's submitted fix.
Accept ANY logical implementation, styling, or coding approach that correctly fixes the bug and produces the expected correct output, even if the approach, logic structure, variable names, or syntax is completely different from the expected fixed code.
Do NOT enforce matching the expected fix approach or structure. If the code successfully solves the bug and works correctly, you MUST mark it as passed = true.
Return a valid JSON object matching this schema:
{
  "passed": true/false,
  "reason": "Brief explanation of why it passed or failed"
}`;

  const userPrompt = `Language: ${language}
Broken code:
${brokenCode}

Expected fixed code:
${fixedCode}

Submitted fix:
${submittedCode}`;

  // 1. Try Gemini
  if (hasGemini) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: { responseMimeType: "application/json" }
      });
      const text = response.response.text();
      return safeParseJson(text);
    } catch (err) {
      console.error("Gemini AI Judge failed, falling back...", err);
    }
  }

  // 2. Try OpenAI
  if (hasOpenAi) {
    try {
      const openai = new OpenAI({ apiKey: openAiKey });
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 150,
        response_format: { type: "json_object" }
      });
      return safeParseJson(response.choices[0].message.content);
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

  const hasGemini = geminiKey && geminiKey.trim().length > 10;
  const hasOpenAi = openAiKey && openAiKey.trim().length > 10;

  const systemPrompt = `You are an expert tech lead scoring a developer's explanation of a bug fix.
Score the explanation from 0 to 20 based on clarity and accuracy:
- 20 = perfectly explains root cause + why it breaks + how the fix works.
- 15-19 = good description but missing minor details.
- 5-14 = vague or incomplete description.
- 0 = completely wrong, irrelevant, or missing.
You must return a valid JSON object only. Do not wrap in markdown code blocks. Format:
{ "score": number, "feedback": "one-sentence technical feedback" }`;

  const userPrompt = `Bug details: ${bugDescription}
Player explanation: ${playerExplanation}`;

  if (hasGemini) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: { responseMimeType: "application/json" }
      });
      const text = response.response.text();
      return safeParseJson(text);
    } catch (err) {
      console.error("Gemini Explanation Judge failed...", err);
    }
  }

  if (hasOpenAi) {
    try {
      const openai = new OpenAI({ apiKey: openAiKey });
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 150,
        response_format: { type: "json_object" }
      });
      return safeParseJson(response.choices[0].message.content);
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

const CHALLENGE_SCENARIOS = [
  "shopping cart checkout calculation",
  "user session authentication token validation",
  "filtering and sorting an array of objects",
  "parsing query parameters from a URL",
  "validating an email or phone number format",
  "formatting dates and timestamps",
  "retrying a failed API request with backoff",
  "calculating discount pricing based on tiers",
  "reversing words in a sentence",
  "finding the maximum or minimum value in a nested list",
  "checking if a string is a palindrome",
  "merging two sorted lists or arrays",
  "throttling or debouncing user input",
  "finding duplicates in an array",
  "calculating Fibonacci sequence or factorial",
  "handling pagination offset and limits",
  "parsing a JSON string safely with error handling",
  "checking for balanced parentheses in an expression",
  "converting temperatures between Celsius and Fahrenheit",
  "counting word frequencies in a text block",
  "finding the longest word in a list",
  "generating a random alphanumeric password",
  "calculating distance between two points",
  "verifying if a number is prime",
  "removing null or undefined properties from an object",
  "formatting currency values",
  "performing binary search on a sorted list",
  "flattening a multi-dimensional array",
  "capitalizing the first letter of each word",
  "implementing a simple queue or stack",
  "checking for anagrams of two strings",
  "validating password strength requirements",
  "calculating standard deviation of numbers",
  "finding the intersection of two arrays",
  "converting RGB values to Hex",
  "masking credit card numbers for display",
  "checking if a year is a leap year",
  "calculating age based on birthdate",
  "matching tags in a simple HTML string",
  "verifying a checksum or CRC value",
  "calculating compound interest",
  "generating initials from a full name",
  "grouping elements of an array by a key",
  "finding the difference between two dates in days"
];

async function generateUniqueBug(language, difficulty) {
  const openAiKey = process.env.OPENAI_API_KEY;
  const hasOpenAi = openAiKey && openAiKey.trim().length > 10;

  if (!hasOpenAi) {
    throw new Error("No OpenAI key available for bug generation");
  }

  const systemPrompt = `You are an expert programming challenge generator.
Create a unique, realistic programming bug challenge.
The language is ${language} and difficulty is ${difficulty}.

You must return a valid JSON object matching this schema:
{
  "title": "Short title of the bug",
  "brokenCode": "function add(a, b) {\\n  // broken\\n  return a - b;\\n}",
  "fixedCode": "function add(a, b) {\\n  // fixed\\n  return a + b;\\n}",
  "explanation": "Brief explanation of the bug and the fix",
  "category": "one of: logic, syntax, runtime, off-by-one, null-ref, async"
}

CRITICAL FORMATTING RULES:
1. The "brokenCode" and "fixedCode" MUST be properly indented multi-line code strings formatted with escaped newlines (\\n). Do NOT return code as a single flat line. It must look readable and well-structured, exactly like the example.
2. Ensure the code is clean, valid ${language}, and contains a single logical, syntax, or runtime error suited for ${difficulty} level.
3. Keep the code extremely short (under 15 lines) to minimize tokens. Do not wrap in markdown code blocks.`;

  const scenario = CHALLENGE_SCENARIOS[Math.floor(Math.random() * CHALLENGE_SCENARIOS.length)];
  const userPrompt = `Generate a unique, creative, and realistic ${difficulty} difficulty programming bug challenge in ${language}. 
The scenario/context for the code should be: "${scenario}".
Make sure the bug is interesting, and the broken code is syntactically or logically incorrect but looks plausible. 
Add a random seed: ${Math.random().toString(36).substring(7)} to guarantee uniqueness.`;

  const openai = new OpenAI({ apiKey: openAiKey });
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.85,
    max_tokens: 600,
    response_format: { type: "json_object" }
  });

  const generated = safeParseJson(response.choices[0].message.content);
  if (!generated || !generated.brokenCode || !generated.fixedCode) {
    throw new Error("Invalid bug structure returned from LLM");
  }
  
  // Save to database
  const newBug = await prisma.bug.create({
    data: {
      language,
      difficulty,
      title: generated.title || "Unique Challenge",
      brokenCode: generated.brokenCode,
      fixedCode: generated.fixedCode,
      explanation: generated.explanation || "No explanation provided.",
      category: generated.category || "logic"
    }
  });

  return newBug;
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

    const io = req.app.get('io');
    await checkAchievements(userId, null, io);
    await checkAchievements(friend.id, null, io);
    updateQuestProgress(userId, "add_friend", 1, null, io).catch(console.error);
    updateQuestProgress(friend.id, "add_friend", 1, null, io).catch(console.error);

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

      await awardXP(userId, 5, tx);

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          tokens: { increment: totalReward },
          dailyStreak: newStreak,
          lastDailyClaim: now
        }
      });

      // Fetch final user record to ensure accurate return values
      const finalUser = await tx.user.findUnique({
        where: { id: userId }
      });

      return {
        tokens: finalUser.tokens,
        streak: newStreak,
        added: totalReward,
        xp: finalUser.xp,
        level: finalUser.level
      };
    });

    const io = req.app.get('io');
    checkAchievements(userId, null, io).catch(console.error);
    updateQuestProgress(userId, "claim_daily_reward", 1, null, io).catch(console.error);
    updateQuestProgress(userId, "earn_tokens", result.added, null, io).catch(console.error);

    res.json({ success: true, tokens: result.tokens, streak: result.streak, added: result.added, xp: result.xp, level: result.level });
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

// Get active daily and weekly quests for a user
app.get('/api/quests', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const activeQuests = await ensureActiveQuests(userId);
    res.json(activeQuests);
  } catch (error) {
    console.error("Error fetching quests:", error);
    res.status(500).json({ error: "Failed to fetch quests" });
  }
});

// Claim quest reward
app.post('/api/quests/claim/:id', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const userQuest = await tx.userQuest.findUnique({
        where: { id },
        include: { quest: true }
      });

      if (!userQuest) throw new Error("QUEST_NOT_FOUND");
      if (userQuest.userId !== userId) throw new Error("UNAUTHORIZED");
      if (!userQuest.completed) throw new Error("NOT_COMPLETED");
      if (userQuest.claimed) throw new Error("ALREADY_CLAIMED");

      // Mark claimed
      const updatedUserQuest = await tx.userQuest.update({
        where: { id },
        data: { claimed: true }
      });

      // Award XP
      await awardXP(userId, userQuest.quest.rewardXP, tx);

      // Award Tokens
      await tx.user.update({
        where: { id: userId },
        data: {
          tokens: { increment: userQuest.quest.rewardTokens }
        }
      });

      // Fetch final user record to get updated tokens
      const finalUser = await tx.user.findUnique({
        where: { id: userId }
      });

      return {
        userQuest: updatedUserQuest,
        xp: finalUser.xp,
        level: finalUser.level,
        tokens: finalUser.tokens,
        rewardTokens: userQuest.quest.rewardTokens
      };
    });

    const io = req.app.get('io');
    // Audit achievements after claiming quest reward
    checkAchievements(userId, null, io).catch(console.error);
    updateQuestProgress(userId, "earn_tokens", result.rewardTokens, null, io).catch(console.error);

    res.json({
      success: true,
      userQuest: result.userQuest,
      xp: result.xp,
      level: result.level,
      tokens: result.tokens
    });
  } catch (error) {
    if (error.message === "QUEST_NOT_FOUND") {
      res.status(404).json({ error: "Quest assignment not found" });
    } else if (error.message === "UNAUTHORIZED") {
      res.status(403).json({ error: "Unauthorized to claim this quest" });
    } else if (error.message === "NOT_COMPLETED") {
      res.status(400).json({ error: "Quest is not completed yet" });
    } else if (error.message === "ALREADY_CLAIMED") {
      res.status(400).json({ error: "Quest reward already claimed" });
    } else {
      console.error("Error claiming quest reward:", error);
      res.status(500).json({ error: "Failed to claim quest reward" });
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
        },
        achievements: {
          include: {
            achievement: true
          }
        }
      }
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const dailyQuestsCompleted = await prisma.userQuest.count({
      where: {
        userId: user.id,
        completed: true,
        quest: { category: "DAILY" }
      }
    });

    const weeklyQuestsCompleted = await prisma.userQuest.count({
      where: {
        userId: user.id,
        completed: true,
        quest: { category: "WEEKLY" }
      }
    });

    const lifetimeQuestsCompleted = await prisma.userQuest.count({
      where: {
        userId: user.id,
        completed: true
      }
    });

    // Calculate KBC statistics
    const kbcRuns = await prisma.kbcSoloRun.findMany({
      where: { userId: user.id }
    });

    let kbcStats = {
      totalRuns: kbcRuns.length,
      questionsAnswered: 0,
      averageAccuracy: 0,
      fastestAnswer: 0,
      averageTime: 0,
      maxPrize: 0,
      bestRun: 0
    };

    if (kbcRuns.length > 0) {
      let totalQuestionsAnswered = 0;
      let totalAccuracy = 0;
      let fastestTime = Infinity;
      let totalAvgTime = 0;
      let maxPrize = 0;
      let bestRun = 0;

      kbcRuns.forEach(run => {
        totalQuestionsAnswered += run.questionsAnswered;
        totalAccuracy += run.accuracy;
        if (run.fastestAnswerTime > 0 && run.fastestAnswerTime < fastestTime) {
          fastestTime = run.fastestAnswerTime;
        }
        totalAvgTime += run.averageAnswerTime;
        if (run.prizeEarned > maxPrize) {
          maxPrize = run.prizeEarned;
        }
        if (run.questionsAnswered > bestRun) {
          bestRun = run.questionsAnswered;
        }
      });

      kbcStats.questionsAnswered = totalQuestionsAnswered;
      kbcStats.averageAccuracy = Math.round((totalAccuracy / kbcRuns.length) * 10) / 10;
      kbcStats.fastestAnswer = fastestTime === Infinity ? 0 : fastestTime;
      kbcStats.averageTime = Math.round((totalAvgTime / kbcRuns.length) * 10) / 10;
      kbcStats.maxPrize = maxPrize;
      kbcStats.bestRun = bestRun;
    }

    // Most Played Game calculation
    const debugDuelsCount = await prisma.duelParticipant.count({
      where: { userId: user.id, duel: { gameType: 'debug' } }
    });
    const colorMatchCount = await prisma.duelParticipant.count({
      where: { userId: user.id, duel: { gameType: 'color_match' } }
    });
    const changeDesignCount = await prisma.duelParticipant.count({
      where: { userId: user.id, duel: { gameType: 'change_design' } }
    });
    const kbcCount = kbcRuns.length;

    let mostPlayedGame = "None";
    const maxCount = Math.max(debugDuelsCount, colorMatchCount, changeDesignCount, kbcCount);
    if (maxCount > 0) {
      if (maxCount === debugDuelsCount) mostPlayedGame = "Debug Duel";
      else if (maxCount === colorMatchCount) mostPlayedGame = "Color Match";
      else if (maxCount === changeDesignCount) mostPlayedGame = "Change That Design";
      else mostPlayedGame = "Code KBC";
    }

    const winRate = user.totalDuels > 0 ? Math.round((user.totalWins / user.totalDuels) * 100) : 0;
    const analytics = {
      winRate,
      kbcAccuracy: kbcStats.averageAccuracy,
      averageAnswerSpeed: kbcStats.averageTime,
      bestStreak: user.bestStreak,
      mostPlayedGame,
      totalXpEarned: user.xp
    };

    // Activity Heatmap calculation
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    oneYearAgo.setHours(0, 0, 0, 0);

    const [duels, dailyRuns, questRuns, achievementRuns] = await Promise.all([
      prisma.duelParticipant.findMany({
        where: {
          userId: user.id,
          duel: {
            endedAt: { gte: oneYearAgo }
          }
        },
        include: { duel: { select: { endedAt: true } } }
      }),
      prisma.dailyChallengeRun.findMany({
        where: { userId: user.id, createdAt: { gte: oneYearAgo } },
        select: { createdAt: true }
      }),
      prisma.userQuest.findMany({
        where: { userId: user.id, completed: true, completedAt: { not: null, gte: oneYearAgo } },
        select: { completedAt: true }
      }),
      prisma.userAchievement.findMany({
        where: { userId: user.id, unlockedAt: { gte: oneYearAgo } },
        select: { unlockedAt: true }
      })
    ]);

    const activityCounts = {};

    const addDate = (dateObj) => {
      if (!dateObj) return;
      const dateStr = new Date(dateObj).toISOString().split('T')[0];
      activityCounts[dateStr] = (activityCounts[dateStr] || 0) + 1;
    };

    duels.forEach(d => addDate(d.duel?.endedAt));
    kbcRuns.forEach(r => addDate(r.createdAt));
    dailyRuns.forEach(r => addDate(r.createdAt));
    questRuns.forEach(q => addDate(q.completedAt));
    achievementRuns.forEach(a => addDate(a.unlockedAt));

    const activity = Object.entries(activityCounts).map(([date, count]) => ({
      date,
      count
    }));

    res.json({
      ...user,
      dailyQuestsCompleted,
      weeklyQuestsCompleted,
      lifetimeQuestsCompleted,
      kbcStats,
      analytics,
      activity
    });
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
      // Dynamically generate a unique bug using OpenAI gpt-4o-mini!
      try {
        const uniqueBug = await generateUniqueBug(language, difficulty);
        newDuelData.bugId = uniqueBug.id;
        newDuelData.language = language;
        newDuelData.difficulty = difficulty;
      } catch (err) {
        console.error("Failed to generate unique bug with LLM, falling back to random seed bug.", err);
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

const offlineTimeouts = new Map(); // userId -> NodeJS.Timeout

function handleUserOffline(userId) {
  // Clear any existing offline timeout for this user
  if (offlineTimeouts.has(userId)) {
    clearTimeout(offlineTimeouts.get(userId));
  }

  // 1. Notify room that player is offline
  prisma.duelParticipant.findFirst({
    where: {
      userId: userId,
      duel: { status: 'active' }
    }
  }).then(participant => {
    if (participant) {
      const duelId = participant.duelId;
      io.to(`duel:${duelId}`).emit('opponent_offline', { userId, offline: true });

      // 2. Schedule match auto-win if player remains offline for 20 seconds
      const timeoutId = setTimeout(async () => {
        try {
          if (!onlineUsers.has(userId)) {
            console.log(`User ${userId} remained offline. Auto-resolving duel ${duelId} as forfeit...`);
            await resolveForfeit(duelId, userId);
          }
        } catch (e) {
          console.error(`Error in offline auto-win timeout for user ${userId}:`, e);
        } finally {
          offlineTimeouts.delete(userId);
        }
      }, 20000);

      offlineTimeouts.set(userId, timeoutId);
    }
  }).catch(err => {
    console.error(`Error handling user offline check for ${userId}:`, err);
  });
}

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Register user online
  socket.on('register_user', ({ userId }) => {
    if (!userId) return;
    
    // Clear any pending offline timeout
    if (offlineTimeouts.has(userId)) {
      clearTimeout(offlineTimeouts.get(userId));
      offlineTimeouts.delete(userId);
    }

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);
    socket.join(`user:${userId}`);
    console.log(`Socket registered user ${userId}. Total online: ${onlineUsers.size}`);

    // Notify active duels that player is back online
    prisma.duelParticipant.findFirst({
      where: {
        userId: userId,
        duel: { status: 'active' }
      }
    }).then(participant => {
      if (participant) {
        io.to(`duel:${participant.duelId}`).emit('opponent_offline', { userId, offline: false });
      }
    }).catch(err => console.error(err));
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    for (const [userId, socketIds] of onlineUsers.entries()) {
      if (socketIds.has(socket.id)) {
        socketIds.delete(socket.id);
        if (socketIds.size === 0) {
          onlineUsers.delete(userId);
          // Trigger player offline check and autowin for active duels
          handleUserOffline(userId);
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
      if (userId) {
        if (!onlineUsers.has(userId)) {
          onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);
        
        // Clear any pending offline timeouts
        if (offlineTimeouts.has(userId)) {
          clearTimeout(offlineTimeouts.get(userId));
          offlineTimeouts.delete(userId);
        }

        // Notify active duels that player is back online
        prisma.duelParticipant.findFirst({
          where: {
            userId: userId,
            duel: { status: 'active' }
          }
        }).then(participant => {
          if (participant) {
            io.to(`duel:${participant.duelId}`).emit('opponent_offline', { userId, offline: false });
          }
        }).catch(err => console.error(err));
      }

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
        io.to(`duel:${duelId}`).emit('countdown_started', { duration: 12 });

        setTimeout(async () => {
          try {
            // Double check if duel still exists and is waiting
            const latestDuel = await prisma.duel.findUnique({
              where: { id: duelId },
              include: { participants: true }
            });
            if (!latestDuel || latestDuel.status !== 'waiting') return;

            // Verify both players are still online
            const allOnline = latestDuel.participants.every(p => onlineUsers.has(p.userId));
            if (!allOnline) {
              console.log(`Lobby countdown cancelled for duel ${duelId} because a player went offline.`);
              
              // Remove the offline participant
              const offlineParticipants = latestDuel.participants.filter(p => !onlineUsers.has(p.userId));
              for (const offP of offlineParticipants) {
                await prisma.duelParticipant.deleteMany({
                  where: { duelId, userId: offP.userId }
                });
              }

              // Fetch updated participants and notify room
              const updated = await prisma.duel.findUnique({
                where: { id: duelId },
                include: { participants: { include: { user: true } } }
              });

              io.to(`duel:${duelId}`).emit('lobby_update', {
                participants: updated ? updated.participants : [],
                status: 'waiting'
              });
              return;
            }

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
            startFomoEngine(duelId, latestDuel.participants, updatedDuel.gameType);
          } catch (err) {
            console.error("Error starting duel after lobby countdown:", err);
          }
        }, 12000);
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
      let rpChanges = {};
      let newRanks = {};
      let winnerId = null;
      let loserId = null;
      let isDraw = false;
      let triggerResultBroadcast = false;

      await prisma.$transaction(async (tx) => {
        // Row-level lock to prevent concurrency race conditions
        const duels = await tx.$queryRaw`SELECT status, "startedAt", "betAmount", "targetColor", "isRanked", "seasonId" FROM "Duel" WHERE id = ${duelId} FOR UPDATE`;
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

          if (dbDuel.isRanked) {
            // Resolve Ranked Match
            const rankedRes = await resolveRankedMatch(dbDuel.seasonId, p1.userId, p2.userId, isDraw ? null : winnerId, isDraw, tx);
            eloChanges = rankedRes.eloChanges;
            rpChanges = rankedRes.rpChanges;
            newRanks = rankedRes.newRanks;

            tokenChanges[p1.userId] = 0;
            tokenChanges[p2.userId] = 0;

            if (!isDraw && winnerId && loserId) {
              await tx.duelParticipant.updateMany({
                where: { duelId, userId: winnerId },
                data: { isWinner: true }
              });
              await tx.duelParticipant.updateMany({
                where: { duelId, userId: loserId },
                data: { isWinner: false }
              });
            }

            await tx.duel.update({
              where: { id: duelId },
              data: {
                status: "completed",
                winnerId: isDraw ? null : winnerId,
                endedAt: new Date()
              }
            });
          } else {
            // Standard Match Resolution
            if (!isDraw && winnerId && loserId) {
              const [winnerUser, loserUser] = await Promise.all([
                tx.user.findUnique({ where: { id: winnerId } }),
                tx.user.findUnique({ where: { id: loserId } })
              ]);

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

                const wXp = (winnerUser.xp || 0) + 50;
                const wLevel = Math.floor(Math.sqrt(wXp / 100)) + 1;

                const lXp = (loserUser.xp || 0) + 15;
                const lLevel = Math.floor(Math.sqrt(lXp / 100)) + 1;

                const newStreak = winnerUser.currentStreak + 1;
                const bestStreak = Math.max(winnerUser.bestStreak, newStreak);

                await Promise.all([
                  tx.user.update({
                    where: { id: winnerId },
                    data: {
                      eloUIUX: { increment: changeW },
                      tokens: { increment: totalBonus },
                      totalWins: { increment: 1 },
                      totalDuels: { increment: 1 },
                      currentStreak: newStreak,
                      bestStreak,
                      xp: wXp,
                      level: wLevel,
                      rank: getRankTier(winnerUser.eloUIUX + changeW)
                    }
                  }),
                  tx.user.update({
                    where: { id: loserId },
                    data: {
                      eloUIUX: { increment: changeL },
                      tokens: { decrement: bet },
                      totalDuels: { increment: 1 },
                      currentStreak: 0,
                      xp: lXp,
                      level: lLevel,
                      rank: getRankTier(loserUser.eloUIUX + changeL)
                    }
                  })
                ]);
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
        }
      }, { timeout: 15000 });

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
          tokenChanges,
          isRanked: duel.isRanked,
          rpChanges,
          newRanks
        });

        // Audit achievements and quests outside transaction scope
        if (winnerId && loserId && !isDraw) {
          checkAchievements(winnerId, null, io).catch(console.error);
          updateQuestProgress(winnerId, "play_duel", 1, null, io).catch(console.error);
          updateQuestProgress(winnerId, "win_duel", 1, null, io).catch(console.error);
          if (!duel.isRanked) {
            updateQuestProgress(winnerId, "gain_xp", 50, null, io).catch(console.error);
            if (tokenChanges[winnerId]) {
              updateQuestProgress(winnerId, "earn_tokens", tokenChanges[winnerId], null, io).catch(console.error);
            }
          }

          checkAchievements(loserId, null, io).catch(console.error);
          updateQuestProgress(loserId, "play_duel", 1, null, io).catch(console.error);
          if (!duel.isRanked) {
            updateQuestProgress(loserId, "gain_xp", 15, null, io).catch(console.error);
          }
        } else {
          const p1 = duel.participants[0];
          const p2 = duel.participants[1];
          if (p1) updateQuestProgress(p1.userId, "play_duel", 1, null, io).catch(console.error);
          if (p2) updateQuestProgress(p2.userId, "play_duel", 1, null, io).catch(console.error);
        }
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

  // Submit Change That Design layout
  socket.on('submit_design', async ({ duelId, userId, submittedDesign }) => {
    try {
      const duel = await prisma.duel.findUnique({
        where: { id: duelId },
        include: {
          participants: { include: { user: true } }
        }
      });

      if (!duel || duel.status !== 'active') {
        socket.emit('design_submitted', { success: false, reason: "Duel is not active." });
        return;
      }

      const { designChallenges } = require('./services/designChallenges');
      const challenge = designChallenges.find(c => c.id === duel.designChallengeId);
      if (!challenge) {
        socket.emit('design_submitted', { success: false, reason: "Design challenge template not found." });
        return;
      }

      // Grade the design
      const { gradeDesign } = require('./services/designJudge');
      const submittedDesignJsonStr = typeof submittedDesign === 'string' ? submittedDesign : JSON.stringify(submittedDesign);
      const gradeResult = await gradeDesign(challenge, submittedDesignJsonStr);
      const score = gradeResult.score;

      const submitTime = Math.round((Date.now() - new Date(duel.startedAt).getTime()) / 1000);

      let eloChanges = {};
      let tokenChanges = {};
      let rpChanges = {};
      let newRanks = {};
      let winnerId = null;
      let loserId = null;
      let isDraw = false;
      let triggerResultBroadcast = false;

      await prisma.$transaction(async (tx) => {
        // Row-level lock to prevent concurrency race conditions
        const duels = await tx.$queryRaw`SELECT status, "startedAt", "betAmount", "designChallengeId", "isRanked", "seasonId" FROM "Duel" WHERE id = ${duelId} FOR UPDATE`;
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
            submittedDesign: submittedDesignJsonStr,
            designScore: score,
            submitTime
          }
        });

        // Refetch participants inside locked transaction scope
        const dbParticipants = await tx.duelParticipant.findMany({
          where: { duelId },
          include: { user: true }
        });

        const pCurrent = dbParticipants.find(p => p.userId === userId);
        const pOpponent = dbParticipants.find(p => p.userId !== userId);

        const allSubmitted = dbParticipants.every(p => p.submittedDesign !== null);
        if (allSubmitted) {
          triggerResultBroadcast = true;

          // Stop FOMO if any
          stopFomoEngine(duelId);

          const p1 = dbParticipants[0];
          const p2 = dbParticipants[1];

          if (p1.designScore > p2.designScore) {
            winnerId = p1.userId;
            loserId = p2.userId;
          } else if (p2.designScore > p1.designScore) {
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

          if (dbDuel.isRanked) {
            // Resolve Ranked Match using ELO UIUX pools
            const rankedRes = await resolveRankedMatch(dbDuel.seasonId, p1.userId, p2.userId, isDraw ? null : winnerId, isDraw, tx);
            eloChanges = rankedRes.eloChanges;
            rpChanges = rankedRes.rpChanges;
            newRanks = rankedRes.newRanks;

            tokenChanges[p1.userId] = 0;
            tokenChanges[p2.userId] = 0;

            if (!isDraw && winnerId && loserId) {
              await tx.duelParticipant.updateMany({
                where: { duelId, userId: winnerId },
                data: { isWinner: true }
              });
              await tx.duelParticipant.updateMany({
                where: { duelId, userId: loserId },
                data: { isWinner: false }
              });
            }

            await tx.duel.update({
              where: { id: duelId },
              data: {
                status: "completed",
                winnerId: isDraw ? null : winnerId,
                endedAt: new Date()
              }
            });
          } else {
            // Standard Match Resolution
            if (!isDraw && winnerId && loserId) {
              const [winnerUser, loserUser] = await Promise.all([
                tx.user.findUnique({ where: { id: winnerId } }),
                tx.user.findUnique({ where: { id: loserId } })
              ]);

              if (winnerUser && loserUser) {
                const ratingW = winnerUser.eloUIUX || 1000;
                const ratingL = loserUser.eloUIUX || 1000;

                const changeW = calculateElo(ratingW, ratingL, 1);
                const changeL = calculateElo(ratingL, ratingW, 0);

                eloChanges[winnerId] = changeW;
                eloChanges[loserId] = changeL;

                const bet = dbDuel.betAmount;
                const streakBonus = winnerUser.currentStreak >= 2 ? 15 : 0;
                const closenessBonus = Math.round(p1.userId === winnerId ? p1.designScore / 5 : p2.designScore / 5);
                const totalBonus = 50 + bet + streakBonus + closenessBonus;

                tokenChanges[winnerId] = totalBonus;
                tokenChanges[loserId] = -bet;

                const wXp = (winnerUser.xp || 0) + 50;
                const wLevel = Math.floor(Math.sqrt(wXp / 100)) + 1;

                const lXp = (loserUser.xp || 0) + 15;
                const lLevel = Math.floor(Math.sqrt(lXp / 100)) + 1;

                const newStreak = winnerUser.currentStreak + 1;
                const bestStreak = Math.max(winnerUser.bestStreak, newStreak);

                await Promise.all([
                  tx.user.update({
                    where: { id: winnerId },
                    data: {
                      eloUIUX: { increment: changeW },
                      tokens: { increment: totalBonus },
                      totalWins: { increment: 1 },
                      totalDuels: { increment: 1 },
                      currentStreak: newStreak,
                      bestStreak,
                      xp: wXp,
                      level: wLevel,
                      rank: getRankTier(winnerUser.eloUIUX + changeW)
                    }
                  }),
                  tx.user.update({
                    where: { id: loserId },
                    data: {
                      eloUIUX: { increment: changeL },
                      tokens: { decrement: bet },
                      totalDuels: { increment: 1 },
                      currentStreak: 0,
                      xp: lXp,
                      level: lLevel,
                      rank: getRankTier(loserUser.eloUIUX + changeL)
                    }
                  })
                ]);
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
        }
      }, { timeout: 25000 }); // Account for AI grading latency

      // Notify user that design is submitted
      socket.emit('design_submitted', { success: true, score, gradeResult });

      // Notify opponent
      socket.to(`duel:${duelId}`).emit('opponent_submitted', { message: "Your opponent has submitted their design!" });

      // Broadcast results if completed
      if (triggerResultBroadcast) {
        // Refetch participants with submittedDesign to send results
        const finalParticipants = await prisma.duelParticipant.findMany({
          where: { duelId },
          include: { user: true }
        });

        io.to(`duel:${duelId}`).emit('duel_result', {
          winnerId,
          isDraw,
          eloChanges,
          tokenChanges,
          isRanked: duel.isRanked,
          rpChanges,
          newRanks,
          participants: finalParticipants.map(p => ({
            userId: p.userId,
            username: p.user.username,
            score: p.designScore,
            submittedDesign: p.submittedDesign,
            isWinner: p.isWinner
          }))
        });

        // Audit achievements and quests outside transaction scope
        if (winnerId && loserId && !isDraw) {
          checkAchievements(winnerId, null, io).catch(console.error);
          updateQuestProgress(winnerId, "play_duel", 1, null, io).catch(console.error);
          updateQuestProgress(winnerId, "win_duel", 1, null, io).catch(console.error);
          if (!duel.isRanked) {
            updateQuestProgress(winnerId, "gain_xp", 50, null, io).catch(console.error);
            if (tokenChanges[winnerId]) {
              updateQuestProgress(winnerId, "earn_tokens", tokenChanges[winnerId], null, io).catch(console.error);
            }
          }

          checkAchievements(loserId, null, io).catch(console.error);
          updateQuestProgress(loserId, "play_duel", 1, null, io).catch(console.error);
          if (!duel.isRanked) {
            updateQuestProgress(loserId, "gain_xp", 15, null, io).catch(console.error);
          }
        } else {
          const p1 = duel.participants[0];
          const p2 = duel.participants[1];
          if (p1) updateQuestProgress(p1.userId, "play_duel", 1, null, io).catch(console.error);
          if (p2) updateQuestProgress(p2.userId, "play_duel", 1, null, io).catch(console.error);
        }
      }

    } catch (e) {
      if (e.message === "ALREADY_COMPLETED") {
        console.log(`Design duel ${duelId} was already resolved.`);
      } else {
        console.error(e);
        socket.emit('design_submitted', { success: false, reason: "Server processing error." });
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
      let rpChanges = {};
      let newRanks = {};

      await prisma.$transaction(async (tx) => {
        // Row-level lock to prevent concurrency race conditions
        const duels = await tx.$queryRaw`SELECT status, "startedAt", "betAmount", "language", "isRanked", "seasonId" FROM "Duel" WHERE id = ${duelId} FOR UPDATE`;
        const dbDuel = duels[0];
        if (!dbDuel || dbDuel.status !== 'active') {
          throw new Error("ALREADY_COMPLETED");
        }

        const [winnerUser, loserUser] = await Promise.all([
          tx.user.findUnique({ where: { id: winnerId } }),
          loserId ? tx.user.findUnique({ where: { id: loserId } }) : null
        ]);

        const languageKey = dbDuel.language === 'javascript' ? 'eloJS' : dbDuel.language === 'python' ? 'eloPython' : 'eloJava';

        if (dbDuel.isRanked) {
          const rankedRes = await resolveRankedMatch(dbDuel.seasonId, winnerId, loserId, winnerId, false, tx);
          eloChanges = rankedRes.eloChanges;
          rpChanges = rankedRes.rpChanges;
          newRanks = rankedRes.newRanks;

          tokenChanges[winnerId] = 0;
          if (loserId) tokenChanges[loserId] = 0;

          await Promise.all([
            tx.duelParticipant.updateMany({
              where: { duelId, userId: winnerId },
              data: {
                explanation,
                explanationScore: scoreResult.score,
                isWinner: true,
                submitTime: Math.round((Date.now() - new Date(dbDuel.startedAt).getTime()) / 1000)
              }
            }),
            loserId ? tx.duelParticipant.updateMany({
              where: { duelId, userId: loserId },
              data: {
                isWinner: false,
                submitTime: Math.round((Date.now() - new Date(dbDuel.startedAt).getTime()) / 1000)
              }
            }) : Promise.resolve(),
            tx.duel.update({
              where: { id: duelId },
              data: {
                status: "completed",
                winnerId: winnerId,
                endedAt: new Date()
              }
            })
          ]);
        } else {
          if (winnerUser) {
            const ratingW = winnerUser[languageKey] || 1000;
            const ratingL = loserUser ? (loserUser[languageKey] || 1000) : 1000;

            const changeW = calculateElo(ratingW, ratingL, 1);
            const changeL = loserUser ? calculateElo(ratingL, ratingW, 0) : 0;

            eloChanges[winnerId] = changeW;
            if (loserId) eloChanges[loserId] = changeL;

            // Base + Bet + Explanation bonus
            const bet = dbDuel.betAmount;
            const streakBonus = winnerUser.currentStreak >= 2 ? 15 : 0;
            const totalBonus = 50 + bet + scoreResult.score + streakBonus;

            tokenChanges[winnerId] = totalBonus;
            if (loserId) tokenChanges[loserId] = -bet;

            const wXp = (winnerUser.xp || 0) + 50;
            const wLevel = Math.floor(Math.sqrt(wXp / 100)) + 1;

            let lXp = 0;
            let lLevel = 1;
            if (loserUser) {
              lXp = (loserUser.xp || 0) + 15;
              lLevel = Math.floor(Math.sqrt(lXp / 100)) + 1;
            }

            const newStreak = winnerUser.currentStreak + 1;
            const bestStreak = Math.max(winnerUser.bestStreak, newStreak);

            await Promise.all([
              tx.user.update({
                where: { id: winnerId },
                data: {
                  [languageKey]: { increment: changeW },
                  tokens: { increment: totalBonus },
                  totalWins: { increment: 1 },
                  totalDuels: { increment: 1 },
                  currentStreak: newStreak,
                  bestStreak: bestStreak,
                  xp: wXp,
                  level: wLevel,
                  rank: getRankTier(ratingW + changeW)
                }
              }),
              loserUser ? tx.user.update({
                where: { id: loserId },
                data: {
                  [languageKey]: { increment: changeL },
                  tokens: { decrement: bet },
                  totalDuels: { increment: 1 },
                  currentStreak: 0,
                  xp: lXp,
                  level: lLevel,
                  rank: getRankTier(ratingL + changeL)
                }
              }) : Promise.resolve()
            ]);
          }

          // Update participant records and duel status in parallel
          await Promise.all([
            tx.duelParticipant.updateMany({
              where: { duelId, userId: winnerId },
              data: {
                explanation,
                explanationScore: scoreResult.score,
                isWinner: true,
                submitTime: Math.round((Date.now() - new Date(dbDuel.startedAt).getTime()) / 1000)
              }
            }),
            loserId ? tx.duelParticipant.updateMany({
              where: { duelId, userId: loserId },
              data: {
                isWinner: false,
                submitTime: Math.round((Date.now() - new Date(dbDuel.startedAt).getTime()) / 1000)
              }
            }) : Promise.resolve(),
            tx.duel.update({
              where: { id: duelId },
              data: {
                status: "completed",
                winnerId: winnerId,
                endedAt: new Date()
              }
            })
          ]);
        }
      }, {
        timeout: 15000 // 15 seconds interactive transaction timeout
      });

      // Broadcast results
      io.to(`duel:${duelId}`).emit('duel_result', {
        winnerId,
        winnerCode: participant.submittedCode,
        explanation: duel.bug.explanation,
        eloChanges,
        tokenChanges,
        score: scoreResult.score,
        feedback: scoreResult.feedback,
        isRanked: duel.isRanked,
        rpChanges,
        newRanks
      });

      // Audit achievements and quests outside transaction scope
      checkAchievements(winnerId, null, io).catch(console.error);
      updateQuestProgress(winnerId, "play_duel", 1, null, io).catch(console.error);
      updateQuestProgress(winnerId, "win_duel", 1, null, io).catch(console.error);
      if (!duel.isRanked) {
        updateQuestProgress(winnerId, "gain_xp", 50, null, io).catch(console.error);
        if (tokenChanges[winnerId]) {
          updateQuestProgress(winnerId, "earn_tokens", tokenChanges[winnerId], null, io).catch(console.error);
        }
      }

      if (loserId) {
        checkAchievements(loserId, null, io).catch(console.error);
        updateQuestProgress(loserId, "play_duel", 1, null, io).catch(console.error);
        if (!duel.isRanked) {
          updateQuestProgress(loserId, "gain_xp", 15, null, io).catch(console.error);
        }
      }

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
      await resolveForfeit(duelId, userId);
    } catch (e) {
      if (e.message === "ALREADY_COMPLETED") {
        console.log(`Forfeit for duel ${duelId} was already resolved.`);
      } else {
        console.error(e);
      }
    }
  });

  // Match Timeout Room (Double Failure)
  socket.on('match_timeout', async ({ duelId }) => {
    try {
      let eloChanges = {};
      let tokenChanges = {};
      let rpChanges = {};
      let newRanks = {};
      let isRankedGame = false;

      await prisma.$transaction(async (tx) => {
        // Row-level lock to prevent concurrent forfeit or double-resolution race conditions
        const duels = await tx.$queryRaw`SELECT status, "startedAt", "betAmount", "gameType", "language", "isRanked", "seasonId" FROM "Duel" WHERE id = ${duelId} FOR UPDATE`;
        const dbDuel = duels[0];
        if (!dbDuel || dbDuel.status !== 'active') {
          throw new Error("ALREADY_COMPLETED");
        }

        isRankedGame = !!dbDuel.isRanked;

        // Stop FOMO
        stopFomoEngine(duelId);

        // Fetch participants inside locked transaction scope
        const dbParticipants = await tx.duelParticipant.findMany({
          where: { duelId },
          include: { user: true }
        });

        const bet = dbDuel.betAmount;

        if (isRankedGame) {
          // Resolve Ranked Match as a double defeat (winnerId is null)
          for (const p of dbParticipants) {
            const userId = p.userId;
            const rankedRes = await resolveRankedMatch(dbDuel.seasonId, userId, null, null, false, tx);
            eloChanges[userId] = rankedRes.eloChanges[userId] || -15;
            rpChanges[userId] = rankedRes.rpChanges[userId] || -15;
            newRanks[userId] = rankedRes.newRanks[userId] || p.user.rank;
            tokenChanges[userId] = 0;
          }
        } else {
          // Normal Match: ELO deduction and token loss for both
          for (const p of dbParticipants) {
            const userId = p.userId;
            const user = p.user;
            const languageKey = (dbDuel.gameType === 'color_match' || dbDuel.gameType === 'change_design') ? 'eloUIUX' : (dbDuel.language === 'javascript' ? 'eloJS' : dbDuel.language === 'python' ? 'eloPython' : 'eloJava');
            const rating = user[languageKey] || 1000;
            const change = calculateElo(rating, 1000, 0); // Lose against base rating

            eloChanges[userId] = change;
            tokenChanges[userId] = -bet;

            const newXp = (user.xp || 0) + 15;
            const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;

            await tx.user.update({
              where: { id: userId },
              data: {
                eloUIUX: languageKey === 'eloUIUX' ? { increment: change } : undefined,
                eloJS: languageKey === 'eloJS' ? { increment: change } : undefined,
                eloPython: languageKey === 'eloPython' ? { increment: change } : undefined,
                eloJava: languageKey === 'eloJava' ? { increment: change } : undefined,
                tokens: { decrement: bet },
                totalDuels: { increment: 1 },
                currentStreak: 0,
                xp: newXp,
                level: newLevel,
                rank: getRankTier(rating + change)
              }
            });
          }
        }

        // Update participants and duel
        await Promise.all([
          tx.duelParticipant.updateMany({
            where: { duelId },
            data: { isWinner: false }
          }),
          tx.duel.update({
            where: { id: duelId },
            data: {
              status: "completed",
              winnerId: null,
              endedAt: new Date()
            }
          })
        ]);
      }, {
        timeout: 15000
      });

      io.to(`duel:${duelId}`).emit('match_timed_out', {
        eloChanges,
        tokenChanges,
        isRanked: isRankedGame,
        rpChanges,
        newRanks
      });

      // Audit achievements and quests for both
      const dbParticipants = await prisma.duelParticipant.findMany({
        where: { duelId }
      });

      for (const p of dbParticipants) {
        const userId = p.userId;
        checkAchievements(userId, null, io).catch(console.error);
        updateQuestProgress(userId, "play_duel", 1, null, io).catch(console.error);
        if (!isRankedGame) {
          updateQuestProgress(userId, "gain_xp", 15, null, io).catch(console.error);
        }
      }

    } catch (e) {
      if (e.message === "ALREADY_COMPLETED") {
        console.log(`Timeout for duel ${duelId} was already resolved.`);
      } else {
        console.error(e);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

async function resolveForfeit(duelId, loserId) {
  let eloChanges = {};
  let tokenChanges = {};
  let rpChanges = {};
  let newRanks = {};
  let winnerId = null;
  let isRankedGame = false;

  await prisma.$transaction(async (tx) => {
    // Row-level lock to prevent concurrent forfeit or double-resolution race conditions
    const duels = await tx.$queryRaw`SELECT status, "startedAt", "betAmount", "gameType", "language", "isRanked", "seasonId" FROM "Duel" WHERE id = ${duelId} FOR UPDATE`;
    const dbDuel = duels[0];
    if (!dbDuel || dbDuel.status !== 'active') {
      throw new Error("ALREADY_COMPLETED");
    }

    isRankedGame = !!dbDuel.isRanked;

    // Stop FOMO
    stopFomoEngine(duelId);

    // Fetch participants inside locked transaction scope
    const dbParticipants = await tx.duelParticipant.findMany({
      where: { duelId }
    });

    const winnerParticipant = dbParticipants.find(p => p.userId !== loserId);
    winnerId = winnerParticipant ? winnerParticipant.userId : null;

    if (dbDuel.isRanked) {
      // Resolve Ranked Match
      const rankedRes = await resolveRankedMatch(dbDuel.seasonId, loserId, winnerId, winnerId, false, tx);
      eloChanges = rankedRes.eloChanges;
      rpChanges = rankedRes.rpChanges;
      newRanks = rankedRes.newRanks;

      tokenChanges[loserId] = 0;
      if (winnerId) tokenChanges[winnerId] = 0;

      await Promise.all([
        winnerId ? tx.duelParticipant.updateMany({
          where: { duelId, userId: winnerId },
          data: { isWinner: true }
        }) : Promise.resolve(),
        tx.duelParticipant.updateMany({
          where: { duelId, userId: loserId },
          data: { isWinner: false }
        }),
        tx.duel.update({
          where: { id: duelId },
          data: {
            status: "completed",
            winnerId: winnerId,
            endedAt: new Date()
          }
        })
      ]);
    } else {
      const [loserUser, winnerUser] = await Promise.all([
        tx.user.findUnique({ where: { id: loserId } }),
        winnerId ? tx.user.findUnique({ where: { id: winnerId } }) : null
      ]);

      const languageKey = (dbDuel.gameType === 'color_match' || dbDuel.gameType === 'change_design') ? 'eloUIUX' : (dbDuel.language === 'javascript' ? 'eloJS' : dbDuel.language === 'python' ? 'eloPython' : 'eloJava');

      if (loserUser) {
        const ratingL = loserUser[languageKey] || 1000;
        const ratingW = winnerUser ? (winnerUser[languageKey] || 1000) : 1000;

        const changeL = calculateElo(ratingL, ratingW, 0);
        const changeW = winnerUser ? calculateElo(ratingW, ratingL, 1) : 0;

        if (winnerId) eloChanges[winnerId] = changeW;
        eloChanges[loserId] = changeL;

        const bet = dbDuel.betAmount;
        const totalBonus = 50 + bet;

        if (winnerId) tokenChanges[winnerId] = totalBonus;
        tokenChanges[loserId] = -bet;

        const lXp = (loserUser.xp || 0) + 15;
        const lLevel = Math.floor(Math.sqrt(lXp / 100)) + 1;

        let wXp = 0;
        let wLevel = 1;
        if (winnerUser) {
          wXp = (winnerUser.xp || 0) + 50;
          wLevel = Math.floor(Math.sqrt(wXp / 100)) + 1;
        }

        await Promise.all([
          tx.user.update({
            where: { id: loserId },
            data: {
              eloUIUX: languageKey === 'eloUIUX' ? { increment: changeL } : undefined,
              eloJS: languageKey === 'eloJS' ? { increment: changeL } : undefined,
              eloPython: languageKey === 'eloPython' ? { increment: changeL } : undefined,
              eloJava: languageKey === 'eloJava' ? { increment: changeL } : undefined,
              tokens: { decrement: bet },
              totalDuels: { increment: 1 },
              currentStreak: 0,
              xp: lXp,
              level: lLevel,
              rank: getRankTier(ratingL + changeL)
            }
          }),
          winnerUser ? tx.user.update({
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
              xp: wXp,
              level: wLevel,
              rank: getRankTier(ratingW + changeW)
            }
          }) : Promise.resolve()
        ]);
      }

      await Promise.all([
        winnerId ? tx.duelParticipant.updateMany({
          where: { duelId, userId: winnerId },
          data: { isWinner: true }
        }) : Promise.resolve(),
        tx.duelParticipant.updateMany({
          where: { duelId, userId: loserId },
          data: { isWinner: false }
        }),
        tx.duel.update({
          where: { id: duelId },
          data: {
            status: "completed",
            winnerId: winnerId,
            endedAt: new Date()
          }
        })
      ]);
    }
  }, {
    timeout: 15000
  });

  io.to(`duel:${duelId}`).emit('opponent_forfeited', {
    winnerId,
    eloChanges,
    tokenChanges,
    isRanked: isRankedGame,
    rpChanges,
    newRanks
  });

  if (winnerId) {
    checkAchievements(winnerId, null, io).catch(console.error);
    updateQuestProgress(winnerId, "play_duel", 1, null, io).catch(console.error);
    updateQuestProgress(winnerId, "win_duel", 1, null, io).catch(console.error);
    if (!isRankedGame) {
      updateQuestProgress(winnerId, "gain_xp", 50, null, io).catch(console.error);
      if (tokenChanges[winnerId]) {
        updateQuestProgress(winnerId, "earn_tokens", tokenChanges[winnerId], null, io).catch(console.error);
      }
    }
  }
  checkAchievements(loserId, null, io).catch(console.error);
  updateQuestProgress(loserId, "play_duel", 1, null, io).catch(console.error);
  if (!isRankedGame) {
    updateQuestProgress(loserId, "gain_xp", 15, null, io).catch(console.error);
  }
}

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

// ==================== SEASONAL RANKED MODULES ====================
const seasonRouter = require('./routes/season');
const setupRankedSocket = require('./socket/ranked');
const designChallengeRouter = require('./routes/designChallenges');

// Register Season REST API routes
app.use('/api/season', seasonRouter);

// Register Design Challenge REST API routes
app.use('/api/design-challenge', designChallengeRouter);

// Register Ranked Queue Socket.io event handlers
setupRankedSocket(io);
// =================================================================

// Start Server
server.listen(PORT, () => {
  console.log(`DebugDuel Backend listening on port ${PORT}`);
  seedAchievements();
  seedQuests();
});

