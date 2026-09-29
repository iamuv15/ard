import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
config();

const url = process.env.DATABASE_URL || 'file:./dev.db';
const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

async function main() {
  const chapters = await prisma.chapter.findMany();
  console.log('Chapters:', chapters.map((c: any) => ({ id: c.id, name: c.name })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
