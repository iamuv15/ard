const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
require('dotenv').config();

async function main() {
  const url = process.env.DATABASE_URL || "file:./dev.db";
  const adapter = new PrismaLibSql({ url });
  const prisma = new PrismaClient({ adapter });

  const chapters = await prisma.chapter.findMany({ include: { _count: true } });
  console.log(JSON.stringify(chapters, null, 2));
  
  await prisma.$disconnect();
}
main().catch(console.error);
