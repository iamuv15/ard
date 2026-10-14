require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Ensure Notes directory exists
const notesDir = path.resolve('Notes');
if (!fs.existsSync(notesDir)) {
  fs.mkdirSync(notesDir, { recursive: true });
}

// 2. Extract word/document.xml if not already extracted
const xmlPath = path.join(notesDir, 'extracted_doc.xml');
if (!fs.existsSync(xmlPath)) {
  console.log('Extracting word/document.xml from Notes/animal.docx...');
  const psScript = `
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead('Notes/animal.docx')
    $entry = $zip.GetEntry('word/document.xml')
    $stream = $entry.Open()
    $reader = New-Object System.IO.StreamReader($stream)
    $xml = $reader.ReadToEnd()
    $reader.Close()
    $zip.Dispose()
    [System.IO.File]::WriteAllText('Notes/extracted_doc.xml', $xml)
  `;
  fs.writeFileSync('scratch/extract_temp.ps1', psScript);
  execSync('powershell -ExecutionPolicy Bypass -File scratch/extract_temp.ps1');
}

// 3. Parse paragraphs
console.log('Reading and parsing paragraphs from document...');
const xml = fs.readFileSync(xmlPath, 'utf-8');
const pMatches = xml.split('</w:p>');
const paragraphs = [];

for (const p of pMatches) {
  const tMatches = p.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
  const text = tMatches.map(m => m.replace(/<w:t[^>]*>([^<]+)<\/w:t>/, '$1')).join('');
  if (text.trim()) {
    paragraphs.push(text.trim());
  }
}
console.log(`Parsed ${paragraphs.length} paragraphs from animal.docx.\n`);

function sliceText(start, end) {
  const safeStart = Math.max(0, start);
  const safeEnd = Math.min(paragraphs.length - 1, end);
  return paragraphs.slice(safeStart, safeEnd + 1).join('\n\n');
}

// 4. Category Slices Definition
const categories = [
  {
    num: 1,
    filename: '01_livestock_breeds_and_genetics.md',
    title: 'Livestock Breeds & Genetics',
    ranges: [
      [276, 319],   // Scientific names & Chromosome numbers
      [736, 1647],  // Cattle, Buffalo, Goat, Sheep breeds
      [3111, 3209], // Swine classification & breeds
      [3416, 3526], // Exotic & indigenous pig breeds
      [3563, 3672], // Camel breeds & anatomy
      [3673, 3804], // Rabbit breeds
      [3805, 3850]  // Horse breeds & colors
    ]
  },
  {
    num: 2,
    filename: '02_reproductive_physiology_and_lifecycle.md',
    title: 'Reproductive Physiology & Lifecycle',
    ranges: [
      [566, 644],   // Gestation, Oestrous cycle, heat period, ovulation, AI timing, castration
      [665, 735],   // Animal breeding systems (inbreeding, outbreeding, crossbreeding)
      [3344, 3415], // Swine estrous cycle, heat detection, gestation & mating
      [3613, 3635]  // Camel reproduction parameters
    ]
  },
  {
    num: 3,
    filename: '03_animal_feeds_fodder_and_nutrition.md',
    title: 'Animal Feeds, Fodder & Nutrition',
    ranges: [
      [485, 495],   // Digestive system of ruminants (Rumen, Reticulum, Omasum, Abomasum)
      [1697, 1853], // Feeding schedules, space requirements, feed mangers, water intake
      [3288, 3343]  // Pig nutrition & feeding management
    ]
  },
  {
    num: 4,
    filename: '04_farm_management_practices_and_housing.md',
    title: 'Farm Management Practices & Housing',
    ranges: [
      [97, 221],    // Common animal husbandry terms
      [222, 275],   // Research institutes & 20th livestock census
      [320, 438],   // Husbandry terminology
      [439, 547],   // Vital parameters (temp, pulse, respiration), dentition, age determination
      [548, 565],   // Tools in animal husbandry
      [645, 664],   // Calf management
      [1648, 1696], // Housing systems (Cattle, Sheep, Goat)
      [3210, 3287], // Pig housing & floor space
      [3851, 4103]  // Important facts & exam one-liners
    ]
  },
  {
    num: 5,
    filename: '05_dairy_science_and_processing_technology.md',
    title: 'Dairy Science & Processing Technology',
    ranges: [
      [2707, 3110]  // Physical properties of milk, composition, FSSAI standards, milking methods, pasteurization, milk products, tests, ghee
    ]
  },
  {
    num: 6,
    filename: '06_poultry_husbandry_and_management.md',
    title: 'Poultry Husbandry & Management',
    ranges: [
      [2497, 2706]  // Poultry terminology, breeds, utility, egg composition, grading, AGMARK, rearing systems, housing
    ]
  },
  {
    num: 7,
    filename: '07_animal_healthcare_diseases_and_vaccination.md',
    title: 'Animal Healthcare, Diseases & Vaccination',
    ranges: [
      [1854, 2240], // All major infectious & metabolic diseases (Anthrax, BQ, FMD, HS, etc.)
      [2241, 2366], // Vaccination schedules (Cattle, Buffalo, Sheep, Goat)
      [2367, 2435], // Poultry diseases (Ranikhet, Marek's, Gumboro, Coccidiosis)
      [2436, 2496], // Common veterinary medicines & drugs
      [3527, 3562]  // Swine diseases
    ]
  }
];

// 5. Failover Gemini API Call
const keys = [
  { key: (process.env.GEMINI_API_KEY || '').trim(), label: 'FREE 1 (GEMINI_API_KEY)' },
  { key: (process.env.GEMINI_API_KEY_2 || '').trim(), label: 'FREE 2 (GEMINI_API_KEY_2)' }
].filter(k => k.key.length > 0);

if (keys.length === 0) {
  console.error('Error: No GEMINI_API_KEY or GEMINI_API_KEY_2 found in .env!');
  process.exit(1);
}

const MODEL = 'gemini-3.5-flash-lite';

async function callGemini(systemPrompt, userPrompt) {
  let lastError = null;

  for (let i = 0; i < keys.length; i++) {
    const { key, label } = keys[i];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

    try {
      console.log(`[API Call] Contacting Gemini with ${label}...`);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n---\nRAW TEXTBOOK CONTENT:\n${userPrompt}` }]
            }
          ],
          generationConfig: {
            temperature: 0.2
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 100) {
          console.log(`[API Call] Success with ${label} (received ${text.length} chars)`);
          return text;
        }
      }

      const errText = await res.text();
      console.warn(`[API Call] ${label} returned HTTP ${res.status}: ${errText.slice(0, 160)}`);
      lastError = new Error(`HTTP ${res.status}: ${errText}`);
    } catch (err) {
      console.warn(`[API Call] ${label} error: ${err.message}`);
      lastError = err;
    }

    if (i < keys.length - 1) {
      console.log(`[Failover] Falling back to next available key...`);
    }
  }

  throw lastError || new Error('All Gemini API keys failed.');
}

// 6. Execution Loop
async function run() {
  console.log(`Starting Generation for 7 Categories using ${MODEL}...`);
  console.log(`Configured Keys: ${keys.map(k => k.label).join(', ')}\n`);

  for (const cat of categories) {
    const targetFile = path.join(notesDir, cat.filename);
    console.log(`================================================================`);
    console.log(`Processing [${cat.num}/7]: ${cat.title}`);
    console.log(`Target: ${cat.filename}`);

    // Combine slices
    const combinedRawText = cat.ranges.map(([s, e]) => sliceText(s, e)).join('\n\n--- NEXT SECTION ---\n\n');
    console.log(`Extracted raw text: ${combinedRawText.length} characters (~${Math.round(combinedRawText.length / 4)} tokens)`);

    const systemPrompt = `You are a distinguished Veterinary and Agricultural Science professor preparing official master revision notes for competitive examinations (ICAR, JRF, State AO/AAO, IBPS-AFO, NABARD).

TASK:
Synthesize the provided raw textbook text for the category "${cat.title}" into a complete, high-yield, beautifully formatted GitHub Markdown document.

CRITICAL REQUIREMENTS:
1. ZERO FACT LEAKAGE: Do NOT summarize away or omit ANY numerical parameters, durations, percentages, species distinctions, horn shapes, origins, disease causal agents, or facts found in the raw text. Every single tested parameter must be present.
2. COMPARATIVE MATRICES: Whenever multi-species or multi-breed comparisons exist (e.g. reproductive cycles, gestation, feed requirements, milk composition, breed traits), construct comprehensive, properly formatted Markdown tables with full column alignment.
3. EXAM TRAPS & HIGH-YIELD CALLOUTS: Use GitHub alert syntax (\`> [!WARNING]\` and \`> [!TIP]\`) to prominently flag all exam trivia, past question pointers (AFO, JRF, RRB, BHU), and subtle traps.
4. STRUCTURE: Use clear markdown heading hierarchy (\`# ${cat.title}\`, \`## Subtopic\`, \`### Detail\`).
5. CLEANLINESS: Fix any OCR typos (e.g. 'oestrus', 'colostrum', 'lactation', 'Graafian follicle').

Output strictly pure GitHub Markdown.`;

    try {
      const markdown = await callGemini(systemPrompt, combinedRawText);
      fs.writeFileSync(targetFile, markdown, 'utf-8');
      console.log(`Saved: ${targetFile} (${fs.statSync(targetFile).size} bytes)`);
    } catch (err) {
      console.error(`FAILED to generate ${cat.filename}:`, err);
    }

    console.log(`Waiting 4 seconds before next call to respect rate limits...\n`);
    await new Promise(r => setTimeout(r, 4000));
  }

  console.log('================================================================');
  console.log('ALL 7 CATEGORY MD FILES PROCESSED SUCCESSFULLY IN Notes/ !');
}

run();
