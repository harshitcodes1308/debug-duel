const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { awardXP } = require('../utils/xp');
const { updateQuestProgress } = require('./quests');

// Static Achievements definitions
const STATIC_ACHIEVEMENTS = [
  // Combat
  {
    id: "combat_first_blood",
    title: "First Blood",
    description: "Win your first duel",
    icon: "Swords",
    rarity: "Common",
    category: "Combat",
    xpReward: 25,
    tokenReward: 10
  },
  {
    id: "combat_exterminator",
    title: "Bug Exterminator",
    description: "Win 10 duels",
    icon: "Zap",
    rarity: "Rare",
    category: "Combat",
    xpReward: 50,
    tokenReward: 25
  },
  {
    id: "combat_veteran",
    title: "Arena Veteran",
    description: "Win 50 duels",
    icon: "Trophy",
    rarity: "Epic",
    category: "Combat",
    xpReward: 100,
    tokenReward: 50
  },
  {
    id: "combat_legend",
    title: "Debug Legend",
    description: "Win 100 duels",
    icon: "Award",
    rarity: "Legendary",
    category: "Combat",
    xpReward: 250,
    tokenReward: 100
  },
  // Streak
  {
    id: "streak_on_fire",
    title: "On Fire",
    description: "3 win streak",
    icon: "Flame",
    rarity: "Common",
    category: "Streak",
    xpReward: 25,
    tokenReward: 10
  },
  {
    id: "streak_unstoppable",
    title: "Unstoppable",
    description: "7 win streak",
    icon: "Flame",
    rarity: "Rare",
    category: "Streak",
    xpReward: 50,
    tokenReward: 25
  },
  {
    id: "streak_monster_run",
    title: "Monster Run",
    description: "15 win streak",
    icon: "Flame",
    rarity: "Epic",
    category: "Streak",
    xpReward: 100,
    tokenReward: 50
  },
  // Progression
  {
    id: "progression_level_5",
    title: "Level 5",
    description: "Reach Level 5",
    icon: "Shield",
    rarity: "Common",
    category: "Progression",
    xpReward: 25,
    tokenReward: 10
  },
  {
    id: "progression_level_10",
    title: "Level 10",
    description: "Reach Level 10",
    icon: "Shield",
    rarity: "Rare",
    category: "Progression",
    xpReward: 50,
    tokenReward: 25
  },
  {
    id: "progression_level_25",
    title: "Level 25",
    description: "Reach Level 25",
    icon: "Shield",
    rarity: "Epic",
    category: "Progression",
    xpReward: 100,
    tokenReward: 50
  },
  {
    id: "progression_level_50",
    title: "Level 50",
    description: "Reach Level 50",
    icon: "Shield",
    rarity: "Legendary",
    category: "Progression",
    xpReward: 250,
    tokenReward: 100
  },
  // KBC
  {
    id: "kbc_hot_seat",
    title: "Hot Seat",
    description: "Complete first KBC run",
    icon: "Play",
    rarity: "Common",
    category: "KBC",
    xpReward: 25,
    tokenReward: 10
  },
  {
    id: "kbc_quiz_master",
    title: "Quiz Master",
    description: "Win 10 KBC matches",
    icon: "Trophy",
    rarity: "Rare",
    category: "KBC",
    xpReward: 50,
    tokenReward: 25
  },
  {
    id: "kbc_millionaire",
    title: "Code Millionaire",
    description: "Reach highest KBC tier",
    icon: "Award",
    rarity: "Epic",
    category: "KBC",
    xpReward: 100,
    tokenReward: 50
  },
  // Consistency
  {
    id: "consistency_grinder",
    title: "Daily Grinder",
    description: "Claim daily reward 7 days",
    icon: "Calendar",
    rarity: "Rare",
    category: "Consistency",
    xpReward: 50,
    tokenReward: 25
  },
  {
    id: "consistency_dedication",
    title: "Dedication",
    description: "Claim daily reward 30 days",
    icon: "Calendar",
    rarity: "Epic",
    category: "Consistency",
    xpReward: 100,
    tokenReward: 50
  },
  // Social
  {
    id: "social_first_friend",
    title: "First Friend",
    description: "Add first friend",
    icon: "Users",
    rarity: "Common",
    category: "Social",
    xpReward: 25,
    tokenReward: 10
  },
  {
    id: "social_rival_hunter",
    title: "Rival Hunter",
    description: "Play first friend duel",
    icon: "Swords",
    rarity: "Common",
    category: "Social",
    xpReward: 25,
    tokenReward: 10
  }
];

/**
 * Seed all static achievement definitions into the database if they don't exist.
 */
async function seedAchievements() {
  try {
    for (const ach of STATIC_ACHIEVEMENTS) {
      await prisma.achievement.upsert({
        where: { id: ach.id },
        update: ach,
        create: ach
      });
    }
    console.log("Achievements database seeding complete.");
  } catch (error) {
    console.error("Failed to seed achievements:", error);
  }
}

/**
 * Audit user state and unlock eligible achievements. Award XP/Tokens and notify client.
 * 
 * @param {string} userId - The user's ID
 * @param {object} [tx] - Optional Prisma transaction delegate
 * @param {object} [io] - Optional Socket.io instance to emit event
 * @returns {Promise<Array>} - List of newly unlocked achievement definitions
 */
async function checkAchievements(userId, tx = null, io = null) {
  const client = tx || prisma;
  
  try {
    // 1. Fetch user data (including duels, runs) and already unlocked achievements
    const user = await client.user.findUnique({
      where: { id: userId },
      include: {
        duels: {
          include: {
            duel: {
              include: {
                participants: true
              }
            }
          }
        },
        kbcSoloRuns: true,
        achievements: true
      }
    });

    if (!user) return [];

    const unlockedIds = new Set(user.achievements.map(ua => ua.achievementId));
    const newlyUnlocked = [];

    // Calculate conditional requirements beforehand:
    
    // Combat totals (totalWins is overall count)
    const combatWins = user.totalWins || 0;
    
    // Streak totals
    const streak = Math.max(user.currentStreak || 0, user.bestStreak || 0);
    
    // Progression level
    const level = user.level || 1;
    
    // KBC Solo runs count
    const kbcSoloRunsCount = user.kbcSoloRuns.length;
    
    // KBC Multiplayer wins
    const kbcMultiplayerWins = user.duels.filter(dp => 
      dp.isWinner && dp.duel.gameType === 'kbc'
    ).length;

    // KBC Millionaire jackpot check
    const reachedJackpot = user.kbcSoloRuns.some(run => run.questionsAnswered === 15);

    // Consistency daily streaks
    const dailyStreak = Math.max(user.dailyStreak || 0);

    // Friendships count
    const friendships = await client.friendship.findMany({
      where: {
        OR: [
          { userId },
          { friendId: userId }
        ]
      }
    });
    const friendsCount = friendships.length;
    const friendIds = friendships.map(f => f.userId === userId ? f.friendId : f.userId);

    // Rival Hunter: played duel with friend
    const playedFriendDuel = user.duels.some(dp => 
      dp.duel.participants.some(op => op.userId !== userId && friendIds.includes(op.userId))
    );

    // Evaluate each static achievement
    for (const ach of STATIC_ACHIEVEMENTS) {
      if (unlockedIds.has(ach.id)) continue; // Already unlocked

      let eligible = false;

      switch (ach.id) {
        // Combat
        case "combat_first_blood":
          eligible = combatWins >= 1;
          break;
        case "combat_exterminator":
          eligible = combatWins >= 10;
          break;
        case "combat_veteran":
          eligible = combatWins >= 50;
          break;
        case "combat_legend":
          eligible = combatWins >= 100;
          break;

        // Streak
        case "streak_on_fire":
          eligible = streak >= 3;
          break;
        case "streak_unstoppable":
          eligible = streak >= 7;
          break;
        case "streak_monster_run":
          eligible = streak >= 15;
          break;

        // Progression
        case "progression_level_5":
          eligible = level >= 5;
          break;
        case "progression_level_10":
          eligible = level >= 10;
          break;
        case "progression_level_25":
          eligible = level >= 25;
          break;
        case "progression_level_50":
          eligible = level >= 50;
          break;

        // KBC
        case "kbc_hot_seat":
          eligible = kbcSoloRunsCount >= 1;
          break;
        case "kbc_quiz_master":
          eligible = kbcMultiplayerWins >= 10;
          break;
        case "kbc_millionaire":
          eligible = reachedJackpot;
          break;

        // Consistency
        case "consistency_grinder":
          eligible = dailyStreak >= 7;
          break;
        case "consistency_dedication":
          eligible = dailyStreak >= 30;
          break;

        // Social
        case "social_first_friend":
          eligible = friendsCount >= 1;
          break;
        case "social_rival_hunter":
          eligible = playedFriendDuel;
          break;
      }

      if (eligible) {
        // 2. Lock achievement in database
        await client.userAchievement.create({
          data: {
            userId,
            achievementId: ach.id
          }
        });

        // 3. Payout rewards
        await awardXP(userId, ach.xpReward, tx, io);
        await updateQuestProgress(userId, "gain_xp", ach.xpReward, tx, io);
        await updateQuestProgress(userId, "earn_tokens", ach.tokenReward, tx, io);
        await client.user.update({
          where: { id: userId },
          data: {
            tokens: { increment: ach.tokenReward }
          }
        });

        newlyUnlocked.push(ach);

        // 4. Emit socket notification in real-time
        if (io) {
          io.to(`user:${userId}`).emit('achievement_unlocked', ach);
        }
      }
    }

    return newlyUnlocked;

  } catch (error) {
    console.error(`Error auditing achievements for user ${userId}:`, error);
    return [];
  }
}

module.exports = {
  seedAchievements,
  checkAchievements,
  STATIC_ACHIEVEMENTS
};
