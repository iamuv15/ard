const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const CHECKPOINT_FILE = path.join(__dirname, '..', 'checkpoints', 'plant_nutrition_classification_checkpoint.json');
const FINAL_FILE = path.join(__dirname, '..', 'checkpoints', 'plant_nutrition_classification_final.json');

const CANONICAL_TOPICS = [
  "Essential Plant Nutrients & Criteria of Essentiality",
  "Primary Macronutrients: Functions & Dynamics (N, P, K)",
  "Secondary Macronutrients: Functions & Chemistry (Ca, Mg, S)",
  "Micronutrients: Functions & Trace Elements",
  "Nutrient Mobility, Deficiency Symptoms & Plant Disorders",
  "Commercial Chemical Fertilizers & Formulations",
  "Integrated Nutrient Management (INM) & Biofertilizers"
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
  const prompt = `You are an expert professor of Soil Fertility, Plant Nutrition and Agricultural Chemistry specializing in the NABARD Grade A and ICAR exam syllabus.
We are classifying questions from the chapter "Plant Nutrition" into 7 canonical pedagogical topics and 3 strict difficulty levels.

CANONICAL TOPICS (You must pick EXACTLY one of these strings for each question):
1. "Essential Plant Nutrients & Criteria of Essentiality"
   Scope: Arnon & Stout criteria of essentiality (1939, 1954), 17 essential plant nutrients, basic/structural elements (C, H, O), macro vs micronutrients, beneficial elements (Sodium, Silicon, Vanadium, Cobalt - Co-Si-Na-V), functional nutrients (Nicholas 1961).
2. "Primary Macronutrients: Functions & Dynamics (N, P, K)"
   Scope: Nitrogen (vegetative growth, amino acids, protein synthesis, chlorophyll, forms: NO3- vs NH4+), Phosphorus (energy transfer, ATP, root elongation, key of life), Potassium (stomata opening/closing, enzyme activator, luxury consumption, osmoregulation, disease resistance).
3. "Secondary Macronutrients: Functions & Chemistry (Ca, Mg, S)"
   Scope: Calcium (calcium pectate in middle lamella, cell division, root tip growth), Magnesium (central atom in chlorophyll porphyrin ring, phosphorus carrier), Sulphur (cysteine, methionine amino acids, pungent oils, allyl propyl disulphide in onion/garlic, glucosinolates in mustard).
4. "Micronutrients: Functions & Trace Elements"
   Scope: Iron (ferredoxin, electron transport, catalyst for chlorophyll formation), Manganese (photolysis of water in photosynthesis / Hill's reaction), Zinc (tryptophan and IAA/auxin synthesis), Copper (plastocyanin, enzyme component), Boron (sugar translocation, pollen germination), Molybdenum (nitrate reductase, nitrogenase in nodules), Chlorine (osmotic balance), Nickel (urease enzyme for urea metabolism).
5. "Nutrient Mobility, Deficiency Symptoms & Plant Disorders"
   Scope: Mobility in plants: Highly mobile (N, P, K, Mg - symptoms on older leaves), Moderately mobile (Zn - middle leaves), Less mobile (S, Fe, Mn, Cu - younger/upper leaves), Immobile (Ca, B - terminal bud/growing point death); Specific disorders: Khaira disease of rice (Zn), Whiptail of cauliflower (Mo), Blossom end rot of tomato (Ca), Internal necrosis/browning of aonla (B), Marsh spot of pea (Mn), White eye of maize (Zn).
6. "Commercial Chemical Fertilizers & Formulations"
   Scope: Straight, complex, mixed fertilizers; Nitrogenous: Urea (46% N, biuret limits <1.5%), Ammonium sulphate (20.6% N, 24% S), CAN (25% N); Phosphatic: Single Super Phosphate / SSP (16% P2O5, 12% S, 19% Ca), DAP (18% N, 46% P2O5); Potassic: MOP (60% K2O), SOP (50% K2O, 17.5% S); Nano urea, neem coated urea, slow release fertilizers.
7. "Integrated Nutrient Management (INM) & Biofertilizers"
   Scope: INM concept, 4R nutrient stewardship (Right source, rate, time, place), biofertilizers: nitrogen-fixers (Rhizobium, Azotobacter, Azospirillum, Acetobacter, BGA, Azolla), phosphorus-solubilizers (PSB - Pseudomonas/Bacillus, VAM / Mycorrhiza for phosphorus mobilization), foliar feeding, fertigation techniques.

DIFFICULTY LEVEL RULES:
- "EASY": Basic definitional questions, total number of essential nutrients (17), basic nutrient names, identifying primary macronutrients.
- "MEDIUM": Specific deficiency symptom location on plant (older vs younger leaves), specific nutrient percentages (Urea 46%, SSP 16%, DAP 18-46-0), characteristic disorders (Khaira, Whiptail, Blossom end rot).
- "HARD": Complex multi-statement evaluation questions ("Which of the following are correct? 1 and 2, 2 and 3..."), nutrient antagonist/synergy mechanisms, biochemical enzymology (urease, nitrogenase, ATP synthase), or fertilizer calculation math.

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
  console.log("🚀 Starting Plant Nutrition (Chapter 14) Reclassification...");
  console.log(`Using Model: ${MODEL} | Keys available: ${API_KEYS.length}`);

  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const adapter = new PrismaPg({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const prisma = new PrismaClient({ adapter });

  const questions = await prisma.question.findMany({
    where: { quiz: { chapterId: 14 } },
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

  console.log(`Found ${questions.length} questions in Chapter 14 (Plant Nutrition).`);

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
  console.log("🎉 ALL CHAPTER 14 QUESTIONS SUCCESSFULLY CLASSIFIED!");
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
