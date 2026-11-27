const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const CHECKPOINT_FILE = path.join(__dirname, '..', 'checkpoints', 'basics_of_agri_classification_checkpoint.json');
const FINAL_FILE = path.join(__dirname, '..', 'checkpoints', 'basics_of_agri_classification_final.json');

// Canonical 7 Topics in pedagogical chronological reading order
const CANONICAL_TOPICS = [
  "Introduction to Agriculture, Agronomy & Factors Affecting Crop Production",
  "Agro-Climatic & Agro-Ecological Zones of India",
  "Soil Erosion, Conservation & Land Capability Classification",
  "Cropping Systems, Patterns & Farming Systems",
  "Dryland Agriculture, Rainfed Farming & Drought Management",
  "Sustainable Agriculture & Organic Farming Systems",
  "Precision Agriculture, Hi-Tech Farming & Modern Innovations"
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
  const dir = path.dirname(CHECKPOINT_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(data, null, 2), 'utf8');
}

async function classifyBatchWithGemini(questionsBatch) {
  const prompt = `You are an expert professor of Agriculture and Agronomy specializing in the NABARD Grade A and ICAR exam syllabus.
We are classifying questions from the chapter "Basics of Agriculture" into 7 canonical pedagogical topics and 3 strict difficulty levels.

CANONICAL TOPICS (You must pick EXACTLY one of these strings for each question):
1. "Introduction to Agriculture, Agronomy & Factors Affecting Crop Production"
   Scope: History of agriculture, branches, institutes (e.g. IIVR), seasons (Kharif, Rabi, Zaid), weather & climate (cardinal temperatures, IMD rainfall definitions, weather alerts/colors), climatic, edaphic, physiographic & biotic factors affecting crop production, seeds basics (SRR, seed multiplication ratio).
2. "Agro-Climatic & Agro-Ecological Zones of India"
   Scope: Planning Commission 15 Agro-climatic zones (Western/Eastern Himalayas, Gangetic Plains, Plateau & Hills, Island regions), NARP 127 zones, agro-ecological zones, regional crop patterns, dominant soils and climates of each zone.
3. "Soil Erosion, Conservation & Land Capability Classification"
   Scope: Soil erosion detachment & transport, water erosion stages (splash, sheet, rill, gully, ravine), wind erosion stages (saltation, suspension, surface creep), conservation measures (contour bunding, graded bunding, bench terracing, mulching, strip cropping, mechanical vs agronomic measures), USDA Land Capability Classification (Classes I to VIII).
4. "Cropping Systems, Patterns & Farming Systems"
   Scope: Monoculture, multiple cropping, intercropping types (additive, replacement, strip, relay, alley, multi-tier / multi-storeyed), crop rotation, Cropping Intensity (CI), Land Equivalent Ratio (LER), Integrated Farming Systems (IFS).
5. "Dryland Agriculture, Rainfed Farming & Drought Management"
   Scope: Rainfall classifications (Dry farming <750mm, Dryland farming 750-1150mm, Rainfed farming >1150mm), drought types (meteorological, hydrological, agricultural), dry spells, anti-transpirants (stomatal closing like PMA/atrazine, film forming like mobileaf, reflective like kaolin, growth retardant like Cycocel), moisture conservation & watershed management.
6. "Sustainable Agriculture & Organic Farming Systems"
   Scope: Sustainable agriculture principles, Zero Budget Natural Farming (ZBNF), Jeevamrit/Beejamrit, green manuring, biofertilizers (Rhizobium, Azotobacter, VAM), vermicomposting, organic standards, NPOP, APEDA, PGS-India certification.
7. "Precision Agriculture, Hi-Tech Farming & Modern Innovations"
   Scope: Precision agriculture concepts, GPS, GIS, drones, remote sensing, Variable Rate Technology (VRT), soil sensors, IoT, protected cultivation (polyhouses/greenhouses), soilless farming (hydroponics, aeroponics).

DIFFICULTY LEVEL RULES:
- "EASY": Definitional recall, direct factual recall, common terms, basic institute locations, standard names that any student must know.
- "MEDIUM": Questions one level up from mere definitions, asking for specific numerical values/constants (e.g. rainfall mm thresholds, slope percentages, days of dry spell, zone numbers, specific chemical names of anti-transpirants), or specific multi-variable associations.
- "HARD": Unnecessarily complex or complicated questions, multi-statement evaluation questions ("Which of the following are correct? 1 and 2, 2 and 3..."), formula calculations (Cropping intensity, LER), or tricky conceptual traps.

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
          console.log(`⏳ Rate limit encountered. Waiting 10s before retry with another key...`);
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

      // Validate topics and difficulty
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
        await sleep(4000);
      } else {
        throw err;
      }
    }
  }
}

async function main() {
  console.log("🚀 Starting Basics of Agriculture (Chapter 11) Reclassification...");
  console.log(`Using Model: ${MODEL} | Keys available: ${API_KEYS.length}`);

  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const adapter = new PrismaPg({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const prisma = new PrismaClient({ adapter });

  const questions = await prisma.question.findMany({
    where: { quiz: { chapterId: 11 } },
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

  console.log(`Found ${questions.length} questions in Chapter 11 (Basics of Agriculture).`);

  const checkpoint = loadCheckpoint();
  console.log(`Loaded checkpoint with ${Object.keys(checkpoint).length} existing classifications.`);

  const unclassified = questions.filter(q => !checkpoint[q.id]);
  console.log(`Remaining to classify: ${unclassified.length} questions.`);

  const batches = [];
  for (let i = 0; i < unclassified.length; i += BATCH_SIZE) {
    batches.push(unclassified.slice(i, i + BATCH_SIZE));
  }

  console.log(`Processing in ${batches.length} batches of up to ${BATCH_SIZE}...`);

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
      console.log(`✅ Batch ${i + 1} completed! Total classified now: ${Object.keys(checkpoint).length}/${questions.length}`);
    } catch (e) {
      console.error(`❌ Batch ${i + 1} failed permanently: ${e.message}`);
      console.log("Stopping script. Progress is safely saved in checkpoint. You can re-run to continue.");
      await prisma.$disconnect();
      process.exit(1);
    }

    if (i < batches.length - 1) {
      await sleep(DELAY_BETWEEN_CALLS_MS);
    }
  }

  // Summary analysis
  const allClassified = Object.values(checkpoint);
  fs.writeFileSync(FINAL_FILE, JSON.stringify(allClassified, null, 2), 'utf8');

  console.log("\n========================================================");
  console.log("🎉 ALL CHAPTER 11 QUESTIONS SUCCESSFULLY CLASSIFIED!");
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
