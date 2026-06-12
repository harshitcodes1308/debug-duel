const express = require('express');
const router = express.Router();
const { designChallenges } = require('../services/designChallenges');
const { gradeDesign } = require('../services/designJudge');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { awardXP } = require('../utils/xp');
const { updateQuestProgress } = require('../services/quests');
const { checkAchievements } = require('../services/achievements');
const { requireAuth } = require('../middleware/auth');

// Get all challenges
router.get('/', (req, res) => {
  res.json(designChallenges);
});

// Get specific challenge
router.get('/:id', (req, res) => {
  const challenge = designChallenges.find(c => c.id === req.params.id);
  if (!challenge) {
    return res.status(404).json({ error: "Challenge not found" });
  }
  res.json(challenge);
});

// Grade solo design practice
router.post('/solo/grade', requireAuth, async (req, res) => {
  // userId derived from JWT token, not client body
  const userId = req.userId;
  const { challengeId, submittedDesign } = req.body;
  if (!challengeId || !submittedDesign) {
    return res.status(400).json({ error: "Missing challengeId or submittedDesign" });
  }

  const challenge = designChallenges.find(c => c.id === challengeId);
  if (!challenge) {
    return res.status(404).json({ error: "Challenge not found" });
  }

  try {
    const result = await gradeDesign(challenge, JSON.stringify(submittedDesign));
    
    let xpReward = 0;
    let tokenReward = 0;
    let userStats = null;
    
    if (userId) {
      // Award practice rewards based on score quality
      if (result.score >= 50) {
        xpReward = Math.round(result.score * 0.5); // Up to 50 XP
        tokenReward = Math.round(result.score * 0.1); // Up to 10 tokens
        
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user) {
          const updatedUser = await awardXP(userId, xpReward); // Use awardXP helper to handle level-ups
          
          await prisma.user.update({
            where: { id: userId },
            data: {
              tokens: { increment: tokenReward }
            }
          });
          
          await updateQuestProgress(userId, 'gain_xp', xpReward);
          await updateQuestProgress(userId, 'earn_tokens', tokenReward);
          await checkAchievements(userId);
          
          userStats = {
            xp: updatedUser.xp,
            tokens: updatedUser.tokens + tokenReward,
            level: updatedUser.level
          };
        }
      }
    }

    res.json({
      success: true,
      grade: result,
      rewards: { xp: xpReward, tokens: tokenReward },
      userStats
    });
  } catch (err) {
    console.error("Error in solo grading route:", err);
    res.status(500).json({ error: "Failed to grade design" });
  }
});

module.exports = router;
