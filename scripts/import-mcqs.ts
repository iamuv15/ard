import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const url = process.env.DATABASE_URL || 'file:./dev.db';
  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  const jsonPath = path.join(process.cwd(), 'Quiz Questions', 'Agro-climatic Zones.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  console.log(`Found ${data.questions.length} questions in JSON.`);

  const chapterName = 'Basics of Agriculture';
  let chapter = await prisma.chapter.findUnique({
    where: { name: chapterName }
  });
  
  if (!chapter) {
    chapter = await prisma.chapter.create({
      data: { name: chapterName }
    });
    console.log(`Created chapter: ${chapterName}`);
  }

  const quizName = 'Agro-climatic Zones Quiz';
  let quiz = await prisma.quiz.findFirst({
    where: { name: quizName, chapterId: chapter.id }
  });

  if (!quiz) {
    quiz = await prisma.quiz.create({
      data: {
        name: quizName,
        chapterId: chapter.id
      }
    });
    console.log(`Created quiz: ${quizName}`);
  }

  for (const q of data.questions) {
    // Insert question
    await prisma.question.create({
      data: {
        questionText: q.question,
        optionA: q.options.a || '',
        optionB: q.options.b || '',
        optionC: q.options.c || '',
        optionD: q.options.d || '',
        optionE: q.options.e || null,
        explanationA: q.option_explanations?.a || null,
        explanationB: q.option_explanations?.b || null,
        explanationC: q.option_explanations?.c || null,
        explanationD: q.option_explanations?.d || null,
        explanationE: q.option_explanations?.e || null,
        topic: q.topic || null,
        explanation: q.explanation || null,
        correctAnswer: q.correct_option || q.correct_answer,
        quizId: quiz.id
      }
    });
  }

  console.log('Import completed successfully!');
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
