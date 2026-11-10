const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

async function run() {
  let connectionString = process.env.DATABASE_URL || '';
  if (connectionString.includes('sslmode=require') && !connectionString.includes('uselibpqcompat')) {
    connectionString += (connectionString.includes('?') ? '&' : '?') + 'uselibpqcompat=true';
  }
  const adapter = new PrismaPg({ connectionString, ssl: { rejectUnauthorized: false } });
  const prisma = new PrismaClient({ adapter });

  const questions = await prisma.question.findMany({
    where: { quizId: 12 },
    orderBy: { id: 'asc' }
  });
  console.log(`Regenerating voice solutions for ${questions.length} questions in Quiz 12...`);

  const apiKey = process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const BATCH_SIZE = 5;

  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(questions.length / BATCH_SIZE)} (Q ${batch[0].id} to ${batch[batch.length - 1].id})...`);

    const prompt = `You are an expert Agricultural Engineering professor explaining the complete solution to a student in spoken conversational Hinglish.

STRICT PEDAGOGICAL INSTRUCTIONS:
1. FOCUS EXCLUSIVELY ON SOLUTION: Provide a detailed, crystal-clear conceptual explanation of the question and the correct answer. Explain the core engineering/scientific principle thoroughly.
2. EXPLAIN RELATED OPTIONS: Explain the other terms in the options ONLY IF they have distinct, individual testable technical definitions (e.g. if options list Watt, Newton, Joule, Newton-meter, explain what each unit measures). If an option is a trivial numerical distractor, do NOT waste time explaining it.
3. ABSOLUTE PROHIBITION ON EXAM TALK: You are STRICTLY FORBIDDEN from mentioning other exams or exam importance (DO NOT say "yeh exam me pucha jaata hai", "NABARD/AFO ke liye zaroori hai", "exam trap hai", "students confuse hote hain", etc.). Teach purely the subject-matter science and concept.
4. LINGUISTIC STYLE: Conversational Hinglish. Use Devanagari script for Hindi grammar and connectives, and standard English Latin letters for technical terms, units, machinery names, and definitions.
5. NO GREETINGS: Do NOT include "Aapka answer sahi hai" or "Galat jawab" (the frontend adds that dynamically). Jump straight into the detailed conceptual explanation.

INPUT QUESTIONS:
${JSON.stringify(batch.map(q => ({
  id: q.id,
  question: q.questionText,
  optionA: q.optionA,
  optionB: q.optionB,
  optionC: q.optionC,
  optionD: q.optionD,
  optionE: q.optionE || null,
  correctAnswer: q.correctAnswer,
  explanation: q.explanation?.slice(0, 500) || ''
})), null, 2)}

Respond with a JSON array:
[
  {
    "id": number,
    "voiceExplanation": string
  }
]`;

    let retries = 3;
    while (retries > 0) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (res.status === 503 || res.status === 429) {
          console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} got ${res.status}, waiting 3s...`);
          await new Promise(r => setTimeout(r, 3000));
          retries--;
          continue;
        }

        const data = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error('No text in response');

        const parsed = JSON.parse(rawText);
        for (const item of parsed) {
          await prisma.question.update({
            where: { id: item.id },
            data: {
              voiceExplanation: item.voiceExplanation,
              voiceScriptVersion: 2
            }
          });
        }
        console.log(`✅ Saved batch ${Math.floor(i / BATCH_SIZE) + 1} (${parsed.length} questions).`);
        break;
      } catch (err) {
        console.error(`Error in batch ${Math.floor(i / BATCH_SIZE) + 1}:`, err.message);
        retries--;
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  console.log('✅ Finished regenerating all voice explanations for Quiz 12!');
  await prisma.$disconnect();
}

run().catch(console.error);

