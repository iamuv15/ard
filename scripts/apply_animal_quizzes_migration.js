const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const FINAL_FILE = path.join(__dirname, '..', 'checkpoints', 'animal_classification_final.json');
const CHECKPOINT_FILE = path.join(__dirname, '..', 'checkpoints', 'animal_classification_checkpoint.json');

const TOPICS_CONFIG = [
  { num: 1, name: "Animal Terminology & Livestock Breeds" },
  { num: 2, name: "Anatomy, Digestive Physiology & Dentition" },
  { num: 3, name: "Feeds, Fodder & Animal Nutrition" },
  { num: 4, name: "Animal Genetics, Breeding & Reproduction" },
  { num: 5, name: "Dairy Science, Milk Processing & Housing" },
  { num: 6, name: "Animal Diseases, Vaccination & Healthcare" },
  { num: 7, name: "Poultry Science & Swine Management" }
];

const DIFFICULTY_MAP = [
  { level: 1, code: "EASY", label: "Level 1 (Easy)" },
  { level: 2, code: "MEDIUM", label: "Level 2 (Medium)" },
  { level: 3, code: "HARD", label: "Level 3 (Hard)" }
];

async function run() {
  console.log("==================================================");
  console.log("🚀 MIGRATING CHAPTER 10 (ANIMAL HUSBANDRY) QUIZZES");
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
    // 1. Fetch existing quizzes in Chapter 10
    const existingQuizzes = await prisma.quiz.findMany({
      where: { chapterId: 10 }
    });
    console.log(`Current quizzes in Chapter 10: ${existingQuizzes.length}`);

    // 2. Create or map the 21 new Structured Quizzes
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
              chapterId: 10,
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

    // 3. Batch reassign questions to their new target quizzes in chunks
    console.log(`\nReassigning ${classifiedCount} questions in Postgres in parallel chunks of 40...`);
    const questionEntries = Object.entries(classification);
    const CHUNK_SIZE = 40;
    let updatedCount = 0;

    for (let i = 0; i < questionEntries.length; i += CHUNK_SIZE) {
      const chunk = questionEntries.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map(async ([qIdStr, info]) => {
        const qId = parseInt(qIdStr, 10);
        const targetQuiz = quizMap[`${info.topic}_${info.difficulty}`];
        if (!targetQuiz) {
          console.warn(`⚠️ Warning: No quiz found for ${info.topic} + ${info.difficulty}`);
          return;
        }

        await prisma.question.update({
          where: { id: qId },
          data: {
            quizId: targetQuiz.id,
            topic: info.topic,
            difficulty: info.difficulty
          }
        });
      }));

      updatedCount += chunk.length;
      process.stdout.write(`\r  Updated ${updatedCount}/${questionEntries.length} questions...`);
    }
    console.log("\n✅ All questions successfully assigned to structured quizzes!");

    // 4. Verify distribution
    console.log("\nVerifying quiz question counts:");
    const updatedQuizzes = await prisma.quiz.findMany({
      where: { chapterId: 10 },
      include: { _count: { select: { questions: true } } },
      orderBy: { order: 'asc' }
    });

    let legacyToDelete = [];
    for (const q of updatedQuizzes) {
      if (q.topic) {
        console.log(`  [Order ${q.order}] ${q.name}: ${q._count.questions} questions`);
      } else {
        if (q._count.questions === 0) {
          legacyToDelete.push(q);
        } else {
          console.log(`  ⚠️ Legacy Quiz with remaining questions: ${q.name} (${q._count.questions} Qs)`);
        }
      }
    }

    // 5. Clean up empty legacy quizzes
    if (legacyToDelete.length > 0) {
      console.log(`\nPruning ${legacyToDelete.length} empty legacy quizzes...`);
      for (const lq of legacyToDelete) {
        await prisma.quiz.delete({ where: { id: lq.id } });
        console.log(`  🗑️ Deleted empty quiz: [${lq.id}] ${lq.name}`);
      }
    }

    console.log("\n🎉 CHAPTER 10 (ANIMAL HUSBANDRY) MIGRATION COMPLETE!");

  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
