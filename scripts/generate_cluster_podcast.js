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

  const prompt = `You are a master science educator and dialogue writer creating an illuminating audio masterclass on agricultural science.

Your goal is to help students DEEPLY UNDERSTAND what each technical keyword means, its scientific mechanism, and its essential companion concepts.

SPEAKERS:
1. "Dr. Rao" (voice: "hm_omega"): A senior agricultural scientist with decades of field and soil diagnostic experience. He speaks warmly and naturally, connecting scientific concepts to real, observable physical phenomena on the ground.
2. "Kavya" (voice: "hf_alpha"): An agricultural researcher who explores the underlying scientific principles and etymological roots of terms.

CLUSTER TITLE: "${clusterTitle}"
SUBCATEGORY: "${subCategoryName}"

CONCEPTS TO COVER IN ORDER:
${concepts.map((c, idx) => `
Keyword ${idx + 1}: ${c.term}
- Definition: ${c.definition}
- Study Notes: ${c.content ? c.content.slice(0, 400).replace(/\n+/g, ' ') : 'N/A'}
- Related Terms: ${c.relatedTerms ? JSON.stringify(c.relatedTerms) : 'N/A'}
`).join('\n')}

PEDAGOGICAL & DIALOGUE RULES:
1. SCRIPT & LANGUAGE RULES (CRITICAL FOR TTS SYNTHESIZER):
   - You MUST write all Hindi conversational text in DEVANAGARI SCRIPT (e.g., "नमस्ते काव्या!", "खेत में जब हम मिट्टी को हाथ में उठाते हैं...", "इसका सीधा मतलब है...", "पानी का flow...").
   - You MUST keep all scientific keywords and technical terms in ENGLISH / Latin script (e.g. "Soil Texture", "Sand", "Silt", "Clay", "Quartz", "Macropores", "Cation Exchange Capacity", "Specific Surface Area", "Soil Textural Triangle").
   - DO NOT USE ROMAN HINDI (do NOT write "Namaste Kavya, aaj hum baat karenge"). Writing Roman Hindi breaks the text-to-speech pronunciation!
   - Example style:
     "नमस्ते काव्या! आज हम बात करेंगे Soil Texture के बारे में। खेत में जब आप मिट्टी को हाथ में उठाते हैं, तो उसका जो feel होता है—वो Sand, Silt और Clay के relative proportion की वजह से होता है।"

2. STRICT RULE: ZERO EXAM MENTIONS:
   - Do NOT mention "IBPS", "AFO", "JRF", "ICAR", "exams", "marks", "examiner", "questions", or "traps".
   - The focus is 100% on conceptual understanding, scientific intuition, and physical reality.

3. ETYMOLOGICAL & FIRST-PRINCIPLES ANCHOR (Suggestion 1):
   - Wherever applicable, briefly unpack the linguistic root or first principles of the word (e.g., Soil Texture: Latin word 'texere' meaning 'to weave' yaani bunna; Eluviation: 'Ex' [out] + 'Lavere' [to wash]; Saprolite: 'Sapros' [rotten] + 'Lithos' [rock]). This gives a lasting mental anchor.

4. SIMPLE PHYSICAL MECHANISM (Suggestion 2):
   - Explain the physical cause-and-effect mechanism ONLY when it makes the concept simpler and clearer to visualize.
   - Avoid unnecessary academic complexity that makes it hard. Keep it intuitive and elegant.

5. HOLISTIC COMPANION TERMS (Suggestion 4):
   - If a related concept is genuinely needed to understand the keyword (e.g., explaining Eluviation & Illuviation when discussing E Horizon, or Flocculation when discussing Aggregation), explain it clearly so the student sees the whole picture.
   - The primary spotlight must remain firmly on the main keyword under discussion. Do NOT force a related term in if it doesn't make the explanation easier.

6. SPOKEN UNITS & SYMBOLS:
   - Always write units and symbols as spoken words for clear TTS pronunciation (e.g. write "millimeter" instead of "mm", "percent" instead of "%", "microns" instead of "µm").
   - Avoid special punctuation like slashes, brackets, or asterisks in dialogue text.

7. JSON FORMAT:
   - Output must be a valid JSON array of dialogue objects.
   - Each object must have:
     * "keyword": Exact name of the keyword being discussed (e.g. "${concepts[0].term}")
     * "speaker": Either "Dr. Rao" or "Kavya"
     * "text": The spoken dialogue line in Devanagari Hindi with English technical terms.

Total dialogue length should be around 450 - 650 words (approx 3 to 4.5 minutes of spoken audio).`;

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
        for (const turn of dialogue) {
          if (!turn.text && turn.voice && turn.voice.length > 20) {
            turn.text = turn.voice;
          }
          turn.voice = (turn.speaker && (turn.speaker.includes('Rao') || turn.speaker.includes('Dr'))) ? 'hm_omega' : 'hf_alpha';
        }
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

  const idStr = `id: '${trackInfo.id}'`;
  const idIdx = content.indexOf(idStr);
  if (idIdx !== -1) {
    console.log(`[Registry] Track ${trackInfo.id} already exists in registry. Updating entry...`);
    const startBrace = content.lastIndexOf('{', idIdx);
    let braceCount = 0;
    let endBrace = -1;
    for (let i = startBrace; i < content.length; i++) {
      if (content[i] === '{') braceCount++;
      else if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          endBrace = i;
          break;
        }
      }
    }
    if (endBrace !== -1) {
      // Check if followed by comma
      const after = content.slice(endBrace + 1);
      const commaFollows = after.trimStart().startsWith(',');
      const sliceEnd = commaFollows ? endBrace + 1 + after.indexOf(',') + 1 : endBrace + 1;
      content = content.slice(0, startBrace) + formatTrackEntry(trackInfo) + (commaFollows ? ',' : '') + content.slice(sliceEnd);
    }
  } else {
    console.log(`[Registry] Adding new track ${trackInfo.id} to registry...`);
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
  
  const stdout = execSync(pythonCmd, { 
    encoding: 'utf8', 
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
  });
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
