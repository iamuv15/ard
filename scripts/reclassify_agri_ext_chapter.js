const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const CHECKPOINT_FILE = path.join(__dirname, '..', 'checkpoints', 'agri_ext_classification_checkpoint.json');
const FINAL_FILE = path.join(__dirname, '..', 'checkpoints', 'agri_ext_classification_final.json');

const CANONICAL_TOPICS = [
  "Fundamentals, Principles & Philosophy of Extension",
  "Extension Teaching Methods: Individual, Group & Mass Contact",
  "Demonstration Methods: Method vs Result Demonstration",
  "Programme Planning, PRA & Extension Evaluation",
  "Diffusion & Adoption of Agricultural Innovations",
  "Historical Extension Programmes & Rural Development",
  "Modern Extension Systems: KVK, ATMA & Digital ICT"
];

const API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2
].filter(Boolean);

if (API_KEYS.length === 0) {
  console.error("❌ No GEMINI_API_KEY or GEMINI_API_KEY_2 found in .env");
  process.exit(1);
}

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const BATCH_SIZE = 25;
const DELAY_BETWEEN_CALLS_MS = 2500;

let currentKeyIndex = 0;
function getNextApiKey() {
  const key = API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  return key;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadCheckpoint() {
  if (fs.existsSync(CHECKPOINT_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveCheckpoint(data) {
  const dir = path.dirname(CHECKPOINT_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(data, null, 2), 'utf8');
}

async function classifyBatchWithGemini(questionsBatch) {
  const prompt = `You are an expert professor of Agricultural Extension Education and Rural Sociology specializing in the NABARD Grade A and ICAR exam syllabus.
We are classifying questions from the chapter "Agriculture Extension" into 7 canonical pedagogical topics and 3 strict difficulty levels.

CANONICAL TOPICS (You must pick EXACTLY one of these strings for each question):
1. "Fundamentals, Principles & Philosophy of Extension"
   Scope: Agricultural extension definition, scope, objectives, core principles (learning by doing, seeing is believing, need-based, grassroot organization), father of extension (J.P. Leagans, Seaman Knapp), philosophy of extension education.
2. "Extension Teaching Methods: Individual, Group & Mass Contact"
   Scope: Classification of teaching methods by contact: Individual contact (farm and home visits, office calls, personal telephone calls, personal letters), Group contact (group discussions, field trips, study tours, symposium, workshop, general meetings), Mass contact (radio, television, circular letters, posters, exhibitions, campaigns, Kisan Melas).
3. "Demonstration Methods: Method vs Result Demonstration"
   Scope: Method demonstration (Dr. Seaman Knapp - teaching a new skill or 'how to do', short duration, conducted by extension agent), Result demonstration (proving superiority of an innovation or 'why to do', long duration across a season, conducted by farmer under extension guidance).
4. "Programme Planning, PRA & Extension Evaluation"
   Scope: Extension educational process (J.P. Leagans 5 steps: Situation analysis, Objectives, Teaching, Evaluation, Reconsideration), SMART objectives, Participatory Rural Appraisal (PRA), Rapid Rural Appraisal (RRA), monitoring and impact evaluation.
5. "Diffusion & Adoption of Agricultural Innovations"
   Scope: Innovation diffusion theory (Everett Rogers), 5 stages of adoption (AIETA: Awareness, Interest, Evaluation, Trial, Adoption), 5 adopter categories and percentages (Innovators 2.5%, Early Adopters 13.5%, Early Majority 34%, Late Majority 34%, Laggards 16%), characteristics of innovations (relative advantage, compatibility, complexity, trialability, observability).
6. "Historical Extension Programmes & Rural Development"
   Scope: Pre-independence experiments (Sriniketan by Tagore, Gurgaon by F.L. Brayne, Sevagram by Gandhi, Marthandam by Spencer Hatch), Post-independence programmes: Etawah Pilot Project (Albert Mayer 1948), Community Development Programme (CDP 1952), National Extension Service (NES 1953), Panchayati Raj (Balwant Rai Mehta 1957), IADP (1960), IAAP (1964), Training & Visit (T&V system by Daniel Benor 1974), Lab to Land Programme (ICAR 1979).
7. "Modern Extension Systems: KVK, ATMA & Digital ICT"
   Scope: Krishi Vigyan Kendra (KVK - Mohan Singh Mehta Committee 1974, first at Puducherry), Agricultural Technology Management Agency (ATMA - district level, SREP), Kisan Call Centers (KCC - toll free 1800-180-1551), mKisan, Agri-Clinics and Agri-Business Centres (ACABC), ICT tools and mobile apps in agricultural extension.

DIFFICULTY LEVEL RULES:
- "EASY": Basic definitional questions, recognizing individual vs group vs mass contact methods, basic principles.
- "MEDIUM": Method vs result demonstration distinctions, specific adopter category percentages (e.g. 2.5%, 13.5%, 34%, 16%), historical programme launch years and founders, KVK establishment details.
- "HARD": Complex multi-statement evaluation questions ("Which of the following are correct? 1 and 2, 2 and 3..."), Leagans communication model vs Berlo model comparisons, PRA participatory tool matrices, or tricky sociological traps.

Here are the questions to classify:
${JSON.stringify(questionsBatch, null, 2)}

Return a strict JSON array of objects with fields:
- "id": number (the question id)
- "topic": string (one of the 7 exact strings above)
- "difficulty": "EASY" | "MEDIUM" | "HARD"
- "reasoning": short string explanation

Respond ONLY with valid JSON. No markdown code fence or prefix.`;

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const apiKey = getNextApiKey();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[Key ...${apiKey.slice(-6)}] HTTP ${response.status}: ${errorText.slice(0, 150)}`);
        if (response.status === 429) {
          console.log(`⏳ Rate limit encountered. Waiting 10s before retry...`);
          await sleep(10000);
          continue;
        }
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      const resJson = await response.json();
      const rawText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("Empty response from Gemini");

      let cleaned = rawText.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');

      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error("Parsed result is not an array");

      return parsed.map(item => {
        let topic = item.topic;
        if (!CANONICAL_TOPICS.includes(topic)) {
          const match = CANONICAL_TOPICS.find(t => t.toLowerCase() === (topic || '').toLowerCase()) ||
                        CANONICAL_TOPICS.find(t => (topic || '').toLowerCase().includes(t.toLowerCase().split(' ')[0])) ||
                        CANONICAL_TOPICS[0];
          topic = match;
        }
        let diff = (item.difficulty || 'MEDIUM').toUpperCase();
        if (!['EASY', 'MEDIUM', 'HARD'].includes(diff)) diff = 'MEDIUM';
        return {
          id: item.id,
          topic,
          difficulty: diff,
          reasoning: item.reasoning || ''
        };
      });
    } catch (err) {
      console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt < maxRetries) {
        await sleep(3500);
      } else {
        throw err;
      }
    }
  }
}

async function main() {
  console.log("🚀 Starting Agriculture Extension (Chapter 8) Reclassification...");
  console.log(`Using Model: ${MODEL} | Keys available: ${API_KEYS.length}`);

  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const adapter = new PrismaPg({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const prisma = new PrismaClient({ adapter });

  const questions = await prisma.question.findMany({
    where: { quiz: { chapterId: 8 } },
    select: {
      id: true,
      questionText: true,
      optionA: true,
      optionB: true,
      optionC: true,
      optionD: true,
      optionE: true,
      correctAnswer: true,
      explanation: true
    },
    orderBy: { id: 'asc' }
  });

  console.log(`Found ${questions.length} questions in Chapter 8 (Agriculture Extension).`);

  const checkpoint = loadCheckpoint();
  const unclassified = questions.filter(q => !checkpoint[q.id]);
  console.log(`Remaining to classify: ${unclassified.length} questions.`);

  const batches = [];
  for (let i = 0; i < unclassified.length; i += BATCH_SIZE) {
    batches.push(unclassified.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\n⏳ Batch ${i + 1}/${batches.length}: Classifying ${batch.length} questions (IDs ${batch[0].id}..${batch[batch.length - 1].id})...`);
    
    const simplifiedBatch = batch.map(q => ({
      id: q.id,
      question: q.questionText,
      options: [q.optionA, q.optionB, q.optionC, q.optionD, q.optionE].filter(Boolean),
      correctAnswer: q.correctAnswer,
      contextSnippet: (q.explanation || '').slice(0, 120)
    }));

    try {
      const results = await classifyBatchWithGemini(simplifiedBatch);
      for (const res of results) {
        checkpoint[res.id] = res;
      }
      saveCheckpoint(checkpoint);
      console.log(`✅ Batch ${i + 1} completed! Total classified: ${Object.keys(checkpoint).length}/${questions.length}`);
    } catch (e) {
      console.error(`❌ Batch ${i + 1} failed: ${e.message}`);
      await prisma.$disconnect();
      process.exit(1);
    }

    if (i < batches.length - 1) {
      await sleep(DELAY_BETWEEN_CALLS_MS);
    }
  }

  const allClassified = Object.values(checkpoint);
  fs.writeFileSync(FINAL_FILE, JSON.stringify(allClassified, null, 2), 'utf8');

  console.log("\n========================================================");
  console.log("🎉 ALL CHAPTER 8 QUESTIONS SUCCESSFULLY CLASSIFIED!");
  console.log("========================================================");

  const topicCounts = {};
  const difficultyCounts = { EASY: 0, MEDIUM: 0, HARD: 0 };
  const matrix = {};

  CANONICAL_TOPICS.forEach(t => {
    topicCounts[t] = 0;
    matrix[t] = { EASY: 0, MEDIUM: 0, HARD: 0 };
  });

  for (const item of allClassified) {
    topicCounts[item.topic] = (topicCounts[item.topic] || 0) + 1;
    difficultyCounts[item.difficulty] = (difficultyCounts[item.difficulty] || 0) + 1;
    if (matrix[item.topic]) {
      matrix[item.topic][item.difficulty] = (matrix[item.topic][item.difficulty] || 0) + 1;
    }
  }

  console.log("\n📊 Breakdown by Canonical Topic:");
  CANONICAL_TOPICS.forEach((t, idx) => {
    console.log(`  Topic ${idx + 1}: ${t} => ${topicCounts[t] || 0} Qs (Easy: ${matrix[t].EASY}, Med: ${matrix[t].MEDIUM}, Hard: ${matrix[t].HARD})`);
  });

  console.log("\n📊 Breakdown by Difficulty:");
  console.log(`  EASY:   ${difficultyCounts.EASY} (${((difficultyCounts.EASY / allClassified.length) * 100).toFixed(1)}%)`);
  console.log(`  MEDIUM: ${difficultyCounts.MEDIUM} (${((difficultyCounts.MEDIUM / allClassified.length) * 100).toFixed(1)}%)`);
  console.log(`  HARD:   ${difficultyCounts.HARD} (${((difficultyCounts.HARD / allClassified.length) * 100).toFixed(1)}%)`);
  console.log(`  TOTAL:  ${allClassified.length} Qs`);

  await prisma.$disconnect();
}

main().catch(console.error);
