const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const STATIC_QUESTS = [
  // Daily
  {
    id: "daily_play_2_duels",
    title: "Debug Apprentice",
    description: "Play 2 duels",
    type: "play_duel",
    target: 2,
    rewardXP: 25,
    rewardTokens: 50,
    category: "DAILY"
  },
  {
    id: "daily_win_1_duel",
    title: "First Blood Today",
    description: "Win 1 duel",
    type: "win_duel",
    target: 1,
    rewardXP: 25,
    rewardTokens: 50,
    category: "DAILY"
  },
  {
    id: "daily_play_kbc",
    title: "Hot Seat",
    description: "Complete 1 KBC run",
    type: "play_kbc",
    target: 1,
    rewardXP: 25,
    rewardTokens: 50,
    category: "DAILY"
  },
  {
    id: "daily_login",
    title: "Daily Login",
    description: "Claim daily reward",
    type: "claim_daily_reward",
    target: 1,
    rewardXP: 25,
    rewardTokens: 50,
    category: "DAILY"
  },
  {
    id: "daily_gain_xp",
    title: "XP Hunter",
    description: "Earn 100 XP",
    type: "gain_xp",
    target: 100,
    rewardXP: 25,
    rewardTokens: 50,
    category: "DAILY"
  },
  // Weekly
  {
    id: "weekly_play_20_duels",
    title: "Arena Grinder",
    description: "Play 20 duels",
    type: "play_duel",
    target: 20,
    rewardXP: 150,
    rewardTokens: 250,
    category: "WEEKLY"
  },
  {
    id: "weekly_win_10_duels",
    title: "Champion",
    description: "Win 10 duels",
    type: "win_duel",
    target: 10,
    rewardXP: 150,
    rewardTokens: 250,
    category: "WEEKLY"
  },
  {
    id: "weekly_play_10_kbc",
    title: "Knowledge Master",
    description: "Complete 10 KBC runs",
    type: "play_kbc",
    target: 10,
    rewardXP: 150,
    rewardTokens: 250,
    category: "WEEKLY"
  },
  {
    id: "weekly_consistency",
    title: "Consistency",
    description: "Claim daily reward 7 times",
    type: "claim_daily_reward",
    target: 7,
    rewardXP: 150,
    rewardTokens: 250,
    category: "WEEKLY"
  }
];

/**
 * Seed all static quest definitions into the database if they don't exist.
 */
async function seedQuests() {
  try {
    for (const q of STATIC_QUESTS) {
      await prisma.quest.upsert({
        where: { id: q.id },
        update: q,
        create: q
      });
    }
    console.log("Quests database seeding complete.");
  } catch (error) {
    console.error("Failed to seed quests:", error);
  }
}

/**
 * Auto-assign active quests for the current period (Today / This Week) for a user.
 * 
 * @param {string} userId - The user's ID
 * @param {object} [tx] - Optional Prisma transaction delegate
 * @returns {Promise<Array>} - List of all active UserQuest records
 */
async function ensureActiveQuests(userId, tx = null) {
  const client = tx || prisma;
  const now = new Date();

  // UTC midnight for today
  const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  // Sunday 23:59:59.999 UTC for this week
  const currentDayOfWeek = now.getUTCDay(); // 0 is Sunday, 1 is Monday...
  const daysUntilSunday = (7 - currentDayOfWeek) % 7;
  const endOfWeek = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysUntilSunday,
    23, 59, 59, 999
  ));

  try {
    // Fetch active UserQuest assignments
    const activeUserQuests = await client.userQuest.findMany({
      where: {
        userId,
        expiresAt: {
          gt: now
        }
      }
    });

    const activeQuestIds = new Set(activeUserQuests.map(uq => uq.questId));
    const createdQuests = [];

    // Check each static quest definition
    for (const q of STATIC_QUESTS) {
      if (activeQuestIds.has(q.id)) continue; // Already active

      const expiresAt = q.category === 'DAILY' ? endOfToday : endOfWeek;

      const newUq = await client.userQuest.create({
        data: {
          userId,
          questId: q.id,
          expiresAt,
          progress: 0,
          completed: false,
          claimed: false
        },
        include: {
          quest: true
        }
      });
      createdQuests.push(newUq);
    }

    // Return current list of all active quests
    const finalActive = await client.userQuest.findMany({
      where: {
        userId,
        expiresAt: {
          gt: now
        }
      },
      include: {
        quest: true
      }
    });

    return finalActive;
  } catch (error) {
    console.error(`Error ensuring quests for user ${userId}:`, error);
    return [];
  }
}

/**
 * Increment progress for matching active user quests.
 * 
 * @param {string} userId - The user's ID
 * @param {string} action - The action type (e.g. "play_duel")
 * @param {number} amount - The progress increment amount
 * @param {object} [tx] - Optional Prisma transaction delegate
 * @param {object} [io] - Optional Socket.io server instance
 */
async function updateQuestProgress(userId, action, amount, tx = null, io = null) {
  const client = tx || prisma;
  const now = new Date();
  
  try {
    // 1. Ensure user has active quests initialized
    await ensureActiveQuests(userId, client);

    // 2. Fetch active, uncompleted user quests matching the action type
    const activeMatchingQuests = await client.userQuest.findMany({
      where: {
        userId,
        completed: false,
        expiresAt: {
          gt: now
        },
        quest: {
          type: action
        }
      },
      include: {
        quest: true
      }
    });

    for (const uq of activeMatchingQuests) {
      const target = uq.quest.target;
      const currentProgress = uq.progress;
      const newProgress = Math.min(currentProgress + amount, target);
      const isCompleted = newProgress >= target;

      await client.userQuest.update({
        where: { id: uq.id },
        data: {
          progress: newProgress,
          completed: isCompleted,
          completedAt: isCompleted ? now : null
        }
      });

      if (isCompleted && io) {
        // Broadcast quest completed toast trigger
        io.to(`user:${userId}`).emit('quest_completed', {
          userQuestId: uq.id,
          quest: uq.quest
        });
      }
    }
  } catch (error) {
    console.error(`Error updating quest progress for user ${userId} on ${action}:`, error);
  }
}

module.exports = {
  seedQuests,
  ensureActiveQuests,
  updateQuestProgress,
  STATIC_QUESTS
};
