import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
config();

const url = process.env.DATABASE_URL || 'file:./dev.db';
const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

async function main() {
  const originalChapterId = 25; // Soil
  const duplicateChapterId = 34; // soil

  // Update quizzes
  const updateResult = await prisma.quiz.updateMany({
    where: { chapterId: duplicateChapterId },
    data: { chapterId: originalChapterId }
  });

  console.log(`Updated ${updateResult.count} quizzes to original chapter.`);

  // Delete duplicate chapter
  await prisma.chapter.delete({
    where: { id: duplicateChapterId }
  });

  console.log('Deleted duplicate chapter.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
