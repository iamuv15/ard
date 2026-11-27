const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const FINAL_FILE = path.join(__dirname, '..', 'checkpoints', 'soil_classification_final.json');
const CHECKPOINT_FILE = path.join(__dirname, '..', 'checkpoints', 'soil_classification_checkpoint.json');

const TOPICS_CONFIG = [
  { num: 1, name: "Soil Genesis, Rocks & Weathering" },
  { num: 2, name: "Soil Physical Properties & Texture" },
  { num: 3, name: "Soil Water Dynamics & Hydrology" },
  { num: 4, name: "Soil Chemistry, Colloids & Organic Matter" },
  { num: 5, name: "Problematic Soils & Reclamation" },
  { num: 6, name: "Soil Erosion, Conservation & Watershed" },
  { num: 7, name: "Plant Nutrients, Fertilizers & Manures" }
];

const DIFFICULTY_MAP = [
  { level: 1, code: "EASY", label: "Level 1 (Easy)" },
  { level: 2, code: "MEDIUM", label: "Level 2 (Medium)" },
  { level: 3, code: "HARD", label: "Level 3 (Hard)" }
];

async function run() {
  console.log("==================================================");
  console.log("🚀 MIGRATING CHAPTER 16 (SOIL) QUIZZES IN DATABASE");
  console.log("==================================================");

  let rawFile = fs.existsSync(FINAL_FILE) ? FINAL_FILE : CHECKPOINT_FILE;
  if (!fs.existsSync(rawFile)) {
    console.error(`❌ No classification file found at: ${rawFile}`);
    process.exit(1);
  }

  const classification = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
  const classifiedCount = Object.keys(classification).length;
  console.log(`📦 Loaded ${classifiedCount} classified questions from: ${path.basename(rawFile)}`);

  let url = process.env.DATABASE_URL || '';
  if (url.includes('sslmode=require') && !url.includes('uselibpqcompat')) {
    url += (url.includes('?') ? '&' : '?') + 'uselibpqcompat=true';
  }
  const adapter = new PrismaPg({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Ensure columns exist in Postgres
    console.log("Ensuring database columns exist on Quiz and Question...");
    await prisma.$executeRawUnsafe(`ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "topic" text;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "difficulty" text;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "difficulty" text;`);
    console.log("✅ Database columns verified.");

    // 2. Fetch existing quizzes in Chapter 16
    const existingQuizzes = await prisma.quiz.findMany({
      where: { chapterId: 16 }
    });
    console.log(`Current quizzes in Chapter 16: ${existingQuizzes.length}`);

    // 3. Create or map the 21 new Structured Quizzes
    console.log("\nSetting up 21 structured topic quizzes in chronological order...");
    const quizMap = {}; // key: `${topic}_${difficulty}` => Quiz record

    let orderCounter = 1;
    for (const topic of TOPICS_CONFIG) {
      for (const diff of DIFFICULTY_MAP) {
        const quizName = `${topic.num}.${diff.level} ${topic.name} - ${diff.label}`;
        
        let quiz = existingQuizzes.find(q => q.name === quizName);
        if (!quiz) {
          quiz = await prisma.quiz.create({
            data: {
              name: quizName,
              chapterId: 16,
              cohort: 'BETA',
              order: orderCounter,
              topic: topic.name,
              difficulty: diff.code
            }
          });
          console.log(`  ➕ Created Quiz: [${quiz.id}] ${quizName} (Order: ${orderCounter})`);
        } else {
          quiz = await prisma.quiz.update({
            where: { id: quiz.id },
            data: {
              order: orderCounter,
              topic: topic.name,
              difficulty: diff.code
            }
          });
          console.log(`  🔄 Mapped Quiz: [${quiz.id}] ${quizName} (Order: ${orderCounter})`);
        }

        quizMap[`${topic.name}_${diff.code}`] = quiz;
        orderCounter++;
      }
    }

    console.log("✅ All 21 target quizzes ready in database.");

    // 4. Update questions in parallel chunks of 40 for ultra-fast execution
    console.log("\nReassigning questions to target quizzes and updating topic/difficulty in parallel...");
    const questionIds = Object.keys(classification).map(Number);
    const CHUNK_SIZE = 40;
    let updatedCount = 0;

    for (let i = 0; i < questionIds.length; i += CHUNK_SIZE) {
      const chunk = questionIds.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map(qId => {
        const entry = classification[qId];
        const targetQuiz = quizMap[`${entry.topic}_${entry.difficulty}`];
        if (!targetQuiz) return Promise.resolve();

        return prisma.question.update({
          where: { id: qId },
          data: {
            quizId: targetQuiz.id,
            topic: entry.topic,
            difficulty: entry.difficulty
          }
        });
      }));
      updatedCount += chunk.length;
      console.log(`  Updated ${updatedCount} / ${questionIds.length} questions...`);
    }

    console.log(`✅ Successfully updated all ${updatedCount} questions in database.`);

    // 5. Clean up empty legacy quizzes
    console.log("\nChecking for empty legacy quizzes in Chapter 16 to prune...");
    const remainingQuizzes = await prisma.quiz.findMany({
      where: { chapterId: 16 },
      include: { _count: { select: { questions: true } } }
    });

    let prunedCount = 0;
    for (const q of remainingQuizzes) {
      const isNewQuiz = Object.values(quizMap).some(target => target.id === q.id);
      if (!isNewQuiz && q._count.questions === 0) {
        await prisma.quiz.delete({ where: { id: q.id } });
        console.log(`  🗑️ Pruned empty legacy quiz: [${q.id}] "${q.name}"`);
        prunedCount++;
      }
    }
    console.log(`✅ Pruned ${prunedCount} empty legacy quizzes.`);

    // 6. Print final breakdown
    console.log("\n==================================================");
    console.log("🎉 CHAPTER 16 (SOIL) MIGRATION COMPLETE");
    console.log("==================================================");

    const finalQuizzes = await prisma.quiz.findMany({
      where: { chapterId: 16 },
      include: { _count: { select: { questions: true } } },
      orderBy: { order: 'asc' }
    });

    console.table(finalQuizzes.map(q => ({
      "Order": q.order,
      "Quiz Name": q.name,
      "Topic": q.topic,
      "Level": q.difficulty,
      "Question Count": q._count.questions
    })));

  } catch (err) {
    console.error("❌ Migration Error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
