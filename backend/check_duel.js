const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const duelId = 'cmq9hr16k0002qblpq103iea';
  const duel = await prisma.duel.findUnique({
    where: { id: duelId },
    include: { participants: true }
  });
  console.log(JSON.stringify(duel, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
