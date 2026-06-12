const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getOrCreateActiveSeason, getSeasonCountdown } = require('../services/season');
const { getRankFromPoints } = require('../services/rank');
const { requireAuth } = require('../middleware/auth');

// 1. Get Active Season Info & Countdown
router.get('/active', async (req, res) => {
  try {
    const season = await getOrCreateActiveSeason();
    const countdown = getSeasonCountdown(season);
    res.json({
      id: season.id,
      name: season.name,
      startDate: season.startDate,
      endDate: season.endDate,
      isActive: season.isActive,
      countdown
    });
  } catch (error) {
    console.error("Error fetching active season:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 2. Get Seasonal Statistics for a User
router.get('/stats/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const activeSeason = await getOrCreateActiveSeason();

    // Find participant record for this user in the active season
    let participant = await prisma.seasonParticipant.findUnique({
      where: {
        seasonId_userId: {
          seasonId: activeSeason.id,
          userId: user.id
        }
      }
    });

    // If no participant record, they haven't played ranked this season
    if (!participant) {
      participant = {
        currentRank: "Bronze III",
        rankPoints: 0,
        peakRank: "Bronze III",
        wins: 0,
        losses: 0,
        matchesPlayed: 0
      };
    }

    const winRate = participant.matchesPlayed > 0 
      ? Math.round((participant.wins / participant.matchesPlayed) * 100)
      : 0;

    res.json({
      seasonName: activeSeason.name,
      currentRank: participant.currentRank,
      rankPoints: participant.rankPoints,
      peakRank: participant.peakRank,
      wins: participant.wins,
      losses: participant.losses,
      matchesPlayed: participant.matchesPlayed,
      winRate,
      overallElo: user.rankedElo || 1000
    });
  } catch (error) {
    console.error("Error fetching season stats:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 3. Get Global Ranked Leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const activeSeason = await getOrCreateActiveSeason();

    const participants = await prisma.seasonParticipant.findMany({
      where: { seasonId: activeSeason.id },
      include: {
        user: {
          select: { username: true }
        }
      },
      orderBy: { rankPoints: 'desc' },
      take: 50
    });

    const leaderboard = participants.map((p, idx) => ({
      rank: idx + 1,
      userId: p.userId,
      username: p.user.username,
      tier: p.currentRank,
      rp: p.rankPoints,
      wins: p.wins,
      losses: p.losses,
      matchesPlayed: p.matchesPlayed,
      winRate: p.matchesPlayed > 0 ? Math.round((p.wins / p.matchesPlayed) * 100) : 0
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error("Error fetching seasonal leaderboard:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 4. Get Friends Ranked Leaderboard
router.get('/leaderboard/friends', requireAuth, async (req, res) => {
  // Use JWT-authenticated userId, do NOT trust client query param
  const userId = req.userId;

  try {
    const activeSeason = await getOrCreateActiveSeason();

    // Fetch user's friends
    const friendships = await prisma.friendship.findMany({
      where: { userId },
      select: { friendId: true }
    });

    const friendIds = friendships.map(f => f.friendId);
    friendIds.push(userId); // Include user themselves

    const participants = await prisma.seasonParticipant.findMany({
      where: {
        seasonId: activeSeason.id,
        userId: { in: friendIds }
      },
      include: {
        user: {
          select: { username: true }
        }
      },
      orderBy: { rankPoints: 'desc' }
    });

    const leaderboard = participants.map((p, idx) => ({
      rank: idx + 1,
      userId: p.userId,
      username: p.user.username,
      tier: p.currentRank,
      rp: p.rankPoints,
      wins: p.wins,
      losses: p.losses,
      matchesPlayed: p.matchesPlayed,
      winRate: p.matchesPlayed > 0 ? Math.round((p.wins / p.matchesPlayed) * 100) : 0
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error("Error fetching friends seasonal leaderboard:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 5. Get User's Prestige Rewards
router.get('/rewards/my', requireAuth, async (req, res) => {
  // Use JWT-authenticated userId, do NOT trust client query param
  const userId = req.userId;

  try {
    // Find all claims for this user across all seasons
    const claims = await prisma.seasonRewardClaim.findMany({
      where: {
        participant: { userId }
      },
      include: {
        reward: {
          include: { season: true }
        }
      }
    });

    const rewards = claims.map(c => ({
      claimId: c.id,
      seasonName: c.reward.season.name,
      rewardType: c.reward.rewardType,
      rewardName: c.reward.rewardName,
      rewardValue: c.reward.rewardValue,
      claimedAt: c.claimedAt
    }));

    res.json(rewards);
  } catch (error) {
    console.error("Error fetching user rewards:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 5.1. Get Seasonal History for a User
router.get('/history/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const history = await prisma.seasonParticipant.findMany({
      where: {
        userId: user.id,
        season: {
          isActive: false
        }
      },
      include: {
        season: {
          select: {
            name: true,
            startDate: true,
            endDate: true
          }
        }
      },
      orderBy: {
        season: {
          startDate: 'desc'
        }
      }
    });

    const formattedHistory = history.map(h => {
      const total = h.wins + h.losses;
      const winRate = total > 0 ? Math.round((h.wins / total) * 100) : 0;
      return {
        id: h.id,
        seasonName: h.season.name,
        startDate: h.season.startDate,
        endDate: h.season.endDate,
        finalRank: h.currentRank,
        peakRank: h.peakRank,
        finalRp: h.rankPoints,
        wins: h.wins,
        losses: h.losses,
        matchesPlayed: h.matchesPlayed,
        winRate,
        placement: h.placement
      };
    });

    res.json(formattedHistory);
  } catch (error) {
    console.error("Error fetching season history:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Soft reset RP calculations based on ending rank
function calculateSoftResetRp(oldRp) {
  if (oldRp >= 2000) return 1500; // Grandmaster -> Master
  if (oldRp >= 1500) return 1200; // Master -> Diamond III
  if (oldRp >= 1200) return 900;  // Diamond -> Platinum III
  if (oldRp >= 900)  return 600;  // Platinum -> Gold III
  if (oldRp >= 600)  return 300;  // Gold -> Silver III
  return 0;                       // Silver, Bronze -> Bronze III
}

// 6. Developer End Season and Distribute Rewards
// Protected by a static admin secret to prevent abuse from regular users
router.post('/dev-end', async (req, res) => {
  const adminSecret = req.headers['x-admin-secret'];
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden: admin access required' });
  }
  try {
    // 1. Get current active season
    const activeSeason = await prisma.season.findFirst({
      where: { isActive: true }
    });

    if (!activeSeason) {
      return res.status(400).json({ error: "No active season to end" });
    }

    // 2. Query all participants of this season sorted by RP
    const participants = await prisma.seasonParticipant.findMany({
      where: { seasonId: activeSeason.id },
      orderBy: { rankPoints: 'desc' }
    });

    console.log(`[Season Reset] Ending ${activeSeason.name} with ${participants.length} participants.`);

    let claimsAwarded = 0;
    let endedSeasonName = activeSeason.name;
    let newSeasonName = '';

    await prisma.$transaction(async (tx) => {
      // 1. Create Prestige Rewards configuration for this season inside transaction
      const rewardsToCreate = [
        { rewardType: 'TITLE', rewardName: `${activeSeason.name} Grand Champion`, rewardValue: `title_${activeSeason.id}_champ`, specificPlacement: 1 },
        { rewardType: 'TITLE', rewardName: `${activeSeason.name} Top 3 Podium`, rewardValue: `title_${activeSeason.id}_podium`, specificPlacement: 3 },
        { rewardType: 'BADGE', rewardName: `${activeSeason.name} Elite Rank #1`, rewardValue: `badge_${activeSeason.id}_rank1`, specificPlacement: 1 },
        { rewardType: 'BADGE', rewardName: `${activeSeason.name} Top 10 Finisher`, rewardValue: `badge_${activeSeason.id}_top10`, specificPlacement: 10 },
        { rewardType: 'BADGE', rewardName: `${activeSeason.name} Top 50 Challenger`, rewardValue: `badge_${activeSeason.id}_top50`, specificPlacement: 50 },
        { rewardType: 'BADGE', rewardName: `${activeSeason.name} Top 100 Competitor`, rewardValue: `badge_${activeSeason.id}_top100`, specificPlacement: 100 },
        { rewardType: 'BADGE', rewardName: `${activeSeason.name} Veteran Badge`, rewardValue: `badge_${activeSeason.id}_veteran`, minRankName: 'Master' },
        { rewardType: 'FRAME', rewardName: `${activeSeason.name} Gold Competitor Frame`, rewardValue: `frame_${activeSeason.id}_gold`, minRankName: 'Gold III' }
      ];

      const dbRewards = [];
      for (const r of rewardsToCreate) {
        const dbR = await tx.seasonReward.create({
          data: {
            seasonId: activeSeason.id,
            rewardType: r.rewardType,
            rewardName: r.rewardName,
            rewardValue: r.rewardValue,
            specificPlacement: r.specificPlacement,
            minRankName: r.minRankName
          }
        });
        dbRewards.push(dbR);
      }

      // 2. Process all participants: Placement, Rewards, and Soft Reset
      for (let idx = 0; idx < participants.length; idx++) {
        const p = participants[idx];
        const rankPos = idx + 1; // 1-indexed placement

        // Update participant's placement
        await tx.seasonParticipant.update({
          where: { id: p.id },
          data: { placement: rankPos }
        });

        // Award rewards
        for (const reward of dbRewards) {
          let qualifies = false;

          if (reward.specificPlacement) {
            if (reward.specificPlacement === 1 && rankPos === 1) qualifies = true;
            else if (reward.specificPlacement === 3 && rankPos <= 3) qualifies = true;
            else if (reward.specificPlacement === 10 && rankPos <= 10) qualifies = true;
            else if (reward.specificPlacement === 50 && rankPos <= 50) qualifies = true;
            else if (reward.specificPlacement === 100 && rankPos <= 100) qualifies = true;
          } else if (reward.minRankName) {
            const pTier = p.currentRank.split(' ')[0];
            if (reward.minRankName === 'Master' && (pTier === 'Master' || pTier === 'Grandmaster')) {
              qualifies = true;
            } else if (reward.minRankName === 'Gold III') {
              if (p.rankPoints >= 600) {
                qualifies = true;
              }
            }
          }

          if (qualifies) {
            await tx.seasonRewardClaim.create({
              data: {
                participantId: p.id,
                rewardId: reward.id
              }
            }).catch(err => {
              console.warn(`Already claimed reward:`, err.message);
            });
            claimsAwarded++;
          }
        }

        // Apply Soft Reset to User's seasonal rank/RP
        const newRp = calculateSoftResetRp(p.rankPoints);
        const newRankInfo = getRankFromPoints(newRp);

        await tx.user.update({
          where: { id: p.userId },
          data: {
            rankPoints: newRp,
            currentRank: newRankInfo.label,
            peakRank: newRankInfo.label,
            rankedWins: 0,
            rankedLosses: 0,
            rankedMatches: 0
          }
        });
      }

      // Reset users who didn't participate in this season to Bronze III
      const participantUserIds = participants.map(p => p.userId);
      await tx.user.updateMany({
        where: {
          id: { notIn: participantUserIds }
        },
        data: {
          currentRank: "Bronze III",
          rankPoints: 0,
          peakRank: "Bronze III",
          rankedWins: 0,
          rankedLosses: 0,
          rankedMatches: 0
        }
      });

      // 3. Deactivate current season
      await tx.season.update({
        where: { id: activeSeason.id },
        data: { isActive: false }
      });

      // 4. Create next season
      const nextSeasonNum = parseInt(activeSeason.name.replace("Season ", "")) + 1;
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 30); // 30 days duration

      const nextSeason = await tx.season.create({
        data: {
          name: `Season ${nextSeasonNum}`,
          startDate,
          endDate,
          isActive: true
        }
      });
      newSeasonName = nextSeason.name;
    }, { timeout: 30000 }); // Increase timeout to 30 seconds to support large transaction resets safely

    res.json({
      success: true,
      endedSeason: endedSeasonName,
      newSeason: newSeasonName,
      claimsAwarded
    });

  } catch (error) {
    console.error("Error ending season:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
