import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { config } from 'dotenv';
config();

const url = process.env.DATABASE_URL || 'file:./dev.db';
const adapter = new PrismaLibSql({ url });
const prisma = new PrismaClient({ adapter });

async function main() {
  const chapters = await prisma.chapter.findMany();
  console.log('Chapters:', chapters.map(c => ({ id: c.id, name: c.name })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
