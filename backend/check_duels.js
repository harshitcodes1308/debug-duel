const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const duels = await prisma.duel.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { participants: true }
  });
  console.log(JSON.stringify(duels, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
