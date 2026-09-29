import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  const url = process.env.DATABASE_URL || 'file:./dev.db';
  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  console.log('Flushing all chapters, quizzes, and questions...');

  // Deleting all chapters will cascade and delete all associated quizzes and questions
  const deletedChapters = await prisma.chapter.deleteMany({});
  
  console.log(`Successfully deleted ${deletedChapters.count} chapters and all associated quizzes/questions.`);
  
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
