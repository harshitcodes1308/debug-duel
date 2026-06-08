const questions = require('./questions');
const { GoogleGenAI } = require('@google/generative-ai');
const OpenAI = require('openai');

// Helper to shuffle array in-place
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Helper to unescape HTML entities returned by OpenTDB API
function unescapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&hellip;/g, '...')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
}

// Category mapping helper from frontend format to openTDB category ID
function mapCategoryToOpenTdb(category) {
  if (!category) return 9; // General Knowledge
  const cat = category.toLowerCase();
  if (cat.includes('computers') || cat.includes('programming') || cat.includes('javascript') || cat.includes('react') || cat.includes('nodejs') || cat.includes('sql') || cat.includes('git') || cat.includes('sys_design')) {
    return 18; // Science: Computers
  }
  if (cat.includes('science')) {
    return 17; // Science & Nature
  }
  if (cat.includes('general') || cat.includes('gk')) {
    return 9; // General Knowledge
  }
  return 18; // Default to Computers
}

// 1. Curated Static Questions Provider
function getCuratedQuestions(category, difficulty, count = 2) {
  let matchedCategories = [];
  if (category) {
    const catLower = category.toLowerCase();
    if (catLower === 'javascript') matchedCategories = ['JavaScript'];
    else if (catLower === 'react') matchedCategories = ['React'];
    else if (catLower === 'nodejs') matchedCategories = ['Node.js'];
    else if (catLower === 'git') matchedCategories = ['Git', 'GitHub'];
    else if (catLower === 'sys_design') matchedCategories = ['System Design'];
    else if (catLower === 'dsa') matchedCategories = ['DSA'];
    else if (catLower === 'web_dev' || catLower === 'webdevelopment') matchedCategories = ['Web Development'];
    else if (catLower === 'general_tech') matchedCategories = ['General Tech'];
    else matchedCategories = [category];
  }

  // Filter local pool
  let list = questions.filter(q => 
    q.difficulty === difficulty && 
    (matchedCategories.length === 0 || matchedCategories.some(c => 
      q.category.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(q.category.toLowerCase())
    ))
  );

  list = shuffle(list);
  let selected = list.slice(0, count);

  // Fallback to same difficulty if category didn't have enough
  if (selected.length < count) {
    let fallbackPool = questions.filter(q => 
      q.difficulty === difficulty && 
      !selected.some(existing => existing.id === q.id)
    );
    fallbackPool = shuffle(fallbackPool);
    selected = [...selected, ...fallbackPool.slice(0, count - selected.length)];
  }

  return selected;
}

// 2. OpenTDB Provider
async function fetchOpenTdbQuestions(category, difficulty, count = 2) {
  const catId = mapCategoryToOpenTdb(category);
  const url = `https://opentdb.com/api.php?amount=${count}&category=${catId}&difficulty=${difficulty}&type=multiple`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP Status " + res.status);
    const data = await res.json();
    
    if (data.response_code !== 0 || !Array.isArray(data.results)) {
      throw new Error("Invalid response code or structure from OpenTDB");
    }

    return data.results.map((item, idx) => {
      const qText = unescapeHtml(item.question);
      const correctOption = unescapeHtml(item.correct_answer);
      const incorrectOptions = item.incorrect_answers.map(unescapeHtml);
      
      const options = shuffle([correctOption, ...incorrectOptions]);
      const correctAnswerIndex = options.indexOf(correctOption);

      return {
        id: `api-${difficulty}-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        question: qText,
        options,
        correctAnswer: correctAnswerIndex,
        difficulty,
        category: item.category,
        explanation: `The correct answer is ${correctOption}. (Source: OpenTriviaDB)`,
        points: difficulty === 'easy' ? 100 : difficulty === 'medium' ? 8000 : 250000
      };
    });
  } catch (error) {
    console.warn(`OpenTDB fetch failed for ${category} (${difficulty}):`, error.message);
    return []; // Return empty so mixing engine can fallback to Curated
  }
}

// 3. AI generated Questions Provider (generates 1 easy, 1 medium, 1 hard in batch)
async function fetchAiQuestionsBatch(category) {
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const hasGemini = geminiKey && geminiKey.trim().length > 10;
  const hasOpenAi = openAiKey && openAiKey.trim().length > 10;

  if (!hasGemini && !hasOpenAi) {
    console.log("No AI keys configured for AI KBC Question generation. Skipping AI provider.");
    return [];
  }

  const systemPrompt = `You are a Senior Technical Trivia Host.
Generate exactly 3 developer-centric multiple choice questions.
Category: ${category}
One question MUST be 'easy' difficulty.
One question MUST be 'medium' difficulty.
One question MUST be 'hard' difficulty.

For Computers/Programming categories, generate technical questions about coding, languages, syntax, systems, frameworks, or git.
For Startups, Tech, AI, Hackathons, Internet Culture, generate industry-relevant business/tech questions.
For General KBC, generate general developer/tech trivia questions.

Return a JSON array containing exactly 3 question objects.
Return ONLY valid JSON. No markdown backticks, no wrapping text.
Each question object MUST strictly match this schema:
{
  "id": "ai-[unique-id]",
  "question": "The question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0, // 0-indexed index of correct answer in the options array (must be 0, 1, 2, or 3)
  "difficulty": "easy" or "medium" or "hard",
  "category": "${category}",
  "explanation": "Why this answer is correct",
  "points": 100
}`;

  // 1. Try Gemini
  if (hasGemini) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      });
      const text = response.response.text();
      const items = parseAiQuestions(text);
      if (items && items.length === 3) {
        return items;
      }
    } catch (err) {
      console.error("Gemini KBC Question generation failed:", err);
    }
  }

  // 2. Try OpenAI
  if (hasOpenAi) {
    try {
      const openai = new OpenAI({ apiKey: openAiKey });
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You generate programming trivia questions in JSON." },
          { role: "user", content: systemPrompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });
      const text = response.choices[0].message.content;
      const items = parseAiQuestions(text);
      if (items && items.length === 3) {
        return items;
      }
    } catch (err) {
      console.error("OpenAI KBC Question generation failed:", err);
    }
  }

  return [];
}

// Helper to parse AI JSON array safely
function parseAiQuestions(text) {
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data)) return data;
    if (data.questions && Array.isArray(data.questions)) return data.questions;
    if (data.results && Array.isArray(data.results)) return data.results;
    return null;
  } catch {
    return null;
  }
}

/**
 * Generate 15 progressive questions:
 * - 40% curated (6 questions) -> 2 easy, 2 medium, 2 hard
 * - 40% API (6 questions) -> 2 easy, 2 medium, 2 hard
 * - 20% AI generated (3 questions) -> 1 easy, 1 medium, 1 hard
 */
async function generateMixedQuestionSet(category) {
  // Concurrently fetch API & AI questions with a timeout fallback to ensure speed
  const apiCallPromise = (async () => {
    try {
      const [easyApi, mediumApi, hardApi] = await Promise.all([
        fetchOpenTdbQuestions(category, 'easy', 2),
        fetchOpenTdbQuestions(category, 'medium', 2),
        fetchOpenTdbQuestions(category, 'hard', 2)
      ]);
      return { easy: easyApi, medium: mediumApi, hard: hardApi };
    } catch {
      return { easy: [], medium: [], hard: [] };
    }
  })();

  const aiCallPromise = fetchAiQuestionsBatch(category).catch(() => []);

  // Set a strict 4-second timeout for API and AI services
  const timeoutPromise = new Promise(resolve => setTimeout(() => resolve("TIMEOUT"), 4000));

  const results = await Promise.race([
    Promise.all([apiCallPromise, aiCallPromise]),
    timeoutPromise
  ]);

  let apiQuestions = { easy: [], medium: [], hard: [] };
  let aiQuestionsList = [];

  if (results !== "TIMEOUT" && Array.isArray(results)) {
    apiQuestions = results[0];
    aiQuestionsList = results[1] || [];
  } else {
    console.warn("KBC external question generation timed out. Falling back to local pools.");
  }

  // Parse AI questions list by difficulty
  const aiQuestions = {
    easy: aiQuestionsList.filter(q => q.difficulty === 'easy'),
    medium: aiQuestionsList.filter(q => q.difficulty === 'medium'),
    hard: aiQuestionsList.filter(q => q.difficulty === 'hard')
  };

  const finalSet = [];
  const difficulties = ['easy', 'medium', 'hard'];

  difficulties.forEach((diff) => {
    const diffCuratedNeeded = 5;
    
    // We aim for: 2 curated, 2 API, 1 AI
    const curatedQuestions = getCuratedQuestions(category, diff, 5);
    const apiPool = apiQuestions[diff] || [];
    const aiPool = aiQuestions[diff] || [];

    let diffSet = [];

    // 1. Add AI question (need 1)
    if (aiPool.length > 0) {
      diffSet.push(aiPool[0]);
    }

    // 2. Add API questions (need 2)
    const apiAddedCount = Math.min(2, apiPool.length);
    diffSet = [...diffSet, ...apiPool.slice(0, apiAddedCount)];

    // 3. Fill the remaining spots to get to 5 questions with Curated ones
    const remainingSpots = 5 - diffSet.length;
    let curatedSlice = curatedQuestions.filter(cq => !diffSet.some(ds => ds.id === cq.id)).slice(0, remainingSpots);
    diffSet = [...diffSet, ...curatedSlice];

    // 4. Double check if we still didn't reach 5, pull more curated fallbacks
    if (diffSet.length < 5) {
      const needed = 5 - diffSet.length;
      const fallbackList = getCuratedQuestions(category, diff, 5).filter(cq => !diffSet.some(ds => ds.id === cq.id));
      diffSet = [...diffSet, ...fallbackList.slice(0, needed)];
    }

    // Ensure all points match progress values (100 to 1,000,000)
    // Level values map indexes:
    // Easy: Q0-Q4 -> 100, 200, 300, 500, 1000
    // Medium: Q5-Q9 -> 2000, 4000, 8000, 16000, 32000
    // Hard: Q10-Q14 -> 64000, 125000, 250000, 500000, 1000000
    const pointScale = [
      100, 200, 300, 500, 1000,
      2000, 4000, 8000, 16000, 32000,
      64000, 125000, 250000, 500000, 1000000
    ];

    const startIndex = diff === 'easy' ? 0 : diff === 'medium' ? 5 : 10;
    diffSet.forEach((q, idx) => {
      q.points = pointScale[startIndex + idx];
    });

    finalSet.push(...diffSet);
  });

  return finalSet;
}

module.exports = {
  generateMixedQuestionSet,
  fetchOpenTdbQuestions,
  fetchAiQuestionsBatch
};
