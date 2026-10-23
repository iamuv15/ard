import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';

const API_KEYS = [
  { key: (process.env.GEMINI_API_KEY || '').trim(), label: 'FREE 1 (GEMINI_API_KEY)' },
  { key: (process.env.GEMINI_API_KEY_2 || '').trim(), label: 'FREE 2 (GEMINI_API_KEY_2)' }
].filter(k => k.key.length > 0);

if (API_KEYS.length === 0) {
  console.error('ERROR: No GEMINI_API_KEY or GEMINI_API_KEY_2 found in .env!');
  process.exit(1);
}

console.log(`Loaded ${API_KEYS.length} free Gemini API key(s).`);

let keyIndex = 0;
function getNextKey() {
  const k = API_KEYS[keyIndex];
  keyIndex = (keyIndex + 1) % API_KEYS.length;
  return k;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const PRIMARY_MODEL = 'models/gemini-3.5-flash';
const FALLBACK_MODEL = 'models/gemini-3.5-flash-lite';

async function callGeminiWithRetry(systemPrompt: string, userPrompt: string, maxRetries = 5): Promise<string> {
  let attempt = 0;
  let currentModel = PRIMARY_MODEL;

  while (attempt < maxRetries) {
    attempt++;
    const keyInfo = getNextKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/${currentModel}:generateContent?key=${keyInfo.key}`;

    try {
      console.log(`[API Call] ${currentModel} using ${keyInfo.label} (Attempt ${attempt}/${maxRetries})...`);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n---\nDOCUMENT CONTENT / DATA:\n${userPrompt}` }]
            }
          ],
          generationConfig: {
            temperature: 0.15,
            maxOutputTokens: 8192
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 100) {
          console.log(`[API Call Success] Received ${text.length} chars.`);
          // Rate-limiting delay to preserve free tier quota
          await sleep(3500);
          return text.trim();
        }
      }

      const status = res.status;
      const errText = await res.text();
      console.warn(`[API Warning] Status ${status} from ${keyInfo.label}: ${errText.slice(0, 150)}`);

      if (status === 429) {
        console.log(`[Rate Limit Hit] Sleeping 12s before next retry...`);
        await sleep(12000);
        currentModel = FALLBACK_MODEL; // switch to lite model for lower quota usage
      } else if (status >= 500) {
        console.log(`[Server Error] Sleeping 6s before next retry...`);
        await sleep(6000);
      } else {
        await sleep(4000);
      }
    } catch (err: any) {
      console.warn(`[Network/Fetch Error] ${err.message}. Retrying in 5s...`);
      await sleep(5000);
    }
  }

  throw new Error(`Failed to get response after ${maxRetries} attempts.`);
}

const OUTPUT_DIR = path.resolve('Notes/Soil_Science');
const RAW_DIR = path.resolve('scratch/soil_raw_units');

async function generateMasterFactsUnit(): Promise<string> {
  const masterPath = path.join(OUTPUT_DIR, '00_master_exam_facts_and_pyqs.md');
  if (fs.existsSync(masterPath)) {
    console.log(`[Existing File] Master exam facts already exists: ${masterPath}`);
    return fs.readFileSync(masterPath, 'utf-8');
  }

  console.log(`\n================================================================`);
  console.log(`STEP 1: Generating 00_master_exam_facts_and_pyqs.md`);
  console.log(`================================================================`);

  const rawMaster = fs.readFileSync(path.join(RAW_DIR, 'unit_00_master_exam_facts.txt'), 'utf-8');
  const paras = rawMaster.replace(/\r\n/g, '\n').split('\n\n').filter(p => p.trim().length > 0);
  const midPoint = Math.floor(paras.length / 2);
  const half1 = paras.slice(0, midPoint).join('\n\n');
  const half2 = paras.slice(midPoint).join('\n\n');

  console.log(`Processing Half 1 (${half1.length} chars) and Half 2 (${half2.length} chars)...`);

  const promptPart1 = `You are a distinguished Professor of Soil Science and Agricultural Chemistry preparing an authoritative, comprehensive Master Exam Facts and Previous Year Questions (PYQ) Compendium for national agricultural examinations (IBPS-AFO, ICAR-JRF/SRF, NABARD, RRB SO, State PSCs/AO/AAO).

TASK:
Convert the provided raw exam facts (Part 1: Fundamentals, Rocks, Minerals, Weathering, Pedology, Physical Properties, Soil Water, Soils of India, and Taxonomy) into a meticulously structured, uncompressed GitHub Markdown document.

CRITICAL REQUIREMENTS:
1. ZERO OMISSION: Retain EVERY SINGLE fact, year tag (e.g. [AFO 2021], [RRB SO 2018], [MCAER 2018], [BHU 2014], [KRIBHCO], [AAO TN-2016]), formula, constant (e.g. surface tension 72.7 dyne/cm2, solar constant 2 cal/cm2/min, soil loss limit 12 t/ha/yr), and numerical threshold.
2. ORGANIZE INTO THEMATIC SECTIONS:
   # Master Soil Science Exam Facts & Previous Year Questions (PYQs)
   ## 1. Fundamentals, National Institutes & Global Benchmarks (PYQs & Facts)
   ## 2. Rocks, Minerals & Weathering Resistance Series (PYQs & Facts)
   ## 3. Soil Formation, Master Horizons & Pedological Processes (PYQs & Facts)
   ## 4. Soil Physical Properties (Texture, Structure, Density, Porosity, Consistency) (PYQs & Facts)
   ## 5. Soil Water Dynamics, Moisture Constants, pF Values & Instruments (PYQs & Facts)
   ## 6. Soils of India & USDA Soil Taxonomy (PYQs & Facts)
3. FORMATTING:
   - Use bolding for tested terms and figures.
   - Use GitHub Markdown tables for comparative matrices (e.g., mineral weathering order, soil water tensions/pF values, USDA soil orders).
   - Use clear exam tags: **[IBPS-AFO 2021]**, **[RRB SO 2019]**, etc.
   - Clean up any OCR artifacts.`;

  const part1Markdown = await callGeminiWithRetry(promptPart1, half1);

  console.log(`Part 1 generated successfully. Now processing Part 2...`);

  const promptPart2 = `You are a distinguished Professor of Soil Science and Agricultural Chemistry preparing Part 2 of the authoritative Master Exam Facts and Previous Year Questions (PYQ) Compendium.

TASK:
Convert the provided raw exam facts (Part 2: Soil Chemistry, Colloids, Ion Exchange, Problematic Soils & Reclamation, Erosion, Watershed, Nutrients, Fertilizers, Tillage, and Solved PYQs) into a meticulously structured, uncompressed GitHub Markdown document.

CRITICAL REQUIREMENTS:
1. ZERO OMISSION: Retain EVERY SINGLE fact, year tag (e.g. [AFO 2015-2022], [RRB SO 2018-2021], [NABARD 2021], [MCAER PGCET]), chemical equation, formula (SAR, ESP, USLE), threshold (pH, EC, ESP), fertilizer percentage, and solved MCQ question.
2. ORGANIZE INTO THEMATIC SECTIONS:
   ## 7. Soil Chemistry, Colloids, Ion Exchange & Organic Matter Fractions (PYQs & Facts)
   ## 8. Problematic Soils (Saline, Sodic/Alkali, Acidic) & Chemical Reclamation (PYQs & Facts)
   ## 9. Soil Erosion, Conservation & Watershed Management (PYQs & Facts)
   ## 10. Plant Nutrients, Deficiency Symptoms, Manures & Fertilizers (FCO 1985) (PYQs & Facts)
   ## 11. Tillage Operations, Puddling & Conservation Agriculture (PYQs & Facts)
   ## 12. Solved Previous Year Examination Questions Archive (Detailed Solutions)
3. FORMATTING:
   - Use bolding for tested terms, thresholds, and numbers.
   - Include comparison tables (e.g., Saline vs Sodic vs Saline-Sodic, Fertilizer nutrient contents, Biofertilizer types).
   - Clean up any OCR artifacts.
   - Do NOT repeat the main H1 title. Start with ## 7.`;

  const part2Markdown = await callGeminiWithRetry(promptPart2, half2);

  const combinedMaster = `${part1Markdown}\n\n---\n\n${part2Markdown}\n`;
  fs.writeFileSync(masterPath, combinedMaster, 'utf-8');
  console.log(`[Success] Master PYQ & Exam Facts file created: ${masterPath} (${combinedMaster.length} chars)`);
  return combinedMaster;
}

interface TopicUnitConfig {
  filename: string;
  title: string;
  rawFilename: string;
  isNutrientUnit?: boolean;
}

const TOPIC_UNITS: TopicUnitConfig[] = [
  {
    filename: '01_soil_science_fundamentals_rocks_and_minerals.md',
    title: 'Soil Science Fundamentals, Earth Crust Composition, Rocks & Minerals',
    rawFilename: 'unit_01_fundamentals_rocks_minerals.txt'
  },
  {
    filename: '02_soil_formation_weathering_and_pedology.md',
    title: 'Soil Formation, Weathering Processes, Master Horizons & Pedology',
    rawFilename: 'unit_02_formation_weathering_pedology.txt'
  },
  {
    filename: '03_soil_physical_properties.md',
    title: 'Soil Physical Properties: Texture, Structure, Density, Porosity & Color',
    rawFilename: 'unit_03_physical_properties.txt'
  },
  {
    filename: '04_soil_water_dynamics_and_measurement.md',
    title: 'Soil Water Dynamics, Moisture Constants, Potential, Movement & Measurement',
    rawFilename: 'unit_04_soil_water.txt'
  },
  {
    filename: '05_soils_of_india_and_soil_taxonomy.md',
    title: 'Major Soils of India & USDA Comprehensive Soil Taxonomy',
    rawFilename: 'unit_05_soils_of_india_taxonomy.txt'
  },
  {
    filename: '06_soil_chemistry_colloids_and_organic_matter.md',
    title: 'Soil Chemistry, Clay Colloids, Ion Exchange Capacity & Soil Organic Matter',
    rawFilename: 'unit_06_chemistry_colloids_om.txt'
  },
  {
    filename: '07_problematic_soils_and_reclamation.md',
    title: 'Problematic Soils: Saline, Sodic/Alkali, Acid Soils & Chemical Reclamation',
    rawFilename: 'unit_07_problematic_soils.txt'
  },
  {
    filename: '08_soil_erosion_conservation_and_watershed.md',
    title: 'Soil Erosion Mechanics, Universal Soil Loss Equation (USLE), Conservation & Watershed Management',
    rawFilename: 'unit_08_erosion_watershed.txt'
  },
  {
    filename: '09_plant_nutrients_manures_and_fertilizers.md',
    title: 'Essential Plant Nutrients, Deficiency Diagnosis, Manures, Fertilizers & Biofertilizers',
    rawFilename: 'unit_09_nutrients_fertilizers.txt',
    isNutrientUnit: true
  },
  {
    filename: '10_tillage_and_soil_management.md',
    title: 'Tillage Systems, Tilth Characteristics, Puddling & Modern Conservation Tillage',
    rawFilename: 'unit_10_tillage_management.txt'
  }
];

async function generateTopicalUnit(unit: TopicUnitConfig, masterFactsContext: string) {
  const targetPath = path.join(OUTPUT_DIR, unit.filename);
  if (fs.existsSync(targetPath)) {
    console.log(`[Existing File] Skipping ${unit.filename} (already exists).`);
    return;
  }

  console.log(`\n================================================================`);
  console.log(`Generating Topic Unit: ${unit.filename}`);
  console.log(`Title: ${unit.title}`);
  console.log(`================================================================`);

  const rawFilePath = path.join(RAW_DIR, unit.rawFilename);
  const rawText = fs.readFileSync(rawFilePath, 'utf-8');

  if (unit.isNutrientUnit) {
    // Generate Unit 09 in 2 comprehensive parts to prevent output token truncations
    console.log(`Nutrient unit detected: Splitting into Section A (Nutrients & Deficiency) and Section B (Manures, Fertilizers & Biofertilizers)...`);
    
    const paras = rawText.replace(/\r\n/g, '\n').split('\n\n').filter(p => p.trim().length > 0);
    const midIdx = Math.floor(paras.length / 2);
    const textPartA = paras.slice(0, midIdx).join('\n\n');
    const textPartB = paras.slice(midIdx).join('\n\n');

    const promptA = `You are a distinguished Professor of Soil Science and Agricultural Chemistry preparing master revision notes.
TOPIC: ${unit.title} (Part 1: Essential Nutrients, Biochemical Functions, Deficiency Symptoms, Toxicity & Diagnostic Criteria)

CRITICAL INSTRUCTION - MASTER EXAM FACTS & PYQ INTEGRATION:
You are provided with:
1. MASTER EXAM FACTS & PYQ REFERENCE SHEET
2. RAW TEXTBOOK CHAPTER CONTENT

You MUST thoroughly cross-reference and weave the relevant PYQs and exam facts into the notes:
- Tag tested concepts with bold brackets, e.g. **[IBPS-AFO 2016]**, **[RRB SO 2020]**, **[ICAR-JRF]**.
- Include dedicated callout blocks: \`> 💡 **Exam Pointer:**\` and \`> ⚠️ **Common Trap:**\`.
- Provide comprehensive Markdown tables for:
  - Criteria of essentiality (Arnon & Stout) and 17 essential elements.
  - Mobility in plants vs soil and deficiency symptom location (terminal buds, young leaves, old leaves).
  - Diagnostic indicator plants, physiological disorders (Khaira, Whiptail, Dieback, Marsh spot).
  - Luxury consumption, hidden hunger, antagonistic and synergistic effects (e.g. Zn & P).
- Zero data loss: keep all scientific terminology, chemical symbols, and numbers.`;

    const userPromptA = `### MASTER EXAM FACTS & PYQ REFERENCE SHEET:\n${masterFactsContext}\n\n### RAW CHAPTER CONTENT (PART A):\n${textPartA}`;
    const partAMarkdown = await callGeminiWithRetry(promptA, userPromptA);

    const promptB = `You are a distinguished Professor of Soil Science and Agricultural Chemistry preparing master revision notes.
TOPIC: ${unit.title} (Part 2: Manures, Fertilizers, Fertilizer Control Order 1985, Soil Nutrient Losses & Biofertilizers)

CRITICAL INSTRUCTION - MASTER EXAM FACTS & PYQ INTEGRATION:
You are provided with:
1. MASTER EXAM FACTS & PYQ REFERENCE SHEET
2. RAW TEXTBOOK CHAPTER CONTENT

You MUST thoroughly cross-reference and weave the relevant PYQs and exam facts into the notes:
- Tag tested concepts with bold brackets, e.g. **[IBPS-AFO 2018]**, **[RRB SO 2019]**, **[FCO 1985]**.
- Include dedicated callout blocks: \`> 💡 **Exam Pointer:**\` and \`> ⚠️ **Common Trap:**\`.
- Provide comprehensive Markdown tables for:
  - Bulky organic manures vs concentrated manures (FYM, Vermicompost, Compost methods: Bangalore vs Indore vs Heap).
  - Nitrogenous, phosphatic (water soluble, citrate soluble, insoluble), and potassic fertilizers with N, P2O5, K2O percentages.
  - Equivalent acidity and basicity of fertilizers.
  - Nitrogen transformations and loss mechanisms (volatilization, denitrification, leaching, nitrification).
  - Biofertilizers classification (Symbiotic, Free-living, Associative, P-solubilizers, VAM, BGA, Azolla) with host crops.
- Zero data loss: preserve every single percentage, chemical formula, and FCO standard. Do NOT repeat the main H1.`;

    const userPromptB = `### MASTER EXAM FACTS & PYQ REFERENCE SHEET:\n${masterFactsContext}\n\n### RAW CHAPTER CONTENT (PART B):\n${textPartB}`;
    const partBMarkdown = await callGeminiWithRetry(promptB, userPromptB);

    const combinedNutrients = `${partAMarkdown}\n\n---\n\n${partBMarkdown}\n`;
    fs.writeFileSync(targetPath, combinedNutrients, 'utf-8');
    console.log(`[Success] Written ${unit.filename} (${combinedNutrients.length} chars).`);
    return;
  }

  // Standard Unit Generation
  const systemPrompt = `You are a distinguished Professor of Soil Science and Agricultural Chemistry preparing authoritative, master-level revision notes for competitive exams (IBPS-AFO, ICAR-JRF, NABARD, RRB SO, State PSCs).
TOPIC: ${unit.title}

CRITICAL INSTRUCTION - GROUNDING WITH MASTER EXAM FACTS & PYQs:
You are provided with:
1. MASTER EXAM FACTS & PYQ REFERENCE SHEET (All tested facts and questions from previous year papers)
2. RAW TEXTBOOK CHAPTER CONTENT (Full factual text)

YOUR MANDATORY OBJECTIVES:
1. ZERO DATA LOSS: Preserve 100% of facts, scientific terms, formulas, classification thresholds, numerical constants, and tables from the textbook.
2. EXPLICIT PYQ & EXAM INTEGRATION:
   - Identify every concept in this unit that appears in the MASTER EXAM FACTS.
   - Mark the relevant facts with their exact exam tags in bold brackets, e.g., **[IBPS-AFO 2021]**, **[RRB SO 2018]**, **[MCAER 2019]**, **[BHU 2014]**.
   - Create high-contrast callout boxes:
     > 💡 **Exam Pointer:** For key numerical values, thresholds, recurring questions, and memory mnemonics.
     > ⚠️ **Common Trap:** For tricky distinctions often confused in exams.
3. RICH GITHUB MARKDOWN:
   - Clear heading hierarchy (# H1, ## H2, ### H3).
   - Rich Markdown tables comparing categories, formulas, properties, or soil types.
   - Display formulas in clean mathematical notation (LaTeX-style $...$).
4. END-OF-UNIT PYQ SECTION:
   - At the conclusion of the notes, include a dedicated section:
     \`## Previous Year Questions (PYQs) & Solved Rapid-Fire MCQs\`
     Present the exact solved previous year questions relevant to this topic with clear answers and brief pedagogical rationale.`;

  const userPrompt = `### MASTER EXAM FACTS & PYQ REFERENCE SHEET:\n${masterFactsContext}\n\n### RAW TEXTBOOK CONTENT FOR THIS UNIT:\n${rawText}`;
  const generatedMarkdown = await callGeminiWithRetry(systemPrompt, userPrompt);

  fs.writeFileSync(targetPath, generatedMarkdown, 'utf-8');
  console.log(`[Success] Written ${unit.filename} (${generatedMarkdown.length} chars).`);
}

async function main() {
  console.log('Starting Soil Science Notes Generation Pipeline...');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // 1. Generate standalone Master Exam Facts & PYQs unit first
  const masterFactsContext = await generateMasterFactsUnit();

  // 2. Generate each topic unit with master facts injected
  for (const unit of TOPIC_UNITS) {
    await generateTopicalUnit(unit, masterFactsContext);
  }

  console.log('\n================================================================');
  console.log('ALL SOIL SCIENCE MASTER NOTES SUCCESSFULLY GENERATED!');
  console.log(`Location: ${OUTPUT_DIR}`);
  console.log('================================================================\n');

  const generatedFiles = fs.readdirSync(OUTPUT_DIR);
  for (const f of generatedFiles) {
    const stats = fs.statSync(path.join(OUTPUT_DIR, f));
    console.log(`  - ${f} (${stats.size} bytes)`);
  }
}

main().catch(err => {
  console.error('Fatal Pipeline Error:', err);
  process.exit(1);
});
