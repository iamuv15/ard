const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const CHECKPOINT_FILE = path.join(__dirname, '..', 'checkpoints', 'agri_eng_classification_checkpoint.json');
const FINAL_FILE = path.join(__dirname, '..', 'checkpoints', 'agri_eng_classification_final.json');

const CANONICAL_TOPICS = [
  "Farm Power Sources, IC Engines & Tractor Mechanics",
  "Primary Tillage Implements & Ploughs",
  "Secondary Tillage, Land Levelling & Laser Levellers",
  "Sowing, Planting Equipment & Seed Drills",
  "Intercultural, Weeding & Plant Protection Machinery",
  "Harvesting, Threshing & Combine Harvesters",
  "Renewable Energy, Post-Harvest Machinery & Farm Mechanization"
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
  const prompt = `You are an expert professor of Farm Power, Agricultural Engineering and Machinery specializing in the NABARD Grade A and ICAR exam syllabus.
We are classifying questions from the chapter "Agriculture Engineering" into 7 canonical pedagogical topics and 3 strict difficulty levels.

CANONICAL TOPICS (You must pick EXACTLY one of these strings for each question):
1. "Farm Power Sources, IC Engines & Tractor Mechanics"
   Scope: Sources of farm power (human, animal, mechanical, electrical), IC engines (diesel vs petrol engines, 2-stroke vs 4-stroke cycles, compression ratio, thermal efficiency), tractor systems (clutch, gearbox/transmission, differential, final drive, Power Take-Off / PTO at standard 540 rpm, hydraulic system, cooling/radiator, steering).
2. "Primary Tillage Implements & Ploughs"
   Scope: Primary tillage definition, indigenous plough, mouldboard (MB) plough parts (share, mouldboard, landside, frog), disc plough (disc angle 40-45°, tilt angle 15-25°), subsoiler, chisel plough, rotary plough / rotavator, draft and power requirements.
3. "Secondary Tillage, Land Levelling & Laser Levellers"
   Scope: Secondary tillage implements, harrows (disc harrow, spike tooth, spring tooth), cultivators, land levellers, laser land levelling system (laser transmitter, receiver, control box, scraper bucket, benefits and water saving percentages).
4. "Sowing, Planting Equipment & Seed Drills"
   Scope: Traditional sowing vs mechanized sowing, seed-cum-fertilizer drill components (hopper, seed metering mechanism like fluted roller or cup feed, furrow openers like disc/shoe/shovel, seed tubes), calibration of seed drill, precision planters, transplanters (paddy transplanter).
5. "Intercultural, Weeding & Plant Protection Machinery"
   Scope: Intercultural equipment, weeders (wheel hoe, rotary weeder, cono-weeder in SRI rice, power weeder), earthing up equipment (ridger, bund former), plant protection machinery (knapsack sprayers, foot sprayers, power sprayers, nozzles, spray calibration, agricultural drones for spraying).
6. "Harvesting, Threshing & Combine Harvesters"
   Scope: Harvesting tools (sickles, reapers, mower cutter bar), threshers (spike tooth, rasp bar cylinders, winnower, threshing efficiency), combine harvesters (cutting, feeding, threshing, separating, cleaning mechanisms, cylinder-concave clearance, grain damage).
7. "Renewable Energy, Post-Harvest Machinery & Farm Mechanization"
   Scope: Solar energy in farming (solar water pumps, PM-KUSUM), biogas plants (KVIC vs Janata/Deenbandhu models), wind mills, post-harvest equipment (cleaners, graders, dryers, milling machines, excavators), farm mechanization status in India (kW/ha power availability), Sub-Mission on Agricultural Mechanization (SMAM), Custom Hiring Centers (CHC).

DIFFICULTY LEVEL RULES:
- "EASY": Basic identification of machinery, common implement names, basic engine/tractor part functions (radiator, clutch).
- "MEDIUM": Specific numerical values, standard operating speeds, PTO rpm (540 rpm), disc angle/tilt angle degrees, fuel efficiency differences, laser leveller component names, calibration procedures.
- "HARD": Complex multi-statement evaluation questions ("Which of the following are correct? 1 and 2, 2 and 3..."), draft force calculations, field capacity mathematical problems (ha/hr), or tricky engineering mechanics traps.

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
  console.log("🚀 Starting Agriculture Engineering (Chapter 7) Reclassification...");
  console.log(`Using Model: ${MODEL} | Keys available: ${API_KEYS.length}`);

  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const adapter = new PrismaPg({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const prisma = new PrismaClient({ adapter });

  const questions = await prisma.question.findMany({
    where: { quiz: { chapterId: 7 } },
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

  console.log(`Found ${questions.length} questions in Chapter 7 (Agriculture Engineering).`);

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
  console.log("🎉 ALL CHAPTER 7 QUESTIONS SUCCESSFULLY CLASSIFIED!");
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
