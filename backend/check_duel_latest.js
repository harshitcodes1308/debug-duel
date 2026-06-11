const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const duel = await prisma.duel.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { participants: true }
  });
  console.log(JSON.stringify(duel, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
