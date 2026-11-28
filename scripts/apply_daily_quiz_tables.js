const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const rawUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const sessionUrl = rawUrl.replace(':6543/', ':5432/');
const adapter = new PrismaPg({ connectionString: sessionUrl, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('1. Adding User.supabaseUserId column & unique index...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE public."User"
    ADD COLUMN IF NOT EXISTS "supabaseUserId" TEXT;
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "User_supabaseUserId_key"
    ON public."User"("supabaseUserId");
  `);

  console.log('2. Creating QuestionAttemptLog table...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public."QuestionAttemptLog" (
      "id" SERIAL PRIMARY KEY,
      "userId" INTEGER NOT NULL REFERENCES public."User"("id") ON DELETE CASCADE,
      "questionId" INTEGER NOT NULL REFERENCES public."Question"("id") ON DELETE CASCADE,
      "chapterId" INTEGER NOT NULL REFERENCES public."Chapter"("id") ON DELETE CASCADE,
      "isCorrect" BOOLEAN NOT NULL,
      "sourceType" TEXT NOT NULL DEFAULT 'PRACTICE',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "QuestionAttemptLog_userId_createdAt_idx"
    ON public."QuestionAttemptLog"("userId", "createdAt");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "QuestionAttemptLog_userId_chapterId_createdAt_idx"
    ON public."QuestionAttemptLog"("userId", "chapterId", "createdAt");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "QuestionAttemptLog_userId_questionId_idx"
    ON public."QuestionAttemptLog"("userId", "questionId");
  `);

  console.log('3. Creating DailyRetentionQuiz table...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public."DailyRetentionQuiz" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "userId" INTEGER NOT NULL REFERENCES public."User"("id") ON DELETE CASCADE,
      "periodKey" TEXT NOT NULL,
      "quizType" TEXT NOT NULL DEFAULT 'daily',
      "status" TEXT NOT NULL DEFAULT 'generating',
      "generationStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "focusChapters" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      "totalQuestions" INTEGER NOT NULL DEFAULT 20,
      "currentIndex" INTEGER NOT NULL DEFAULT 0,
      "score" INTEGER,
      "completedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE public."DailyRetentionQuiz"
    ADD COLUMN IF NOT EXISTS "quizType" TEXT NOT NULL DEFAULT 'daily';
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "DailyRetentionQuiz_userId_periodKey_key"
    ON public."DailyRetentionQuiz"("userId", "periodKey");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "DailyRetentionQuiz_userId_periodKey_idx"
    ON public."DailyRetentionQuiz"("userId", "periodKey");
  `);

  console.log('4. Creating DailyRetentionQuestion table...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public."DailyRetentionQuestion" (
      "id" SERIAL PRIMARY KEY,
      "dailyQuizId" UUID NOT NULL REFERENCES public."DailyRetentionQuiz"("id") ON DELETE CASCADE,
      "orderIndex" INTEGER NOT NULL,
      "questionId" INTEGER REFERENCES public."Question"("id") ON DELETE SET NULL,
      "chapterId" INTEGER,
      "chapterName" TEXT,
      "sourceBucket" TEXT NOT NULL,
      "snapshotJson" JSONB,
      "selectedOption" TEXT,
      "isCorrect" BOOLEAN,
      "isFlagged" BOOLEAN NOT NULL DEFAULT false,
      "answeredAt" TIMESTAMP(3)
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "DailyRetentionQuestion_dailyQuizId_orderIndex_key"
    ON public."DailyRetentionQuestion"("dailyQuizId", "orderIndex");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "DailyRetentionQuestion_dailyQuizId_idx"
    ON public."DailyRetentionQuestion"("dailyQuizId");
  `);

  console.log('✅ All Daily Retention Quiz tables & indexes created safely!');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Migration error:', err);
  process.exit(1);
});
