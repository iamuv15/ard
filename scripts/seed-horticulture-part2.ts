import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
config();

const url = process.env.DATABASE_URL || 'file:./dev.db';
const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

async function main() {
  const chapterName = 'Horticulture';
  const dataPath = path.join(__dirname, '../Quiz Questions/Plantation and Horticulture Part 2.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  // Create or find chapter
  const chapter = await prisma.chapter.upsert({
    where: { name: chapterName },
    update: {},
    create: { name: chapterName },
  });

  // Create quiz
  const quiz = await prisma.quiz.create({
    data: {
      name: data.title || 'Plantation and Horticulture Part 2 Mock Test',
      chapterId: chapter.id,
    }
  });

  // Prepare questions
  for (const q of data.questions) {
    await prisma.question.create({
      data: {
        questionText: q.question,
        optionA: q.options.a || '',
        optionB: q.options.b || '',
        optionC: q.options.c || '',
        optionD: q.options.d || '',
        optionE: q.options.e || null,
        topic: q.topic,
        explanation: q.explanation,
        correctAnswer: q.correct_option,
        quizId: quiz.id
      }
    });
  }

  console.log(`Successfully created quiz: ${quiz.name} in chapter: ${chapter.name}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
