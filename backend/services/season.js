const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Gets the current active season, or creates one if none exists.
 * @returns {Promise<any>}
 */
async function getOrCreateActiveSeason() {
  let activeSeason = await prisma.season.findFirst({
    where: { isActive: true }
  });

  if (!activeSeason) {
    // Dynamically seed Season 1
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 30); // 30 days duration

    activeSeason = await prisma.season.create({
      data: {
        name: "Season 1",
        startDate,
        endDate,
        isActive: true
      }
    });
    console.log("Dynamically seeded active Season 1");
  }

  return activeSeason;
}

/**
 * Returns a human-readable countdown string for the season end.
 * @param {any} season - The season object.
 * @returns {string}
 */
function getSeasonCountdown(season) {
  if (!season) return "No active season";
  
  const now = new Date();
  const end = new Date(season.endDate);
  const diffMs = end - now;
  
  if (diffMs <= 0) {
    return "Season ended";
  }
  
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays >= 1) {
    return `Ends in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  }
  
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours >= 1) {
    return `Ends in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  }
  
  const diffMins = Math.floor(diffMs / (1000 * 60));
  return `Ends in ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
}

module.exports = {
  getOrCreateActiveSeason,
  getSeasonCountdown
};
