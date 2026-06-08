const { getOrCreateActiveSeason } = require('./season');

const TIERS = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster"];
const DIVISIONS = ["III", "II", "I"];

/**
 * Calculates the Rank Tier, Division, and formatted Label from Rank Points (RP).
 * @param {number} rp - The player's current Rank Points.
 * @returns {{tier: string, division: string, label: string}}
 */
function getRankFromPoints(rp) {
  if (rp >= 2000) return { tier: "Grandmaster", division: "", label: "Grandmaster" };
  if (rp >= 1500) return { tier: "Master", division: "", label: "Master" };
  
  const tierIndex = Math.floor(rp / 300); // 300 RP per tier (3 divisions * 100 RP)
  const tier = TIERS[Math.min(tierIndex, 4)]; // Clamp to Diamond (index 4)
  
  const divisionIndex = Math.floor((rp % 300) / 100); // 0, 1, 2
  const division = DIVISIONS[Math.min(divisionIndex, 2)];
  
  return {
    tier,
    division,
    label: `${tier} ${division}`
  };
}

/**
 * Calculates ELO rating change for a match.
 * @param {number} playerElo - ELO rating of the player.
 * @param {number} opponentElo - ELO rating of the opponent.
 * @param {boolean} isWinner - Whether this player won.
 * @param {boolean} isDraw - Whether the match ended in a draw.
 * @returns {number} The change in ELO (can be positive or negative).
 */
function calculateEloChange(playerElo, opponentElo, isWinner, isDraw) {
  const K = 32;
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const outcome = isDraw ? 0.5 : (isWinner ? 1 : 0);
  return Math.round(K * (outcome - expected));
}

/**
 * Calculates Rank Points (RP) change for a match.
 * @param {number} playerElo - ELO rating of the player.
 * @param {number} opponentElo - ELO rating of the opponent.
 * @param {boolean} isWinner - Whether this player won.
 * @param {boolean} isDraw - Whether the match ended in a draw.
 * @returns {number} The change in RP (positive or negative).
 */
function calculateRpChange(playerElo, opponentElo, isWinner, isDraw) {
  if (isDraw) return 0;
  
  if (isWinner) {
    // Base 25 RP. Modify by ELO gap
    const eloDifference = opponentElo - playerElo;
    const adjustment = Math.max(-10, Math.min(15, Math.round(eloDifference / 20)));
    return 25 + adjustment;
  } else {
    // Loss: Base -15 RP. Modify by ELO gap
    const eloDifference = playerElo - opponentElo;
    const adjustment = Math.max(-5, Math.min(10, Math.round(eloDifference / 20)));
    return -(15 + adjustment);
  }
}

/**
 * Resolves a ranked match by updating DB models atomically within an active Prisma transaction.
 */
async function resolveRankedMatch(seasonId, p1Id, p2Id, winnerId, isDraw, tx) {
  const [p1, p2] = await Promise.all([
    tx.user.findUnique({ where: { id: p1Id } }),
    tx.user.findUnique({ where: { id: p2Id } })
  ]);

  if (!p1 || !p2) {
    throw new Error("Match players not found in database");
  }

  // Calculate ELO changes
  const eloP1 = p1.rankedElo || 1000;
  const eloP2 = p2.rankedElo || 1000;

  const change1 = calculateEloChange(eloP1, eloP2, winnerId === p1Id, isDraw);
  const change2 = calculateEloChange(eloP2, eloP1, winnerId === p2Id, isDraw);

  // Calculate RP changes
  const rpChange1 = calculateRpChange(eloP1, eloP2, winnerId === p1Id, isDraw);
  const rpChange2 = calculateRpChange(eloP2, eloP1, winnerId === p2Id, isDraw);

  // New RP values
  const newRp1 = Math.max(0, (p1.rankPoints || 0) + rpChange1);
  const newRp2 = Math.max(0, (p2.rankPoints || 0) + rpChange2);

  // New rank details
  const rank1 = getRankFromPoints(newRp1);
  const rank2 = getRankFromPoints(newRp2);

  // Peak RP & rank details
  const peakRp1 = Math.max(p1.rankPoints || 0, newRp1);
  const peakRp2 = Math.max(p2.rankPoints || 0, newRp2);

  const peakRank1 = getRankFromPoints(peakRp1).label;
  const peakRank2 = getRankFromPoints(peakRp2).label;

  // Update user records in DB
  await Promise.all([
    tx.user.update({
      where: { id: p1Id },
      data: {
        rankedElo: { increment: change1 },
        rankPoints: newRp1,
        currentRank: rank1.label,
        peakRank: peakRank1,
        rankedWins: { increment: (!isDraw && winnerId === p1Id) ? 1 : 0 },
        rankedLosses: { increment: (!isDraw && winnerId !== p1Id) ? 1 : 0 },
        rankedMatches: { increment: 1 }
      }
    }),
    tx.user.update({
      where: { id: p2Id },
      data: {
        rankedElo: { increment: change2 },
        rankPoints: newRp2,
        currentRank: rank2.label,
        peakRank: peakRank2,
        rankedWins: { increment: (!isDraw && winnerId === p2Id) ? 1 : 0 },
        rankedLosses: { increment: (!isDraw && winnerId !== p2Id) ? 1 : 0 },
        rankedMatches: { increment: 1 }
      }
    })
  ]);

  // Upsert SeasonParticipant records
  await Promise.all([
    tx.seasonParticipant.upsert({
      where: { seasonId_userId: { seasonId, userId: p1Id } },
      create: {
        seasonId,
        userId: p1Id,
        currentRank: rank1.label,
        rankPoints: newRp1,
        peakRank: peakRank1,
        wins: (!isDraw && winnerId === p1Id) ? 1 : 0,
        losses: (!isDraw && winnerId !== p1Id) ? 1 : 0,
        matchesPlayed: 1
      },
      update: {
        currentRank: rank1.label,
        rankPoints: newRp1,
        peakRank: peakRank1,
        wins: { increment: (!isDraw && winnerId === p1Id) ? 1 : 0 },
        losses: { increment: (!isDraw && winnerId !== p1Id) ? 1 : 0 },
        matchesPlayed: { increment: 1 }
      }
    }),
    tx.seasonParticipant.upsert({
      where: { seasonId_userId: { seasonId, userId: p2Id } },
      create: {
        seasonId,
        userId: p2Id,
        currentRank: rank2.label,
        rankPoints: newRp2,
        peakRank: peakRank2,
        wins: (!isDraw && winnerId === p2Id) ? 1 : 0,
        losses: (!isDraw && winnerId !== p2Id) ? 1 : 0,
        matchesPlayed: 1
      },
      update: {
        currentRank: rank2.label,
        rankPoints: newRp2,
        peakRank: peakRank2,
        wins: { increment: (!isDraw && winnerId === p2Id) ? 1 : 0 },
        losses: { increment: (!isDraw && winnerId !== p2Id) ? 1 : 0 },
        matchesPlayed: { increment: 1 }
      }
    })
  ]);

  return {
    eloChanges: { [p1Id]: change1, [p2Id]: change2 },
    rpChanges: { [p1Id]: rpChange1, [p2Id]: rpChange2 },
    newRanks: { [p1Id]: rank1.label, [p2Id]: rank2.label }
  };
}

module.exports = {
  getRankFromPoints,
  calculateEloChange,
  calculateRpChange,
  resolveRankedMatch
};
