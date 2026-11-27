const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const CHECKPOINT_FILE = path.join(__dirname, '..', 'checkpoints', 'irrigation_classification_checkpoint.json');
const FINAL_FILE = path.join(__dirname, '..', 'checkpoints', 'irrigation_classification_final.json');

const CANONICAL_TOPICS = [
  "Water Resources, Soil-Water Movement & Plant Absorption",
  "Crop Water Requirement, Evapotranspiration & Consumptive Use",
  "Irrigation Scheduling & Critical Growth Stages of Crops",
  "Surface Irrigation Methods & Field Layouts",
  "Micro-Irrigation Systems (Drip & Sprinkler) & Fertigation",
  "Irrigation Efficiencies, Water Quality & Agricultural Drainage",
  "Irrigation Projects Classification, PMKSY & Water Policy"
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
  const prompt = `You are an expert professor of Irrigation Agronomy and Agricultural Engineering specializing in the NABARD Grade A and ICAR exam syllabus.
We are classifying questions from the chapter "Irrigation" into 7 canonical pedagogical topics and 3 strict difficulty levels.

CANONICAL TOPICS (You must pick EXACTLY one of these strings for each question):
1. "Water Resources, Soil-Water Movement & Plant Absorption"
   Scope: Earth water resources distribution, saturated vs unsaturated flow, gravitational vs capillary flow, Darcy's law, vapour movement, active vs passive absorption of water, transpiration pull, root absorption mechanisms.
2. "Crop Water Requirement, Evapotranspiration & Consumptive Use"
   Scope: Evapotranspiration (ET), potential ET (PET), consumptive use of water, reference crop ET, lysimeters, USWB open pan evaporimeter, crop coefficients (Kc), effective rainfall, water requirements (in mm/cm) of major field crops (rice, sugarcane, wheat, cotton, potato, etc.).
3. "Irrigation Scheduling & Critical Growth Stages of Crops"
   Scope: Critical growth stages for irrigation in major crops (CRI in wheat, flowering/tasseling in maize, tillering in rice, rosette in mustard, pegging in groundnut), irrigation scheduling criteria (IW/CPE ratio, soil moisture depletion percentage, tensiometers, gypsum blocks, infrared thermometers).
4. "Surface Irrigation Methods & Field Layouts"
   Scope: Surface irrigation techniques: check basin, ring basin (orchards), border strip, furrow irrigation (corrugations, alternate furrow, broad bed furrow), wild/uncontrolled flooding, surge irrigation, cablegation.
5. "Micro-Irrigation Systems (Drip & Sprinkler) & Fertigation"
   Scope: Drip/trickle irrigation components (emitters, filters, laterals, venture), operating pressure, water savings; Sprinkler irrigation systems (nozzles, riser pipes, operating pressure, center pivot, raingun); Microjets, fertigation, chemigation.
6. "Irrigation Efficiencies, Water Quality & Agricultural Drainage"
   Scope: Water conveyance efficiency, application efficiency, storage efficiency, distribution efficiency, Water Use Efficiency (WUE); Irrigation water quality standards: SAR (Sodium Adsorption Ratio), RSC (Residual Sodium Carbonate), Boron toxicity, electrical conductivity (EC); Drainage systems (surface vs subsurface tile drainage).
7. "Irrigation Projects Classification, PMKSY & Water Policy"
   Scope: Classification of irrigation projects in India by Culturable Command Area (CCA): Major (>10,000 ha), Medium (2,000 to 10,000 ha), Minor (<2,000 ha); Pradhan Mantri Krishi Sinchayee Yojana (PMKSY) components (Per Drop More Crop, Har Khet Ko Pani, Accelerated Irrigation Benefit Programme), CADP, participatory water management.

DIFFICULTY LEVEL RULES:
- "EASY": Definitional recall, direct factual recall, identifying standard method names, basic terms that any student must know.
- "MEDIUM": Numerical values, operational pressure figures (e.g. 1.5-2.5 kg/cm2 for sprinklers, 1-1.5 for drip), CCA hectares (2000, 10000 ha), specific water requirement values (mm), specific crop critical stage names, standard formula components.
- "HARD": Unnecessarily complex or complicated multi-statement evaluation questions ("Which of the following are correct? 1 and 2, 2 and 3..."), formula calculations (SAR calculations, efficiency math, IW/CPE calculations), or tricky engineering/hydrology traps.

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
  console.log("🚀 Starting Irrigation (Chapter 13) Reclassification...");
  console.log(`Using Model: ${MODEL} | Keys available: ${API_KEYS.length}`);

  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const adapter = new PrismaPg({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const prisma = new PrismaClient({ adapter });

  const questions = await prisma.question.findMany({
    where: { quiz: { chapterId: 13 } },
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

  console.log(`Found ${questions.length} questions in Chapter 13 (Irrigation).`);

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
  console.log("🎉 ALL CHAPTER 13 QUESTIONS SUCCESSFULLY CLASSIFIED!");
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
