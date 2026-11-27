const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const CHECKPOINT_FILE = path.join(__dirname, '..', 'checkpoints', 'horticulture_classification_checkpoint.json');
const FINAL_FILE = path.join(__dirname, '..', 'checkpoints', 'horticulture_classification_final.json');

// Canonical 7 Topics in pedagogical chronological reading order
const CANONICAL_TOPICS = [
  "Horticulture Fundamentals & Orchard Establishment",
  "Plant Propagation, Rootstocks & Nursery Management",
  "Canopy Management, Pruning, Bahar Treatment & PGRs",
  "Tropical & Subtropical Pomology (Mango, Banana, Citrus, Papaya)",
  "Arid, Temperate Fruits & Plantation Crops",
  "Olericulture (Vegetable Crops) & Floriculture",
  "Post-Harvest Technology, Maturity Indices & Preservation"
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

  const prompt = `You are a Senior Horticulture Scientist & NABARD Exam Director.
Classify each Horticulture question into:
1. One canonical topic from the allowed list.
2. One difficulty level from: EASY, MEDIUM, HARD based strictly on the rules below.

ALLOWED CANONICAL TOPICS (Choose EXACT match):
1. "Horticulture Fundamentals & Orchard Establishment" (Branches: Pomology, Olericulture, Floriculture, Viticulture, Arboriculture; planting systems: square, rectangular, quincunx, hexagonal, contour, high-density planting [HDP], windbreaks)
2. "Plant Propagation, Rootstocks & Nursery Management" (Sexual vs asexual/vegetative propagation, cutting, layering, grafting [wedge, tongue, veneer, approach], budding [T, patch, chip], specialized organs: suckers, slips, crowns, runners, stolons, rhizomes, tubers, corms, bulbs)
3. "Canopy Management, Pruning, Bahar Treatment & PGRs" (Training systems, pruning types [heading back, thinning out, de-shooting, pinching, ringing, girdling], Bahar treatments [Ambe, Mrig, Hasta bahar in citrus/guava/pomegranate], plant growth regulators [Auxins, GA3, Ethrel, Cycocel/CCC, Paclobutrazol])
4. "Tropical & Subtropical Pomology (Mango, Banana, Citrus, Papaya)" (Major tropical fruit crops: Mango, Banana, Citrus, Papaya - varieties, hybrid crosses, cultivation, spacing, physiological disorders [spongy tissue, black tip, malformation, bunchy top, sigatoka, alternate bearing])
5. "Arid, Temperate Fruits & Plantation Crops" (Guava, Grape, Pineapple, Pomegranate, Ber, Aonla, Apple, Coconut, Cashew, Tea, Coffee, Rubber, Arecanut - varieties, propagation methods, training, pruning, disorders)
6. "Olericulture (Vegetable Crops) & Floriculture" (Solanaceous crops [tomato, brinjal, potato], cole crops, cucurbits, bulb crops; commercial floriculture: rose, marigold, jasmine, gladiolus, carnation, landscape gardening, lawns, bonsai)
7. "Post-Harvest Technology, Maturity Indices & Preservation" (Harvesting indices, TSS, Brix, climacteric vs non-climacteric ripening, cold storage, packaging, preservation: jam, jelly [pectin], marmalade, squash, canning, food standards)

DIFFICULTY RULES:
- "EASY": Basic definitions, horticulture branches, common propagation organs (banana sword suckers, pineapple slips/crowns), botanical names/families, obvious disorder symptoms.
- "MEDIUM": Hybrid crosses/parentage, Bahar months, spacing specifications, chemical concentrations (ppm of NAA/Cycocel), TSS/Brix minimum values, specific causes of disorders.
- "HARD": Complex multi-cross pedigrees, physiological/biochemical mechanisms of disorders, obscure rootstock compatibilities, post-harvest biochemical calculations.

QUESTIONS TO CLASSIFY (JSON):
${JSON.stringify(batch.map(q => ({
  id: q.id,
  text: q.questionText,
  options: { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD, E: q.optionE },
  correctAnswer: q.correctAnswer
})), null, 2)}

OUTPUT FORMAT:
Return a JSON array of objects with EXACTLY this structure, nothing else:
[
  { "id": 1545, "topic": "Tropical & Subtropical Pomology (Mango, Banana, Citrus, Papaya)", "difficulty": "EASY" },
  ...
]`;

  try {
    const response = await fetch(url, {
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

    if (response.status === 429) {
      console.warn(`⏳ Rate limit encountered on key. Waiting 10s and retrying...`);
      await sleep(10000);
      return callGeminiClassification(batch, attempt + 1);
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errText}`);
    }

    const json = await response.json();
    const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error("No response text from Gemini");
    }

    const parsed = JSON.parse(candidateText);
    if (!Array.isArray(parsed)) {
      throw new Error("Gemini output is not an array");
    }

    return parsed;
  } catch (error) {
    if (attempt <= 3) {
      console.warn(`⚠️ Error on attempt ${attempt}: ${error.message}. Retrying in 5s...`);
      await sleep(5000);
      return callGeminiClassification(batch, attempt + 1);
    }
    throw error;
  }
}

async function run() {
  console.log("==================================================");
  console.log("🚀 STARTING HORTICULTURE RECLASSIFICATION PIPELINE");
  console.log(`Model: ${MODEL} | Keys: ${API_KEYS.length} available | Batch Size: ${BATCH_SIZE}`);
  console.log("==================================================");

  let url = process.env.DATABASE_URL || '';
  if (url.includes('sslmode=require') && !url.includes('uselibpqcompat')) {
    url += (url.includes('?') ? '&' : '?') + 'uselibpqcompat=true';
  }
  const adapter = new PrismaPg({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Fetch all questions from Chapter 12 (Horticulture)
    const questions = await prisma.question.findMany({
      where: {
        quiz: { chapterId: 12 }
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
        quiz: { select: { name: true } }
      },
      orderBy: { id: 'asc' }
    });

    console.log(`📦 Loaded ${questions.length} total questions from Chapter 12 (Horticulture).`);

    // 2. Load Checkpoint
    const checkpoint = loadCheckpoint();
    const alreadyClassifiedCount = Object.keys(checkpoint).length;
    console.log(`💾 Checkpoint loaded: ${alreadyClassifiedCount} questions already classified.`);

    // 3. Filter unclassified questions
    const pendingQuestions = questions.filter(q => !checkpoint[q.id]);
    console.log(`⚡ Remaining questions to classify: ${pendingQuestions.length}`);

    if (pendingQuestions.length === 0) {
      console.log("🎉 All questions are already classified! Generating final report...");
      fs.writeFileSync(FINAL_FILE, JSON.stringify(checkpoint, null, 2), 'utf8');
      summarize(checkpoint);
      return;
    }

    // 4. Batch processing with round-robin keys
    const totalBatches = Math.ceil(pendingQuestions.length / BATCH_SIZE);
    console.log(`🔄 Processing ${totalBatches} batches of ${BATCH_SIZE}...`);

    for (let b = 0; b < totalBatches; b++) {
      const startIdx = b * BATCH_SIZE;
      const batch = pendingQuestions.slice(startIdx, startIdx + BATCH_SIZE);
      console.log(`\n▶️ Batch ${b + 1}/${totalBatches} (${batch.length} Qs) [IDs: ${batch[0].id}..${batch[batch.length - 1].id}]`);

      const startTime = Date.now();
      const results = await callGeminiClassification(batch);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      // Validate & save results to checkpoint
      let validCount = 0;
      for (const item of results) {
        if (item && item.id) {
          // Normalize topic to closest canonical match
          let matchedTopic = CANONICAL_TOPICS.find(t => t.toLowerCase() === (item.topic || '').toLowerCase()) || item.topic;
          if (!CANONICAL_TOPICS.includes(matchedTopic)) {
            matchedTopic = CANONICAL_TOPICS.find(t => item.topic && item.topic.includes(t.split(' ')[0])) || "Horticulture Fundamentals & Orchard Establishment";
          }

          let matchedDiff = (item.difficulty || '').toUpperCase();
          if (!['EASY', 'MEDIUM', 'HARD'].includes(matchedDiff)) {
            matchedDiff = 'MEDIUM';
          }

          checkpoint[item.id] = {
            topic: matchedTopic,
            difficulty: matchedDiff
          };
          validCount++;
        }
      }

      saveCheckpoint(checkpoint);
      const percent = (((Object.keys(checkpoint).length) / questions.length) * 100).toFixed(1);
      console.log(`  ✅ Batch ${b + 1} done in ${elapsed}s. Saved ${validCount} items. Progress: ${Object.keys(checkpoint).length}/${questions.length} (${percent}%)`);

      if (b < totalBatches - 1) {
        console.log(`  ⏳ Pausing ${DELAY_BETWEEN_CALLS_MS / 1000}s...`);
        await sleep(DELAY_BETWEEN_CALLS_MS);
      }
    }

    // 5. Finalize
    fs.writeFileSync(FINAL_FILE, JSON.stringify(checkpoint, null, 2), 'utf8');
    console.log(`\n🎉 Classification complete! Saved to ${FINAL_FILE}`);
    summarize(checkpoint);

  } catch (err) {
    console.error("❌ Pipeline failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

function summarize(classification) {
  console.log("\n================ CLASSIFICATION SUMMARY ================");
  const topicCounts = {};
  const diffCounts = { EASY: 0, MEDIUM: 0, HARD: 0 };

  CANONICAL_TOPICS.forEach(t => { topicCounts[t] = { EASY: 0, MEDIUM: 0, HARD: 0, total: 0 }; });

  for (const [id, item] of Object.entries(classification)) {
    const t = item.topic;
    const d = item.difficulty;
    if (!topicCounts[t]) topicCounts[t] = { EASY: 0, MEDIUM: 0, HARD: 0, total: 0 };
    topicCounts[t][d] = (topicCounts[t][d] || 0) + 1;
    topicCounts[t].total++;
    diffCounts[d] = (diffCounts[d] || 0) + 1;
  }

  let index = 1;
  for (const topic of CANONICAL_TOPICS) {
    const stats = topicCounts[topic] || { EASY: 0, MEDIUM: 0, HARD: 0, total: 0 };
    console.log(`\nTopic ${index++}: ${topic} (Total: ${stats.total} Qs)`);
    console.log(`  🟢 Level 1 (Easy):   ${stats.EASY} Qs`);
    console.log(`  🟡 Level 2 (Medium): ${stats.MEDIUM} Qs`);
    console.log(`  🔴 Level 3 (Hard):   ${stats.HARD} Qs`);
  }

  const grandTotal = Object.keys(classification).length;
  console.log("\n---------------- OVERALL DIFFICULTY BREAKDOWN ----------------");
  console.log(`🟢 Easy:   ${diffCounts.EASY} Qs (${((diffCounts.EASY / grandTotal) * 100).toFixed(1)}%)`);
  console.log(`🟡 Medium: ${diffCounts.MEDIUM} Qs (${((diffCounts.MEDIUM / grandTotal) * 100).toFixed(1)}%)`);
  console.log(`🔴 Hard:   ${diffCounts.HARD} Qs (${((diffCounts.HARD / grandTotal) * 100).toFixed(1)}%)`);
  console.log(`📊 Grand Total: ${grandTotal} Questions`);
  console.log("==============================================================");
}

run();
