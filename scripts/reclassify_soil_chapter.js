const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const CHECKPOINT_FILE = path.join(__dirname, '..', 'checkpoints', 'soil_classification_checkpoint.json');
const FINAL_FILE = path.join(__dirname, '..', 'checkpoints', 'soil_classification_final.json');

// Canonical 7 Topics in pedagogical chronological reading order
const CANONICAL_TOPICS = [
  "Soil Genesis, Rocks & Weathering",
  "Soil Physical Properties & Texture",
  "Soil Water Dynamics & Hydrology",
  "Soil Chemistry, Colloids & Organic Matter",
  "Problematic Soils & Reclamation",
  "Soil Erosion, Conservation & Watershed",
  "Plant Nutrients, Fertilizers & Manures"
];

// Available Gemini API keys
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
const DELAY_BETWEEN_CALLS_MS = 3000; // 3 seconds delay between calls

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
      const data = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
      return data;
    } catch (e) {
      console.warn("⚠️ Checkpoint file corrupted or unreadable. Starting fresh.");
      return {};
    }
  }
  return {};
}

function saveCheckpoint(data) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(data, null, 2), 'utf8');
}

async function callGeminiClassification(batch, attempt = 1) {
  const apiKey = getNextApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  const prompt = `You are a Senior Agricultural Scientist & NABARD Exam Director.
Classify each Agriculture Soil Science question into:
1. One canonical topic from the allowed list.
2. One difficulty level from: EASY, MEDIUM, HARD based strictly on the rules below.

ALLOWED CANONICAL TOPICS (Choose EXACT match):
1. "Soil Genesis, Rocks & Weathering" (Pedology, rocks, minerals, weathering, soil profile, horizons, Dokuchaev, Jenny)
2. "Soil Physical Properties & Texture" (Soil texture, mechanical analysis, textural triangle, structure, bulk density, particle density, porosity, aeration, soil color)
3. "Soil Water Dynamics & Hydrology" (Soil water potentials, pF curve, gravitational/capillary/hygroscopic water, infiltration, percolation, tensiometers)
4. "Soil Chemistry, Colloids & Organic Matter" (Soil colloids, clay minerals, 1:1 vs 2:1 lattice, ion exchange, CEC, AEC, soil humus, C:N ratio)
5. "Problematic Soils & Reclamation" (Saline soils, sodic/alkali soils, acid soils, acid sulfate soils, ESP, EC, SAR, gypsum requirement, lime requirement)
6. "Soil Erosion, Conservation & Watershed" (Water erosion stages [splash, sheet, rill, gully], wind erosion, USLE equation, agronomic and engineering soil conservation, watershed)
7. "Plant Nutrients, Fertilizers & Manures" (Essential macro/micro nutrients, deficiency symptoms, inorganic chemical fertilizers, organic manures, FYM, biofertilizers)

DIFFICULTY LEVEL RULES:
- "EASY":
  • Definitional questions ("Study of soil is called...", "Regur is another name for...")
  • Direct terminology, basic classifications, or founders/fathers of sciences
  • Essential "Must-Know" baseline facts for any beginner
- "MEDIUM":
  • Questions that are one step up from definitions
  • Questions asking for specific FACTUAL NUMERICAL VALUES (e.g. bulk density values, standard pH ranges, C:N ratios, moisture percentages, pF numbers, days, temperature)
  • Single-concept applications or standard NABARD Phase-1 level recall
- "HARD":
  • Questions requiring MATHEMATICAL / NUMERICAL CALCULATIONS (formulas, bulk density math, porosity math, fertilizer dose calculation)
  • Multi-statement synthesis ("Consider statements I, II, III. Which is/are correct?")
  • Unnecessarily complex / obscure / tricky exceptions and subtle exam traps

INPUT QUESTIONS:
${JSON.stringify(batch.map(q => ({
  id: q.id,
  question: q.questionText,
  options: `A) ${q.optionA} | B) ${q.optionB} | C) ${q.optionC} | D) ${q.optionD}` + (q.optionE ? ` | E) ${q.optionE}` : ''),
  correctAnswer: q.correctAnswer,
  explanationSnippet: q.explanation ? q.explanation.slice(0, 150) : ''
})), null, 2)}

Return a JSON array of objects:
[
  {
    "id": number,
    "topic": "one of the 7 allowed topics exactly",
    "difficulty": "EASY" | "MEDIUM" | "HARD",
    "reason": "short explanation of why it is Easy/Medium/Hard"
  }
]`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json"
        }
      })
    });

    if (res.status === 429) {
      console.warn(`⏳ [Rate Limit 429] on key ending in ...${apiKey.slice(-6)}. Backing off 6s and switching key (Attempt ${attempt}/5)...`);
      await sleep(6000);
      return callGeminiClassification(batch, attempt + 1);
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error("Empty candidate response from Gemini");

    const parsed = JSON.parse(rawText);
    if (!Array.isArray(parsed)) throw new Error("Gemini response is not a JSON array");

    return parsed;
  } catch (err) {
    if (attempt < 5) {
      console.warn(`⚠️ Error on attempt ${attempt}: ${err.message}. Retrying in 4s...`);
      await sleep(4000);
      return callGeminiClassification(batch, attempt + 1);
    }
    throw err;
  }
}

async function run() {
  console.log("==================================================");
  console.log("🌱 Chapter 16 (Soil Science) Reclassification Pipeline");
  console.log(`🤖 Model: ${MODEL} | Active Free Keys: ${API_KEYS.length}`);
  console.log("==================================================");

  let url = process.env.DATABASE_URL || '';
  if (url.includes('sslmode=require') && !url.includes('uselibpqcompat')) {
    url += (url.includes('?') ? '&' : '?') + 'uselibpqcompat=true';
  }
  const adapter = new PrismaPg({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Fetch all questions in Chapter 16
    console.log("Fetching all Chapter 16 (Soil) questions from database...");
    const allQuestions = await prisma.question.findMany({
      where: {
        quiz: { chapterId: 16 }
      },
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

    console.log(`✅ Loaded ${allQuestions.length} questions in Chapter 16.`);

    // 2. Load Checkpoint
    const checkpoint = loadCheckpoint();
    const alreadyProcessedIds = new Set(Object.keys(checkpoint).map(Number));
    console.log(`📌 Checkpoint loaded: ${alreadyProcessedIds.size} / ${allQuestions.length} already processed.`);

    // 3. Filter pending questions
    const pendingQuestions = allQuestions.filter(q => !alreadyProcessedIds.has(q.id));
    console.log(`🚀 Remaining questions to process: ${pendingQuestions.length}`);

    if (pendingQuestions.length === 0) {
      console.log("🎉 All questions are already classified in the checkpoint!");
    } else {
      const totalBatches = Math.ceil(pendingQuestions.length / BATCH_SIZE);
      console.log(`Processing in ${totalBatches} batches of ~${BATCH_SIZE} questions each...\n`);

      for (let b = 0; b < totalBatches; b++) {
        const batch = pendingQuestions.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
        const batchNum = b + 1;
        const processedTotal = alreadyProcessedIds.size + batch.length;

        process.stdout.write(`[Batch ${batchNum}/${totalBatches}] Processing ${batch.length} questions (Total: ${processedTotal}/${allQuestions.length})... `);

        const startTime = Date.now();
        const results = await callGeminiClassification(batch);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        // Store into checkpoint
        for (const item of results) {
          // Normalize topic to closest canonical match
          let matchedTopic = CANONICAL_TOPICS.find(t => t.toLowerCase() === (item.topic || '').toLowerCase()) || item.topic;
          if (!CANONICAL_TOPICS.includes(matchedTopic)) {
            // Fallback fuzzy match
            const found = CANONICAL_TOPICS.find(t => item.topic && item.topic.toLowerCase().includes(t.toLowerCase().split(' ')[0]));
            matchedTopic = found || CANONICAL_TOPICS[1]; // default to physical properties
          }

          let difficulty = (item.difficulty || 'MEDIUM').toUpperCase();
          if (!['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
            difficulty = 'MEDIUM';
          }

          checkpoint[item.id] = {
            topic: matchedTopic,
            difficulty: difficulty,
            reason: item.reason || ''
          };
          alreadyProcessedIds.add(item.id);
        }

        saveCheckpoint(checkpoint);
        console.log(`✅ Done in ${elapsed}s (Saved to checkpoint)`);

        if (b < totalBatches - 1) {
          await sleep(DELAY_BETWEEN_CALLS_MS);
        }
      }
    }

    // 4. Save Final File
    fs.writeFileSync(FINAL_FILE, JSON.stringify(checkpoint, null, 2), 'utf8');
    console.log(`\n💾 Saved final classification to: ${FINAL_FILE}`);

    // 5. Generate and Display Distribution Summary
    console.log("\n==================================================");
    console.log("📊 CHAPTER 16 (SOIL SCIENCE) - CLASSIFICATION SUMMARY");
    console.log("==================================================");

    const stats = {};
    for (const topic of CANONICAL_TOPICS) {
      stats[topic] = { EASY: 0, MEDIUM: 0, HARD: 0, TOTAL: 0 };
    }

    let unassignedCount = 0;
    for (const q of allQuestions) {
      const entry = checkpoint[q.id];
      if (entry && stats[entry.topic]) {
        stats[entry.topic][entry.difficulty] = (stats[entry.topic][entry.difficulty] || 0) + 1;
        stats[entry.topic].TOTAL++;
      } else {
        unassignedCount++;
      }
    }

    console.table(Object.entries(stats).map(([topic, counts]) => ({
      "Topic (Chronological Reading Order)": topic,
      "🟢 Easy": counts.EASY,
      "🟡 Medium": counts.MEDIUM,
      "🔴 Hard": counts.HARD,
      "Total Qs": counts.TOTAL
    })));

    if (unassignedCount > 0) {
      console.warn(`⚠️ Warning: ${unassignedCount} questions were not assigned to a standard topic.`);
    }

    console.log("\n✨ Pipeline completed successfully!");
  } catch (err) {
    console.error("❌ Fatal Error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
