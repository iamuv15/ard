require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { generateConceptCapsulesBatch } = require('../src/lib/terminologyEngine');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function run() {
  const chapterId = parseInt(process.argv[2] || '10', 10);
  console.log(`================================================================`);
  console.log(`Starting Full Grounded Regeneration for Chapter ID: ${chapterId}`);
  console.log(`Using Primary Textbook Notes (*.md) + PYQs (08_...md)`);
  console.log(`================================================================\n`);

  // 1. Fetch all concepts for this chapter from DB
  const concepts = await prisma.chapterConcept.findMany({
    where: { chapterId },
    select: { id: true, term: true, category: true, subCategory: true },
    orderBy: [{ category: 'asc' }, { term: 'asc' }]
  });

  if (concepts.length === 0) {
    console.log(`No concepts found for chapter ${chapterId}.`);
    process.exit(0);
  }

  console.log(`Found ${concepts.length} total concepts to regenerate.`);

  const BATCH_SIZE = 10;
  const totalBatches = Math.ceil(concepts.length / BATCH_SIZE);
  console.log(`Will process in ${totalBatches} batches of ${BATCH_SIZE} concepts each.`);
  console.log(`Pacing delay: 4 seconds between batches to respect free tier RPM limits.\n`);

  let successCount = 0;
  let failCount = 0;

  for (let b = 0; b < totalBatches; b++) {
    const startIdx = b * BATCH_SIZE;
    const batch = concepts.slice(startIdx, startIdx + BATCH_SIZE);

    console.log(`----------------------------------------------------------------`);
    console.log(`[Batch ${b + 1}/${totalBatches}] Processing ${batch.length} concepts (${startIdx + 1} to ${startIdx + batch.length} of ${concepts.length})`);
    console.log(`Terms: ${batch.map(c => c.term).join(', ')}`);

    try {
      const results = await generateConceptCapsulesBatch({
        chapterId,
        items: batch.map(c => ({
          keyword: c.term,
          category: c.category,
          subCategory: c.subCategory
        })),
        apiKeyOverride: process.env.GEMINI_API_KEY,
        fallbackApiKey: process.env.GEMINI_API_KEY_2
      });

      successCount += results.length;
      console.log(`[Batch ${b + 1}/${totalBatches}] SUCCESS: Updated ${results.length} capsules in DB.`);
    } catch (err) {
      failCount += batch.length;
      console.error(`[Batch ${b + 1}/${totalBatches}] FAILED:`, err.message || err);
    }

    if (b < totalBatches - 1) {
      console.log(`Waiting 4s to honor free-tier limits...\n`);
      await new Promise(r => setTimeout(r, 4000));
    }
  }

  console.log(`\n================================================================`);
  console.log(`REGENERATION COMPLETE!`);
  console.log(`Successfully Updated: ${successCount} concepts`);
  console.log(`Failed: ${failCount} concepts`);
  console.log(`================================================================`);
}

run().catch(console.error).finally(() => process.exit(0));
