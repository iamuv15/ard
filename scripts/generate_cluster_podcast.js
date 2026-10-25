require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

/**
 * Ask Gemini 3.5 Flash Lite to generate a high-yield, field-expert conversational dialogue
 */
async function generateDialogueScript(clusterTitle, concepts, subCategoryName) {
  console.log(`[Gemini] Calling ${GEMINI_MODEL} for cluster: "${clusterTitle}" (${concepts.length} concepts)...`);

  const prompt = `You are a curriculum director and master dialogue writer for premier agricultural competitive examinations (ICAR-AIEEA/JRF, IBPS-AFO, State AO/AAO, NABARD Grade A).

Write an authoritative, high-yield, engaging audio masterclass podcast script between two agricultural experts:
1. "Dr. Rao" (voice: "am_adam"): A veteran ICAR Emeritus Soil Scientist & Field Agronomist with 30 years of diagnostic field experience. He speaks with practical wisdom, connecting every book fact to farmer realities in the field.
2. "Kavya" (voice: "af_heart"): A brilliant ICAR-JRF / Agricultural Research Scholar preparing students for high-stakes exams. She calls out exact numerical cutoffs, formulas, and classic "examiner traps".

CLUSTER TITLE: "${clusterTitle}"
SUBCATEGORY: "${subCategoryName}"

CONCEPTS TO COVER IN ORDER:
${concepts.map((c, idx) => `
Keyword ${idx + 1}: ${c.term}
- Definition: ${c.definition}
- Study Notes: ${c.content ? c.content.slice(0, 400).replace(/\n+/g, ' ') : 'N/A'}
- Exam Traps / Alert: ${c.examTraps || 'N/A'}
`).join('\n')}

PEDAGOGICAL & FIELD EXPERT DIRECTIVES:
1. Sequence: Cover each keyword in numerical order. Each keyword MUST have 2 to 4 back-and-forth turns between Dr. Rao and Kavya.
2. Field-Level Realism: Dr. Rao MUST explain how the concept actually behaves in the field (e.g. soil feel, ribbon test between fingers, tractor draft power, plow pan smearing, irrigation water sedimentation, salt crusted domes, crop root response).
3. Exam Rigor: Kavya MUST emphasize exact size boundaries (USDA vs ISSS), chemical formulas (Calgon, H2O2, HCl), mathematical relations (Stokes v proportional to r^2), and call out deceptive exam questions.
4. Smooth Continuity: Transitions between keywords must feel like a continuous masterclass story, not isolated robotic flashcards.
5. JSON Format: You must output a JSON array of objects.
Each object must have exactly these keys:
- "keyword": Exact name of the keyword being discussed (e.g. "${concepts[0].term}")
- "speaker": Either "Dr. Rao" or "Kavya"
- "voice": Either "am_adam" (for Dr. Rao) or "af_heart" (for Kavya)
- "text": The spoken line (clean, natural English; spell tricky acronyms or non-English words phonetically if needed).

Total dialogue length should be around 500 - 800 words (approx 3.5 to 5 minutes of spoken audio).`;

  const keys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].filter(Boolean);
  let lastError = null;

  for (const key of keys) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.7
            }
          })
        });

        const data = await response.json();
        if (data.error) {
          console.warn(`[Gemini] Attempt ${attempt} error:`, data.error.message);
          lastError = data.error;
          await new Promise(r => setTimeout(r, 2000 * attempt));
          continue;
        }

        const rawJson = data.candidates[0].content.parts[0].text;
        const dialogue = JSON.parse(rawJson);
        console.log(`[Gemini] Successfully generated script with ${dialogue.length} dialogue turns!`);
        return dialogue;
      } catch (err) {
        lastError = err;
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
  }

  throw new Error(`Gemini API Error after retries: ${JSON.stringify(lastError)}`);
}

/**
 * Register or update the audio track in src/lib/audioRegistry.ts
 */
function updateAudioRegistry(trackInfo) {
  const registryPath = path.join(__dirname, '..', 'src', 'lib', 'audioRegistry.ts');
  let content = fs.readFileSync(registryPath, 'utf8');

  // Check if track already exists
  const existingRegex = new RegExp(`id:\\s*['"]${trackInfo.id}['"]`);
  if (existingRegex.test(content)) {
    console.log(`[Registry] Track ${trackInfo.id} already exists in registry. Updating timestamps...`);
    // Replace existing entry
    const trackBlockRegex = new RegExp(`\\{\\s*id:\\s*['"]${trackInfo.id}['"][\\s\\S]*?\\n\\s*\\},?`, 'm');
    content = content.replace(trackBlockRegex, formatTrackEntry(trackInfo) + ',');
  } else {
    console.log(`[Registry] Adding new track ${trackInfo.id} to registry...`);
    // Insert before the closing bracket of CHAPTER_AUDIO_REGISTRY
    const insertPoint = content.lastIndexOf(']');
    if (insertPoint !== -1) {
      content = content.slice(0, insertPoint).trimEnd() + ',\n' + formatTrackEntry(trackInfo) + '\n' + content.slice(insertPoint);
    }
  }

  fs.writeFileSync(registryPath, content, 'utf8');
  console.log(`[Registry] audioRegistry.ts updated successfully!`);
}

function formatTrackEntry(t) {
  const timestampsStr = t.keywordTimestamps 
    ? '    keywordTimestamps: ' + JSON.stringify(t.keywordTimestamps, null, 6).replace(/\n/g, '\n    ') + ',\n'
    : '';

  return `  {
    id: '${t.id}',
    title: '${t.title}',
    subtitle: '${t.subtitle}',
    audioUrl: '${t.audioUrl}',
    chapterNamePattern: ${t.chapterNamePattern},
    categoryPattern: ${t.categoryPattern},
    subCategoryPattern: ${t.subCategoryPattern},
    keywords: [
${t.keywords.map(k => `      '${k.replace(/'/g, "\\'")}'`).join(',\n')}
    ],
${timestampsStr}  }`;
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Default to Cluster 1 of Soil Texture & Mechanical Analysis if no args provided
  let targetChapterId = 16;
  let targetKeywords = [
    'Soil Texture',
    'Sand',
    'Silt',
    'Clay',
    'Coarse Sand',
    'Soil Textural Triangle'
  ];
  let clusterId = 'soil-texture-field-analysis';
  let clusterTitle = 'Soil Separates & Textural Triangle';
  let subtitle = 'Kokoro-82M Field Masterclass • Interactive Timestamps';
  let outputFilename = 'soil-texture-and-triangle.mp3';

  // Parse custom args if provided
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--keywords' && args[i + 1]) {
      targetKeywords = args[i + 1].split(',').map(s => s.trim());
    }
    if (args[i] === '--id' && args[i + 1]) {
      clusterId = args[i + 1];
    }
    if (args[i] === '--title' && args[i + 1]) {
      clusterTitle = args[i + 1];
    }
    if (args[i] === '--output' && args[i + 1]) {
      outputFilename = args[i + 1];
    }
  }

  console.log(`=======================================================`);
  console.log(`PODCAST PIPELINE: ${clusterTitle}`);
  console.log(`Keywords (${targetKeywords.length}):`, targetKeywords.join(', '));
  console.log(`=======================================================`);

  // 1. Fetch concepts from DB
  const concepts = await prisma.chapterConcept.findMany({
    where: {
      chapterId: targetChapterId,
      term: { in: targetKeywords }
    }
  });

  // Sort concepts in the exact requested order
  concepts.sort((a, b) => targetKeywords.indexOf(a.term) - targetKeywords.indexOf(b.term));

  if (concepts.length === 0) {
    console.error('No concepts found for keywords:', targetKeywords);
    return;
  }

  console.log(`[DB] Fetched ${concepts.length} concepts from database.`);

  // 2. Generate Script via Gemini 3.5 Flash Lite
  const dialogue = await generateDialogueScript(clusterTitle, concepts, concepts[0].subCategory || 'Soil Physical Properties');

  // Save dialogue to scratch
  const scratchDir = path.join(__dirname, '..', 'scratch');
  os_mkdir(scratchDir);
  const dialoguePath = path.join(scratchDir, `${clusterId}_dialogue.json`);
  fs.writeFileSync(dialoguePath, JSON.stringify(dialogue, null, 2), 'utf8');
  console.log(`[Script] Dialogue saved to ${dialoguePath}`);

  // 3. Synthesize with Kokoro-82M
  const outputAudioPath = path.join(__dirname, '..', 'public', 'audio', 'soil', outputFilename);
  console.log(`[Kokoro] Launching Kokoro-82M multi-voice synthesis...`);

  const pyScript = path.join(__dirname, 'synthesize_kokoro.py');
  const pythonCmd = `python "${pyScript}" "${dialoguePath}" "${outputAudioPath}"`;
  
  const stdout = execSync(pythonCmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  console.log(stdout);

  // Extract result JSON from stdout
  const resultMatch = stdout.match(/---RESULT_START---([\s\S]*?)---RESULT_END---/);
  if (!resultMatch) {
    throw new Error('Failed to parse result from Kokoro synthesis.');
  }

  const result = JSON.parse(resultMatch[1].trim());
  console.log(`[Pipeline] Synthesis complete! Total duration: ${result.total_duration}s`);
  console.log(`[Pipeline] Timestamps:`, result.keyword_timestamps);

  // 4. Update src/lib/audioRegistry.ts
  const trackInfo = {
    id: clusterId,
    title: clusterTitle,
    subtitle: `${subtitle} • ${Math.round(result.total_duration / 60)} mins`,
    audioUrl: `/audio/soil/${outputFilename}`,
    chapterNamePattern: '/soil/i',
    categoryPattern: '/physical|physics/i',
    subCategoryPattern: '/texture|mechanical/i',
    keywords: concepts.map(c => c.term),
    keywordTimestamps: result.keyword_timestamps
  };

  updateAudioRegistry(trackInfo);
  console.log(`\n🎉 ALL DONE! Interactive cluster podcast generated and wired up!`);
}

function os_mkdir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
