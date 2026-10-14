import 'dotenv/config'
import prisma from '../src/lib/prisma'

async function run() {
  console.log('⚡ Applying SQL Schema migrations via PrismaPg adapter...')

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "isMined" BOOLEAN NOT NULL DEFAULT false;
  `)
  console.log('✅ Question.isMined added.')

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ChapterConcept" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ChapterConcept" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT;
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ChapterConcept" ADD COLUMN IF NOT EXISTS "imageCaption" TEXT;
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ChapterConcept" ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT;
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ChapterConcept" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;
  `)
  console.log('✅ ChapterConcept media columns added (imageUrl, thumbnailUrl, imageCaption, sourceUrl, videoUrl).')

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ConceptMediaReport" (
      "id" SERIAL PRIMARY KEY,
      "conceptId" INTEGER NOT NULL REFERENCES "ChapterConcept"("id") ON DELETE CASCADE,
      "reportedByUserId" INTEGER REFERENCES "User"("id") ON DELETE SET NULL,
      "mediaType" TEXT NOT NULL,
      "reason" TEXT NOT NULL,
      "userNote" TEXT,
      "flaggedUrl" TEXT,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ConceptMediaReport_conceptId_idx" ON "ConceptMediaReport"("conceptId");
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ConceptMediaReport" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);
  `)
  console.log('✅ ConceptMediaReport table, columns, and indexes created.')

  // Lock Chapter 10's 612 questions as already mined!
  const updateRes = await prisma.$executeRawUnsafe(`
    UPDATE "Question"
    SET "isMined" = true
    WHERE "quizId" IN (SELECT "id" FROM "Quiz" WHERE "chapterId" = 10);
  `)
  console.log(`🔒 Locked ${updateRes} existing questions for Chapter 10 (Animal Husbandry) as isMined = true.`)

  const countMined = await prisma.question.count({
    where: { quiz: { chapterId: 10 }, isMined: true }
  })
  const total = await prisma.question.count({
    where: { quiz: { chapterId: 10 } }
  })
  console.log(`📊 Chapter 10 Status: ${countMined} / ${total} questions mined & locked in database.`)
}

run()
  .catch(err => {
    console.error('❌ DDL error:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
