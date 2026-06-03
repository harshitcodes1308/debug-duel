const express = require('express');
const router = express.Router();
const kbcService = require('../../services/kbc');

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

module.exports = router;
