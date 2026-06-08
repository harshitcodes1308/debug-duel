require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    take: 10,
    select: {
      id: true,
      username: true,
      currentRank: true,
      rankPoints: true,
      eloJS: true
    }
  });
  console.log("Users in Database:");
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
