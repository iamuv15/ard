import prisma from './src/lib/prisma'
async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Quiz" ADD COLUMN "cohort" TEXT NOT NULL DEFAULT 'BETA';`);
    console.log('Added cohort column to Quiz table.');
  } catch (e: any) {
    console.log('Column might already exist:', e.message);
  }
  await prisma.quiz.updateMany({ data: { cohort: 'ALPHA' } });
  console.log('Updated all quizzes to ALPHA');
}
main().catch(console.error).finally(() => prisma.$disconnect());
