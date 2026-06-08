const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Reusable utility to award XP to a user and update their level based on the formula:
 * level = floor(sqrt(xp / 100)) + 1
 * 
 * Supports both standalone execution and execution inside an existing Prisma transaction.
 * 
 * @param {string} userId - The user's ID
 * @param {number} amount - The amount of XP to award
 * @param {object} [tx] - Optional Prisma transaction delegate
 * @returns {Promise<object|null>} - The updated user object, or null if failed
 */
async function awardXP(userId, amount, tx = null, io = null) {
  try {
    const client = tx || prisma;
    
    // Fetch current XP and Level
    const user = await client.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true }
    });
    
    if (!user) {
      console.warn(`User with ID ${userId} not found for XP award.`);
      return null;
    }
    
    const currentXp = user.xp || 0;
    const currentLevel = user.level || 1;
    const newXp = currentXp + amount;
    const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
    
    // Update user record
    const updatedUser = await client.user.update({
      where: { id: userId },
      data: {
        xp: newXp,
        level: newLevel
      }
    });
    
    if (newLevel > currentLevel) {
      const { checkAchievements } = require('../services/achievements');
      checkAchievements(userId, client, io).catch(console.error);
    }
    
    return updatedUser;
  } catch (error) {
    console.error(`Failed to award XP to user ${userId}:`, error);
    return null;
  }
}

module.exports = {
  awardXP
};
