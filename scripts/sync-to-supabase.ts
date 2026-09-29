import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import prisma from '../src/lib/prisma';

async function main() {
  console.log('🚀 Starting Supabase Database Migration & Sync...');

  const dataPath = path.join(__dirname, 'export-data.json');
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Data file not found at ${dataPath}`);
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const quizzes: any[] = data.quizzes;
  const userData = data.user;
  const mistakes: any[] = data.mistakes;

  console.log(`📦 Loaded ${quizzes.length} quizzes with ${quizzes.reduce((acc, q) => acc + q.questions.length, 0)} questions.`);

  // 1. Clean existing partial/duplicate data
  console.log('🧹 Cleaning existing data in Supabase...');
  await prisma.userMistake.deleteMany({});
  await prisma.quizAttempt.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.quiz.deleteMany({});
  await prisma.chapter.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('✨ Supabase database cleaned successfully.');

  // 2. Identify unique chapters
  const chapterNames = Array.from(new Set(quizzes.map(q => q.chapterName))).sort();
  console.log(`📁 Creating ${chapterNames.length} standardized chapters:`, chapterNames);

  const chapterMap = new Map<string, number>();
  for (const chName of chapterNames) {
    const ch = await prisma.chapter.create({
      data: { name: chName }
    });
    chapterMap.set(chName, ch.id);
  }

  // 3. Insert quizzes and questions
  let totalQuizzesInserted = 0;
  let totalQuestionsInserted = 0;

  for (const q of quizzes) {
    const chapterId = chapterMap.get(q.chapterName);
    if (!chapterId) {
      throw new Error(`Chapter ${q.chapterName} not found in map!`);
    }

    const createdQuiz = await prisma.quiz.create({
      data: {
        name: q.name,
        chapterId: chapterId,
        createdAt: q.createdAt ? new Date(q.createdAt) : new Date(),
      }
    });
    totalQuizzesInserted++;

    // Prepare questions with quizId
    const questionsToInsert = q.questions.map((ques: any) => ({
      questionText: ques.questionText,
      optionA: ques.optionA || '',
      optionB: ques.optionB || '',
      optionC: ques.optionC || '',
      optionD: ques.optionD || '',
      optionE: ques.optionE || null,
      explanationA: ques.explanationA || null,
      explanationB: ques.explanationB || null,
      explanationC: ques.explanationC || null,
      explanationD: ques.explanationD || null,
      explanationE: ques.explanationE || null,
      topic: ques.topic || null,
      explanation: ques.explanation || null,
      correctAnswer: ques.correctAnswer || '',
      quizId: createdQuiz.id,
      createdAt: ques.createdAt ? new Date(ques.createdAt) : new Date(),
    }));

    // Batch insert questions
    await prisma.question.createMany({
      data: questionsToInsert
    });
    totalQuestionsInserted += questionsToInsert.length;

    console.log(`  ✓ Added Quiz: "${q.name}" (${questionsToInsert.length} questions) -> Chapter: ${q.chapterName}`);
  }

  // 4. Create User if exists
  let createdUser = null;
  if (userData) {
    createdUser = await prisma.user.create({
      data: {
        email: userData.email,
        password: userData.password,
        name: userData.name,
        role: userData.role,
        createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
      }
    });
    console.log(`👤 Recreated User: ${createdUser.email} (id: ${createdUser.id})`);
  }

  // 5. Restore UserMistakes if user exists
  if (createdUser && mistakes && mistakes.length > 0) {
    let mistakesRestored = 0;
    for (const m of mistakes) {
      // Find question by exact question text
      const question = await prisma.question.findFirst({
        where: { questionText: m.questionText }
      });

      if (question) {
        await prisma.userMistake.create({
          data: {
            userId: createdUser.id,
            questionId: question.id,
            reviewLevel: m.reviewLevel || 0,
            nextReviewAt: m.nextReviewAt ? new Date(m.nextReviewAt) : new Date(),
            createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
          }
        });
        mistakesRestored++;
      }
    }
    console.log(`🎯 Restored ${mistakesRestored} / ${mistakes.length} user mistakes.`);
  }

  // 6. Verification
  console.log('\n=========================================');
  console.log('📊 FINAL SUPABASE VERIFICATION');
  console.log('=========================================');

  const finalChapters = await prisma.chapter.findMany({
    include: {
      quizzes: {
        include: {
          _count: {
            select: { questions: true }
          }
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  let verifiedQuizzes = 0;
  let verifiedQuestions = 0;

  for (const ch of finalChapters) {
    const chQuestionCount = ch.quizzes.reduce((sum, q) => sum + q._count.questions, 0);
    console.log(`\n📁 Chapter: ${ch.name} (${ch.quizzes.length} quizzes, ${chQuestionCount} questions)`);
    for (const q of ch.quizzes) {
      verifiedQuizzes++;
      verifiedQuestions += q._count.questions;
      console.log(`   - ${q.name} (${q._count.questions} questions)`);
    }
  }

  const finalUsers = await prisma.user.count();
  const finalMistakes = await prisma.userMistake.count();

  console.log('\n=========================================');
  console.log(`TOTAL CHAPTERS  : ${finalChapters.length}`);
  console.log(`TOTAL QUIZZES    : ${verifiedQuizzes}`);
  console.log(`TOTAL QUESTIONS  : ${verifiedQuestions}`);
  console.log(`TOTAL USERS      : ${finalUsers}`);
  console.log(`TOTAL MISTAKES   : ${finalMistakes}`);
  console.log('=========================================');
  console.log('🎉 SUCCESS: All quizzes successfully saved to Supabase!');
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
