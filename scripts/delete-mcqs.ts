import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

async function main() {
  const url = process.env.DATABASE_URL || 'file:./dev.db';
  const adapter = new PrismaLibSql({ url });
  const prisma = new PrismaClient({ adapter });

  const quizzesToDelete = [
    'Terminology of Agriculture Quiz',
    'Crop Classification Quiz',
    'Sowing Methods Quiz',
    'Germination Quiz',
    'Intercultural Operations Quiz',
    'Agronomy Quiz',
    'Field Crops Quiz',
    'Weed Science Quiz'
  ];

  console.log('Starting deletion of newly added quizzes...');

  for (const quizName of quizzesToDelete) {
    try {
      const deleted = await prisma.quiz.deleteMany({
        where: { name: quizName }
      });
      console.log(`Deleted ${deleted.count} quizzes named: ${quizName}`);
    } catch (error: any) {
      console.log(`Error deleting quiz "${quizName}": ${error.message}`);
    }
  }
  
  // Clean up empty chapters
  const allChapters = await prisma.chapter.findMany({
    include: { quizzes: true }
  });
  
  for (const ch of allChapters) {
    if (ch.quizzes.length === 0) {
      await prisma.chapter.delete({ where: { id: ch.id } });
      console.log(`Deleted empty chapter: ${ch.name}`);
    }
  }

  console.log('Deletion completed.');
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
