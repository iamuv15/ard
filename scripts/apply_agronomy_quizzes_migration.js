const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const FINAL_FILE = path.join(__dirname, '..', 'checkpoints', 'agronomy_classification_final.json');

const CANONICAL_TOPICS = [
  "Agronomy Principles, Crop Classification & Plant Morphology",
  "Cereal Crops Cultivation (Rice, Wheat, Maize & Millets)",
  "Pulse & Oilseed Crops Production",
  "Commercial, Cash & Fiber Crops (Sugarcane, Cotton & Jute)",
  "Tillage Systems, Seedbed Preparation & Conservation Agriculture",
  "Weed Science, Weed Biology & Chemical Weed Control",
  "Harvesting, Post-Harvest Processing & Grain Storage Standards"
];

const DIFFICULTIES = [
  { key: 'EASY', num: 1, label: 'Easy' },
  { key: 'MEDIUM', num: 2, label: 'Medium' },
  { key: 'HARD', num: 3, label: 'Hard' }
];

async function main() {
  if (!fs.existsSync(FINAL_FILE)) {
    console.error(`❌ Final classification file not found: ${FINAL_FILE}`);
    process.exit(1);
  }

  const classified = JSON.parse(fs.readFileSync(FINAL_FILE, 'utf8'));
  console.log(`Loaded ${classified.length} classified questions for Chapter 17 (Agronomy).`);

  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const adapter = new PrismaPg({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const prisma = new PrismaClient({ adapter });

  const chapterId = 17;
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { quizzes: true }
  });

  if (!chapter) {
    console.error(`❌ Chapter ${chapterId} not found!`);
    process.exit(1);
  }

  console.log(`Chapter: ${chapter.name} | Existing Quizzes: ${chapter.quizzes.length}`);

  // Create 21 quizzes (7 topics x 3 difficulties)
  const quizMap = {};
  let orderCounter = 1;

  for (let tIdx = 0; tIdx < CANONICAL_TOPICS.length; tIdx++) {
    const topic = CANONICAL_TOPICS[tIdx];
    quizMap[topic] = {};

    for (const diff of DIFFICULTIES) {
      const quizName = `${tIdx + 1}.${diff.num} ${topic} - Level ${diff.num} (${diff.label})`;
      
      let existingQuiz = chapter.quizzes.find(q => q.topic === topic && q.difficulty === diff.key);
      if (!existingQuiz) {
        existingQuiz = chapter.quizzes.find(q => q.name === quizName);
      }

      if (existingQuiz) {
        const updated = await prisma.quiz.update({
          where: { id: existingQuiz.id },
          data: {
            name: quizName,
            topic: topic,
            difficulty: diff.key,
            order: orderCounter,
            cohort: 'BETA'
          }
        });
        quizMap[topic][diff.key] = updated.id;
        console.log(`Updated Quiz [Order ${orderCounter}]: "${quizName}" (ID: ${updated.id})`);
      } else {
        const created = await prisma.quiz.create({
          data: {
            name: quizName,
            chapterId: chapterId,
            topic: topic,
            difficulty: diff.key,
            order: orderCounter,
            cohort: 'BETA'
          }
        });
        quizMap[topic][diff.key] = created.id;
        console.log(`Created Quiz [Order ${orderCounter}]: "${quizName}" (ID: ${created.id})`);
      }

      orderCounter++;
    }
  }

  console.log("\n📦 Migrating questions to new quizzes...");
  let updatedCount = 0;
  for (const item of classified) {
    const targetQuizId = quizMap[item.topic]?.[item.difficulty];
    if (!targetQuizId) {
      console.warn(`⚠️ No quiz found for Q ID ${item.id} with Topic: "${item.topic}", Diff: "${item.difficulty}"`);
      continue;
    }

    await prisma.question.update({
      where: { id: item.id },
      data: {
        quizId: targetQuizId,
        topic: item.topic,
        difficulty: item.difficulty
      }
    });
    updatedCount++;
    if (updatedCount % 50 === 0) {
      console.log(`  Updated ${updatedCount}/${classified.length} questions...`);
    }
  }

  console.log(`✅ Successfully updated ${updatedCount} questions in database.`);

  // Cleanup old empty legacy quizzes in Chapter 17
  const allCurrentQuizzes = await prisma.quiz.findMany({
    where: { chapterId },
    include: { _count: { select: { questions: true } } }
  });

  console.log("\n🧹 Checking for empty legacy quizzes to clean up...");
  const targetQuizIds = new Set();
  Object.values(quizMap).forEach(diffObj => {
    Object.values(diffObj).forEach(id => targetQuizIds.add(id));
  });

  for (const q of allCurrentQuizzes) {
    if (!targetQuizIds.has(q.id) && q._count.questions === 0) {
      console.log(`🗑️ Deleting empty legacy quiz: "${q.name}" (ID: ${q.id})`);
      await prisma.quiz.delete({ where: { id: q.id } });
    }
  }

  console.log("\n📊 Final Quiz State in Chapter 17:");
  const finalQuizzes = await prisma.quiz.findMany({
    where: { chapterId },
    orderBy: { order: 'asc' },
    include: { _count: { select: { questions: true } } }
  });

  let totalQuestionsCount = 0;
  for (const q of finalQuizzes) {
    console.log(`  [Order ${q.order}] ${q.name} => ${q._count.questions} Qs`);
    totalQuestionsCount += q._count.questions;
  }
  console.log(`\n🎉 Total Questions across all quizzes in Chapter 17: ${totalQuestionsCount}`);

  await prisma.$disconnect();
}

main().catch(console.error);
