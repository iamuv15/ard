const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

async function run() {
  let connectionString = process.env.DATABASE_URL || '';
  if (connectionString.includes('sslmode=require') && !connectionString.includes('uselibpqcompat')) {
    connectionString += (connectionString.includes('?') ? '&' : '?') + 'uselibpqcompat=true';
  }

  const adapter = new PrismaPg({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  const prisma = new PrismaClient({ adapter });

  console.log('Creating QuestionReport table in Supabase PostgreSQL...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "QuestionReport" (
      "id" SERIAL PRIMARY KEY,
      "questionId" INTEGER NOT NULL REFERENCES "Question"("id") ON DELETE CASCADE,
      "reportedByUserId" INTEGER REFERENCES "User"("id") ON DELETE SET NULL,
      "reason" TEXT NOT NULL,
      "userNote" TEXT,
      "status" TEXT NOT NULL DEFAULT 'PENDING_AI',
      "aiConfidence" TEXT,
      "aiReasoning" TEXT,
      "previousAnswer" TEXT,
      "suggestedAnswer" TEXT,
      "suggestedExplanation" TEXT,
      "resolvedAt" TIMESTAMP(3),
      "resolvedByAdmin" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "QuestionReport_questionId_idx" ON "QuestionReport"("questionId");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "QuestionReport_status_idx" ON "QuestionReport"("status");
  `);
  
  console.log('SUCCESS: QuestionReport table created or verified');
  const count = await prisma.questionReport.count();
  console.log('Existing QuestionReports count:', count);
  await prisma.$disconnect();
}

run().catch(err => {
  console.error('Error during migration:', err);
  process.exit(1);
});
