import 'dotenv/config'
import prisma from '../src/lib/prisma'

async function main() {
  console.log('Connecting to database and setting up Concept & MindMap tables...')

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ChapterMindMap" (
      "id" SERIAL PRIMARY KEY,
      "chapterId" INTEGER UNIQUE NOT NULL REFERENCES "Chapter"("id") ON DELETE CASCADE,
      "treeData" JSONB NOT NULL,
      "rawKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "lastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)
  console.log('✅ Created ChapterMindMap table')

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ChapterConcept" (
      "id" SERIAL PRIMARY KEY,
      "chapterId" INTEGER NOT NULL REFERENCES "Chapter"("id") ON DELETE CASCADE,
      "term" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "subCategory" TEXT,
      "definition" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "examTraps" TEXT,
      "relatedTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "order" INTEGER NOT NULL DEFAULT 0,
      "isPublished" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ChapterConcept_chapterId_slug_key" UNIQUE ("chapterId", "slug")
    );
  `)
  console.log('✅ Created ChapterConcept table')

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ChapterConcept_chapterId_idx" ON "ChapterConcept"("chapterId");
    CREATE INDEX IF NOT EXISTS "ChapterConcept_category_idx" ON "ChapterConcept"("category");
  `)
  console.log('✅ Created ChapterConcept indices')

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_ChapterConceptToQuestion" (
      "A" INTEGER NOT NULL REFERENCES "ChapterConcept"("id") ON DELETE CASCADE,
      "B" INTEGER NOT NULL REFERENCES "Question"("id") ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "_ChapterConceptToQuestion_AB_unique" ON "_ChapterConceptToQuestion"("A", "B");
    CREATE INDEX IF NOT EXISTS "_ChapterConceptToQuestion_B_index" ON "_ChapterConceptToQuestion"("B");
  `)
  console.log('✅ Created _ChapterConceptToQuestion relation table')

  console.log('🎉 All tables and indexes successfully prepared!')
}

main()
  .catch((e) => {
    console.error('Error creating tables:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
