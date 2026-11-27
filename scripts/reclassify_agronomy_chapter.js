const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const CHECKPOINT_FILE = path.join(__dirname, '..', 'checkpoints', 'agronomy_classification_checkpoint.json');
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
  const prompt = `You are an expert professor of Agronomy and Crop Production specializing in the NABARD Grade A and ICAR exam syllabus.
We are classifying questions from the chapter "Agronomy" into 7 canonical pedagogical topics and 3 strict difficulty levels.

CANONICAL TOPICS (You must pick EXACTLY one of these strings for each question):
1. "Agronomy Principles, Crop Classification & Plant Morphology"
   Scope: Definition, father of agronomy (Peter de Crescenzi), Jethro Tull, classification based on ontogeny (annual, biennial, perennial), taxonomy/families (Poaceae, Fabaceae, Solanaceae), carbon assimilation (C3, C4, CAM), botanical terms (caryopsis grain, tillering, canopy).
2. "Cereal Crops Cultivation (Rice, Wheat, Maize & Millets)"
   Scope: Rice (puddled, DSR, SRI system, aerobic rice, golden rice, deep water rice), Wheat (dwarf wheat Norin-10, sowing depths, lodging), Maize (types: dent, flint, sweet, pop; hybrid vs composite), Millets / Shree Anna (pearl millet/bajra, finger millet/ragi, sorghum/jowar).
3. "Pulse & Oilseed Crops Production"
   Scope: Chickpea/Gram (desi vs kabuli, nipping), Pigeonpea/Arhar, Green gram, Black gram; Oilseeds: Mustard/Rapeseed (erucic acid, glucosinolates), Groundnut (pegging, popping, aflatoxin), Soybean (protein 40-42%, oil 20%), Sunflower, Sesame.
4. "Commercial, Cash & Fiber Crops (Sugarcane, Cotton & Jute)"
   Scope: Sugarcane (planting methods, sett rate, hot water treatment, trench method, arrowing, ripening/Brix refractometer 18-20%, ratooning); Cotton (ginning outturn, lint vs fuzz, Bt cotton, square formation); Jute (retting, ribboning, golden fiber), Tobacco.
5. "Tillage Systems, Seedbed Preparation & Conservation Agriculture"
   Scope: Tillage objectives, primary vs secondary tillage, zero/no-tillage, minimum tillage, stubble mulching, deep tillage, puddle tillage, conservation agriculture (CA) 3 core principles (zero tillage, permanent soil cover/mulch, crop diversification).
6. "Weed Science, Weed Biology & Chemical Weed Control"
   Scope: Weed definition, persistence mechanisms, parasitic weeds (Cuscuta, Loranthus, Orobanche, Striga - CLOPS), critical period of crop-weed competition, herbicide classifications (pre-plant, pre-emergence, post-emergence, selective vs non-selective), herbicides (2,4-D, Pendimethalin, Atrazine, Glyphosate, Isoproturon).
7. "Harvesting, Post-Harvest Processing & Grain Storage Standards"
   Scope: Physiological maturity vs harvest maturity, Harvest Index (HI) formula, safe storage moisture contents (10-12% for cereals, 8-9% for oilseeds), grain loss prevention, storage structures (Pusa bin, silos), grain testing.

DIFFICULTY LEVEL RULES:
- "EASY": Basic definitional questions, recognizing crop families, common names of crops/weeds, standard terms.
- "MEDIUM": Specific numerical values, seed rates (kg/ha), safe storage moisture percentages (10-12%), specific herbicide pre vs post emergence timings, brix values (18-20%), specific temperature/rainfall requirements.
- "HARD": Complex multi-statement evaluation questions ("Which of the following are correct? 1 and 2, 2 and 3..."), Harvest Index / Ginning Outturn mathematical problems, biochemical pathway comparisons (C3 vs C4 enzymes), or tricky agronomic traps.

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
  console.log("🚀 Starting Agronomy (Chapter 17) Reclassification...");
  console.log(`Using Model: ${MODEL} | Keys available: ${API_KEYS.length}`);

  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const adapter = new PrismaPg({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const prisma = new PrismaClient({ adapter });

  const questions = await prisma.question.findMany({
    where: { quiz: { chapterId: 17 } },
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

  console.log(`Found ${questions.length} questions in Chapter 17 (Agronomy).`);

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
  console.log("🎉 ALL CHAPTER 17 QUESTIONS SUCCESSFULLY CLASSIFIED!");
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
