import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function main() {
  const chapters = await prisma.chapter.findMany({
    include: {
      quizzes: {
        include: {
          _count: { select: { questions: true } }
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  console.log(`\nChapters in Supabase (${chapters.length}):`);
  let totalQuizzes = 0;
  let totalQuestions = 0;
  for (const ch of chapters) {
    const qCount = ch.quizzes.reduce((acc, q) => acc + q._count.questions, 0);
    console.log(`\n[${ch.name}] (${ch.quizzes.length} quizzes, ${qCount} questions)`);
    for (const q of ch.quizzes) {
      totalQuizzes++;
      totalQuestions += q._count.questions;
      console.log(`  - ${q.name} (${q._count.questions} questions)`);
    }
  }

  console.log('\n-----------------------------------------');
  console.log(`TOTAL CHAPTERS: ${chapters.length}`);
  console.log(`TOTAL QUIZZES : ${totalQuizzes}`);
  console.log(`TOTAL QUESTIONS: ${totalQuestions}`);
  console.log('-----------------------------------------');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
