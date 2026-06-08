const { GoogleGenAI } = require('@google/generative-ai');
const OpenAI = require('openai');

function safeParseJson(text) {
  try {
    // Strip markdown formatting if any
    const cleanText = text.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse JSON in design judge:", e, "Text was:", text);
    return null;
  }
}

// Fallback logic when both Gemini and OpenAI fail
function getFallbackGrade(challenge, initialDesign, submittedDesign) {
  console.log("Using local design grade fallback.");
  
  // Heuristic checking: let's see if the user changed styles of components
  let modifiedPropertiesCount = 0;
  
  function compareNodes(initNode, subNode) {
    if (!initNode || !subNode) return;
    
    // Compare styles
    const initStyle = (initNode.props && initNode.props.style) || {};
    const subStyle = (subNode.props && subNode.props.style) || {};
    
    for (const key of Object.keys(initStyle)) {
      if (initStyle[key] !== subStyle[key]) {
        modifiedPropertiesCount++;
      }
    }
    for (const key of Object.keys(subStyle)) {
      if (initStyle[key] === undefined) {
        modifiedPropertiesCount++;
      }
    }
    
    // Recursively compare children if container
    if (initNode.children && subNode.children) {
      const minLen = Math.min(initNode.children.length, subNode.children.length);
      for (let i = 0; i < minLen; i++) {
        compareNodes(initNode.children[i], subNode.children[i]);
      }
    }
  }

  try {
    const initObj = typeof initialDesign === 'string' ? JSON.parse(initialDesign) : initialDesign;
    const subObj = typeof submittedDesign === 'string' ? JSON.parse(submittedDesign) : submittedDesign;
    compareNodes(initObj, subObj);
  } catch (err) {
    console.error("Failed to run compareNodes in fallback", err);
  }

  // Generate a plausible score based on effort (number of style changes)
  const baseScore = 60;
  const effortBonus = Math.min(modifiedPropertiesCount * 3, 25);
  const totalScore = baseScore + effortBonus;

  return {
    visualHierarchy: Math.round(totalScore * 0.2),
    accessibility: Math.round(totalScore * 0.2),
    usability: Math.round(totalScore * 0.2),
    goalCompletion: Math.round(totalScore * 0.2),
    styleAesthetics: Math.round(totalScore * 0.2),
    score: totalScore,
    strengths: [
      "Successfully modified elements on the canvas",
      "Demonstrated basic design editing activity"
    ],
    weaknesses: [
      "AI Service is temporarily busy, fallback grading was activated",
      "Exact target metric checks are simulated in fallback mode"
    ],
    feedback: "The design was analyzed by the local layout checker. Great effort in modifying layout properties. Try submitting again when the AI model is free to get full aesthetic and typographic feedback."
  };
}

async function gradeDesign(challenge, submittedDesignJsonStr) {
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const hasGemini = geminiKey && geminiKey.trim().length > 10;
  const hasOpenAi = openAiKey && openAiKey.trim().length > 10;

  const systemPrompt = `You are a Senior Product UI/UX Designer and Frontend Accessibility Expert.
Your task is to judge a user's submission for a UI Design Duel challenge.
You will be given:
1. The challenge title, description, and list of UX goals.
2. The initial poorly designed JSON element tree.
3. The user's final modified JSON element tree.

Analyze the layout properties, color combinations, typography choices, padding, margin, sizing, and structure of the elements in the user's submission compared to the goals.
For colors, check for accessibility contrast (e.g. gray-on-white is bad; dark on light or bright-on-dark is good).
For mobile layouts, check for large touch target sizes (e.g. inputs/buttons >= 40px, ideally 48px).
For visual hierarchy, verify that headings are larger/bolder than body text.

Return a valid JSON object matching the following structure:
{
  "visualHierarchy": 15, // Score out of 20
  "accessibility": 18,    // Score out of 20
  "usability": 16,        // Score out of 20
  "goalCompletion": 17,   // Score out of 20
  "styleAesthetics": 14,  // Score out of 20
  "score": 80,            // Total sum score out of 100
  "strengths": ["Button is highly visible with high contrast green background", "Increased paragraph spacing"],
  "weaknesses": ["Text label remains too small at 9px", "Padding on container is asymmetric"],
  "feedback": "A concise paragraph summarizing your evaluation, praising their strengths and giving constructive advice."
}
Do NOT return any other text outside the JSON. Ensure valid JSON format.`;

  const userPrompt = `
=== CHALLENGE INFO ===
Title: ${challenge.title}
Description: ${challenge.description}
Audience: ${challenge.targetAudience}
Goals:
${challenge.goals.map((g, i) => `${i + 1}. ${g}`).join('\n')}

=== INITIAL LAYOUT ===
${JSON.stringify(challenge.initialDesign, null, 2)}

=== SUBMITTED LAYOUT ===
${submittedDesignJsonStr}
`;

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
      const parsed = safeParseJson(text);
      if (parsed && typeof parsed.score === 'number') {
        return parsed;
      }
    } catch (err) {
      console.error("Gemini Design Judge failed, falling back to OpenAI/Local...", err);
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
        temperature: 0.2,
        response_format: { type: "json_object" }
      });
      const parsed = safeParseJson(response.choices[0].message.content);
      if (parsed && typeof parsed.score === 'number') {
        return parsed;
      }
    } catch (err) {
      console.error("OpenAI Design Judge failed, falling back to Local...", err);
    }
  }

  // 3. Heuristic Fallback
  return getFallbackGrade(challenge, challenge.initialDesign, submittedDesignJsonStr);
}

module.exports = {
  gradeDesign
};
