const express = require('express');
const router = express.Router();

// Placeholder for KBC config/categories/status REST endpoints
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
