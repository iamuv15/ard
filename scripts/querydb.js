const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

async function main() {
  const url = process.env.DATABASE_URL;
  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  const chapters = await prisma.chapter.findMany({ include: { _count: true } });
  console.log(JSON.stringify(chapters, null, 2));
  
  await prisma.$disconnect();
}
main().catch(console.error);
