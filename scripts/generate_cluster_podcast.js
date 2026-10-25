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

  const prompt = `You are a world-class science communicator and dialogue writer creating a cheerful, energetic, and engaging audio podcast overview on agricultural science—in the signature lively style of Google NotebookLM.

Your goal is to help students DEEPLY UNDERSTAND what each technical keyword means through crystal-clear everyday English, vivid physical analogies, and infectious enthusiasm. Make the dialogue feel vibrant, joyful, and easy to follow—never dry, monotone, or dull!

CO-HOSTS:
1. "Sarah" (voice: "af_heart"): Super enthusiastic, curious, and expressive co-host. She asks the questions every student is wondering, reacts with genuine wonder ("Oh wow!", "Wait, that's wild!", "Haha, right?!"), and connects ideas to daily life.
2. "Adam" (voice: "am_adam"): Warm, cheerful, and encouraging science educator. He speaks with a smile in his voice, breaks down complex mechanisms into simple, vivid mental pictures, and loves sharing "aha!" moments.

CLUSTER TITLE: "${clusterTitle}"
SUBCATEGORY: "${subCategoryName}"

CONCEPTS TO COVER IN EXACT ORDER:
${concepts.map((c, idx) => `
Keyword ${idx + 1}: ${c.term}
- Definition: ${c.definition}
- Study Notes: ${c.content ? c.content.slice(0, 400).replace(/\n+/g, ' ') : 'N/A'}
- Related Terms: ${c.relatedTerms ? JSON.stringify(c.relatedTerms) : 'N/A'}
`).join('\n')}

PEDAGOGICAL & DIALOGUE RULES:
1. CHEERFUL & ENGAGING CONVERSATIONAL ENGLISH:
   - Write in simple, crystal-clear, modern conversational English.
   - Inject genuine enthusiasm, warmth, and cheerful energy throughout. Use natural vocal interjections ("Oh, wow!", "Exactly!", "Haha, yes!", "Think of it this way...", "Picture this...").
   - Avoid dry, academic textbook lecturing. Keep sentences punchy, rhythmic, and fun to listen to!

2. SIMPLE ANALOGIES & FIRST-PRINCIPLES ANCHORS (Suggestion 1 & 2):
   - Unpack etymological roots playfully when helpful (e.g. "Texture comes from the Latin word 'texere'—which literally means 'to weave', like the weave of a shirt!").
   - Use vivid everyday comparisons (e.g. comparing Sand grains to beach pebbles or basketballs, Silt to smooth baking flour, and Clay to microscopic sticky sheets of paper; comparing specific surface area to football fields).
   - Explain physical mechanisms simply and intuitively. Do NOT make it unnecessarily complex.

3. HOLISTIC COMPANION TERMS (Suggestion 4):
   - Mention companion terms (like Eluviation, Illuviation, or Pore Space) only when they genuinely illuminate the main keyword.
   - Keep the spotlight firmly on the target keyword.

4. STRICT RULE: ZERO EXAM MENTIONS:
   - Do NOT mention "IBPS", "AFO", "JRF", "ICAR", "exams", "marks", "questions", or "traps".
   - The aim is 100% conceptual clarity and curiosity.

5. SPOKEN UNITS & PUNCTUATION FOR TTS:
   - Write all numbers and units as spoken words (e.g. write "point zero zero two millimeters", "percent", "microns").
   - Kokoro's neural synthesizer responds dynamically to punctuation: use exclamation marks for enthusiasm, commas and dashes for natural breathing pauses, and question marks for upbeat curiosity.

6. JSON FORMAT:
   - Output must be a valid JSON array of dialogue objects.
   - Each object must have:
     * "keyword": Exact name of the keyword being discussed (e.g. "${concepts[0].term}")
     * "speaker": Either "Sarah" or "Adam"
     * "text": The spoken dialogue line in cheerful English.

Total dialogue length should be around 450 - 650 words (approx 3 to 4 minutes of lively audio).`;

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
              temperature: 0.75
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
          turn.voice = (turn.speaker && turn.speaker.includes('Adam')) ? 'am_adam' : 'af_heart';
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
  let subtitle = 'NotebookLM-Style Cheerful Masterclass • Interactive Timestamps';
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
