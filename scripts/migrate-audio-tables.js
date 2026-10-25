const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

async function run() {
  console.log('Connecting to database...');
  const adapter = new PrismaPg({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  const prisma = new PrismaClient({ adapter });

  console.log('Creating ChapterAudioTrack table and altering ChapterConcept...');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ChapterAudioTrack" (
      "id" TEXT PRIMARY KEY,
      "chapterId" INTEGER NOT NULL REFERENCES "Chapter"("id") ON DELETE CASCADE,
      "subCategory" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "subtitle" TEXT,
      "audioUrl" TEXT NOT NULL,
      "storagePath" TEXT NOT NULL,
      "durationSec" DOUBLE PRECISION NOT NULL,
      "fileSizeBytes" INTEGER,
      "keywordTimestamps" JSONB NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'COMPLETED',
      "errorMessage" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ChapterAudioTrack_chapterId_idx" ON "ChapterAudioTrack"("chapterId");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ChapterAudioTrack_subCategory_idx" ON "ChapterAudioTrack"("subCategory");
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ChapterConcept" 
      ADD COLUMN IF NOT EXISTS "audioTrackId" TEXT REFERENCES "ChapterAudioTrack"("id") ON DELETE SET NULL;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ChapterConcept_audioTrackId_idx" ON "ChapterConcept"("audioTrackId");
  `);

  console.log('✅ Success! ChapterAudioTrack table and ChapterConcept relation created in Supabase Postgres.');
}

run()
  .catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
