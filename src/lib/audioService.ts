import prisma from './prisma';
import { uploadAudioBuffer, deleteAudioFile } from './storageService';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const GEMINI_TTS_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-lite-tts';

// In-memory set of keys that have hit 429 quota exhaustion to prevent futile retries
const exhaustedKeys = new Set<string>();

/**
 * Human-readable label for logging key transitions
 */
function getKeyLabel(key: string): string {
  if (key === process.env.GEMINI_PAID_API_KEY || key === process.env.GEMINI_API_KEY_PAID) {
    return 'GEMINI_PAID_API_KEY (Paid Tier)';
  }
  if (key === process.env.GEMINI_API_KEY) return 'GEMINI_API_KEY (Free #1)';
  if (key === process.env.GEMINI_API_KEY_2) return 'GEMINI_API_KEY_2 (Free #2)';
  if (key === process.env.GEMINI_API_KEY_3) return 'GEMINI_API_KEY_3 (Free #3)';
  if (key === process.env.GEMINI_API_KEY_4) return 'GEMINI_API_KEY_4 (Free #4)';
  if (key === process.env.GEMINI_API_KEY_5) return 'GEMINI_API_KEY_5 (Free #5)';
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

/**
 * Returns Gemini API keys in strict priority:
 * 1. Free keys in exact numerical order (GEMINI_API_KEY -> GEMINI_API_KEY_2 -> GEMINI_API_KEY_3 -> GEMINI_API_KEY_4 -> GEMINI_API_KEY_5)
 * 2. Only if ALL free keys fail/exhaust quota, GEMINI_PAID_API_KEY is activated as the ultimate fallback.
 */
function getGeminiApiKeys(): string[] {
  const freeKeys = [
    process.env.GEMINI_API_KEY,    // Free Key #1
    process.env.GEMINI_API_KEY_2,  // Free Key #2
    process.env.GEMINI_API_KEY_3,  // Free Key #3
    process.env.GEMINI_API_KEY_4,  // Free Key #4
    process.env.GEMINI_API_KEY_5   // Free Key #5
  ].filter(Boolean) as string[];

  const paidKey = process.env.GEMINI_PAID_API_KEY || process.env.GEMINI_API_KEY_PAID;

  // Filter out exhausted free keys
  const availableFreeKeys = freeKeys.filter(k => !exhaustedKeys.has(k));

  if (availableFreeKeys.length > 0) {
    // Return available free keys in strict numerical order first, appending paid key at the end as final resort
    return paidKey && !exhaustedKeys.has(paidKey) 
      ? [...availableFreeKeys, paidKey] 
      : availableFreeKeys;
  }

  // All free keys are exhausted! Activate the paid API key
  if (paidKey && !exhaustedKeys.has(paidKey)) {
    console.warn('[Gemini Auth] All free tier API keys exhausted! Activating GEMINI_PAID_API_KEY...');
    return [paidKey];
  }

  // If even the paid key is exhausted or everything is marked, reset cache
  console.warn('[Gemini Auth] All free and paid keys exhausted or marked. Resetting cache...');
  exhaustedKeys.clear();
  return paidKey ? [...freeKeys, paidKey] : freeKeys;
}

export interface ProposedCluster {
  title: string;
  rationale: string;
  conceptIds: number[];
  concepts: {
    id: number;
    term: string;
    definition: string;
  }[];
}

/**
 * Encodes 16-bit Mono PCM audio into ultra-compressed Ogg Opus at 32 kbps mono
 */
async function encodePcmToOpus(pcmBuffer: Buffer, sampleRate = 24000, bitrateKbps = 32): Promise<Buffer> {
  const opusModule = (await import('@audio/encode-opus')).default;
  const numSamples = Math.floor(pcmBuffer.length / 2);
  const floatSamples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const int16 = pcmBuffer.readInt16LE(i * 2);
    floatSamples[i] = int16 < 0 ? int16 / 32768 : int16 / 32767;
  }

  const encoder = await opusModule({
    sampleRate,
    channels: 1,
    bitrate: bitrateKbps, // 32 kbps mono
    application: 'audio'
  });

  const chunk = encoder.encode([floatSamples]);
  const tail = encoder.flush();
  encoder.free();

  return Buffer.concat([Buffer.from(chunk), Buffer.from(tail)]);
}

/**
 * Synthesizes a batch of dialogue turns to raw 16-bit PCM samples using Google Cloud Text-to-Speech Neural2
 * (Kavya: hi-IN-Neural2-A, Dr. Rao: hi-IN-Neural2-B)
 * Draws directly from Google Cloud credits, with first 1,000,000 characters/month free.
 */
async function synthesizeTurnsWithGoogleCloudTts(turns: any[]): Promise<Buffer> {
  const apiKey = process.env.Cloud_ARD_Static_Key || process.env.GOOGLE_CLOUD_TTS_API_KEY;
  if (!apiKey) {
    throw new Error('No Cloud_ARD_Static_Key or GOOGLE_CLOUD_TTS_API_KEY configured in environment');
  }

  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
  const pcmChunks: Buffer[] = [];
  const pauseBetweenTurns = Buffer.alloc(Math.round(24000 * 0.25) * 2); // 250ms natural conversational pause

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    const isFemale = (turn.speaker || '').toLowerCase().includes('kavya');
    const voiceName = isFemale ? 'hi-IN-Neural2-A' : 'hi-IN-Neural2-B';
    const ssmlGender = isFemale ? 'FEMALE' : 'MALE';

    const payload = {
      input: { text: turn.text },
      voice: {
        languageCode: 'hi-IN',
        name: voiceName,
        ssmlGender
      },
      audioConfig: {
        audioEncoding: 'LINEAR16',
        sampleRateHertz: 24000,
        speakingRate: 1.0
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.error) {
      throw new Error(`Google Cloud TTS error (${voiceName}): ${data.error.message || JSON.stringify(data.error)}`);
    }

    if (!data.audioContent) {
      throw new Error(`No audioContent received from Google Cloud TTS for turn ${i + 1}`);
    }

    const wavBuffer = Buffer.from(data.audioContent, 'base64');
    // Strip 44-byte WAV header to get raw 16-bit PCM
    const rawPcm = wavBuffer.length > 44 ? wavBuffer.subarray(44) : wavBuffer;
    pcmChunks.push(rawPcm);

    if (i < turns.length - 1) {
      pcmChunks.push(pauseBetweenTurns);
    }
  }

  return Buffer.concat(pcmChunks);
}

/**
 * Synthesizes a batch of dialogue turns to raw 16-bit PCM samples using Gemini 3.8 Flash-Lite TTS
 */
async function synthesizeTurnsToPcm(turns: any[]): Promise<Buffer> {
  const apiKeys = getGeminiApiKeys();
  if (apiKeys.length === 0) {
    throw new Error('No GEMINI_API_KEY configured in environment variables');
  }

  const payload = {
    contents: [{
      parts: turns.map(t => ({
        text: t.text,
        speech_metadata: {
          speaker: t.speaker || 'Kavya',
          style: t.style || 'warm and conversational'
        }
      }))
    }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            { speaker: 'Kavya', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } },
            { speaker: 'Dr. Rao', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } }
          ]
        }
      }
    }
  };

  let lastErr: any = null;
  for (const key of apiKeys) {
    const keyLabel = getKeyLabel(key);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent?key=${key}`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.error) {
          const isQuota = data.error.code === 429 ||
                          data.error.status === 'RESOURCE_EXHAUSTED' ||
                          (data.error.message && data.error.message.includes('quota'));
          if (isQuota) {
            console.warn(`[Gemini TTS] ${keyLabel} quota limit exceeded (429). Instantly falling back to next available key...`);
            exhaustedKeys.add(key);
            lastErr = new Error(`${keyLabel}: ${data.error.message}`);
            break; // Break inner loop immediately to try the next key!
          }
          throw new Error(data.error.message || JSON.stringify(data.error));
        }

        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.inlineData?.data) {
          const rawWav = Buffer.from(data.candidates[0].content.parts[0].inlineData.data, 'base64');
          return rawWav.subarray(44);
        }
        throw new Error('No audio data in Gemini TTS response');
      } catch (err: any) {
        lastErr = err;
        if (!exhaustedKeys.has(key) && attempt < 2) {
          console.warn(`[Gemini TTS] Attempt ${attempt} on ${keyLabel} failed: ${err.message}. Retrying...`);
          await new Promise(r => setTimeout(r, 800));
        }
      }
    }
  }

  throw new Error(`All Gemini TTS attempts failed across ${apiKeys.length} keys: ${lastErr?.message || lastErr}`);
}

/**
 * Intelligently plan interdependent concept clusters within a single subcategory
 */
export async function planSubCategoryClusters(
  chapterId: number,
  subCategory: string
): Promise<ProposedCluster[]> {
  // Fetch only unassigned concepts in this subcategory
  const concepts = await prisma.chapterConcept.findMany({
    where: {
      chapterId,
      subCategory,
      audioTrackId: null
    },
    select: {
      id: true,
      term: true,
      definition: true,
      content: true,
      relatedTerms: true,
      order: true
    },
    orderBy: { order: 'asc' }
  });

  if (concepts.length === 0) return [];

  // If 7 or fewer concepts, group them naturally into a single cohesive cluster
  if (concepts.length <= 7) {
    return [
      {
        title: subCategory,
        rationale: `All ${concepts.length} concepts form a single foundational curriculum arc for ${subCategory}.`,
        conceptIds: concepts.map(c => c.id),
        concepts: concepts.map(c => ({ id: c.id, term: c.term, definition: c.definition }))
      }
    ];
  }

  // If > 7 concepts, ask Gemini 3.5 Flash Lite to find the natural interdependent teaching arcs
  console.log(`[Audio Planner] Grouping ${concepts.length} concepts in "${subCategory}" with Gemini...`);

  const prompt = `You are an expert curriculum designer and science educator.
You need to partition ${concepts.length} agricultural concepts from the subcategory "${subCategory}" into cohesive, interdependent audio masterclass clusters.

EACH CLUSTER MUST:
- Contain between 4 and 7 concepts (optimal for a 4 to 6 minutes conversational audio podcast).
- Keep concepts that physically, logically, or pedagogically depend on each other together in the SAME cluster (e.g. particle sizes with classification triangle; Stokes' Law with hydrometer sedimentation; nitrogen mineralization with nitrification).
- Include an intuitive, distinct title for each cluster.
- Provide a clear 1-sentence rationale explaining WHY these concepts belong together in a single narrative explanation.
- Ensure EVERY concept ID is assigned to EXACTLY ONE cluster (no duplicates, no omissions).

CONCEPTS TO CLUSTER:
${JSON.stringify(concepts.map(c => ({
  id: c.id,
  term: c.term,
  definition: c.definition.slice(0, 200),
  relatedTerms: c.relatedTerms
})), null, 2)}

OUTPUT FORMAT:
Return a valid JSON array of cluster objects:
[
  {
    "title": "Descriptive Cluster Title",
    "rationale": "Clear 1-sentence reason why these specific concepts form an interdependent narrative.",
    "conceptIds": [123, 124, 125, ...]
  }
]`;

  const keys = getGeminiApiKeys();
  let lastError = null;

  for (const key of keys) {
    const keyLabel = getKeyLabel(key);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.3
          }
        })
      });

      const data = await response.json();
      if (data.error) {
        if (data.error.code === 429 || data.error.status === 'RESOURCE_EXHAUSTED') {
          console.warn(`[Audio Planner] ${keyLabel} quota limit exceeded. Falling back to next available key...`);
          exhaustedKeys.add(key);
          lastError = new Error(data.error.message);
          continue;
        }
        throw new Error(data.error.message);
      }

      const rawJson = data.candidates[0].content.parts[0].text;
      const parsedClusters: { title: string; rationale: string; conceptIds: number[] }[] = JSON.parse(rawJson);

      const conceptMap = new Map(concepts.map(c => [c.id, c]));

      return parsedClusters.map(cl => ({
        title: cl.title,
        rationale: cl.rationale,
        conceptIds: cl.conceptIds,
        concepts: cl.conceptIds
          .map(id => conceptMap.get(id))
          .filter((c): c is typeof concepts[0] => Boolean(c))
          .map(c => ({ id: c.id, term: c.term, definition: c.definition }))
      }));
    } catch (err) {
      lastError = err;
    }
  }

  // Fallback: chunk sequentially in groups of 6
  console.warn('[Audio Planner] Gemini clustering failed, falling back to sequential chunks:', lastError);
  const fallbackClusters: ProposedCluster[] = [];
  const chunkSize = 6;
  for (let i = 0; i < concepts.length; i += chunkSize) {
    const chunk = concepts.slice(i, i + chunkSize);
    const partNum = Math.floor(i / chunkSize) + 1;
    fallbackClusters.push({
      title: `${subCategory} (Part ${partNum})`,
      rationale: `Sequential syllabus progression covering concepts ${i + 1} to ${Math.min(i + chunkSize, concepts.length)}.`,
      conceptIds: chunk.map(c => c.id),
      concepts: chunk.map(c => ({ id: c.id, term: c.term, definition: c.definition }))
    });
  }
  return fallbackClusters;
}

/**
 * Generate dialogue script via Gemini 3.5 Flash-Lite
 */
async function generateDialogueScript(
  clusterTitle: string,
  subCategoryName: string,
  concepts: { id: number; term: string; definition: string; content?: string; relatedTerms?: string[] }[]
) {
  console.log(`[Gemini] Generating 4-5 minute script for cluster "${clusterTitle}" (${concepts.length} concepts)...`);

  const prompt = `You are a master science communicator and dialogue writer creating a deeply engaging, 4 to 5 minutes audio masterclass on agricultural science.

Your goal is to help students DEEPLY UNDERSTAND what each technical keyword means, its physical mechanism, and its essential scientific intuition. 
The dialogue must sound like two genuine human scientists speaking warmly, thoughtfully, and naturally together in conversational Hinglish.

CO-HOSTS:
1. "Dr. Rao": A veteran senior soil scientist with decades of field and diagnostic experience. He speaks warmly and calmly, with rich human vocal modulation, connecting science to observable ground reality.
2. "Kavya": An insightful agricultural researcher who explores first-principles mechanisms, etymology, and asks deep, thoughtful questions.

CLUSTER TITLE: "${clusterTitle}"
SUBCATEGORY: "${subCategoryName}"

CONCEPTS TO COVER IN EXACT ORDER:
${concepts.map((c, idx) => `
Keyword ${idx + 1}: ${c.term}
- Definition: ${c.definition}
- Study Notes: ${c.content ? c.content.slice(0, 450).replace(/\n+/g, ' ') : 'N/A'}
- Related Terms: ${c.relatedTerms ? JSON.stringify(c.relatedTerms) : 'N/A'}
`).join('\n')}

PEDAGOGICAL & DIALOGUE RULES:
1. NATURAL CONVERSATIONAL HINGLISH & SCRIPT RULES:
   - Write all conversational Hindi in DEVANAGARI SCRIPT (e.g., "नमस्ते काव्या!", "खेत में जब हम मिट्टी को हाथ में लेते हैं...", "इसका सीधा भौतिक कारण है...", "पानी की निकासी...").
   - Keep all scientific keywords and technical terms in ENGLISH Latin script (e.g. "Soil Texture", "Stokes' Law", "Sedimentation Velocity", "Hydrometer", "Bouyoucos Method").
   - DO NOT USE ROMANIZED HINDI ("Namaste Kavya" -> WRONG. Use "नमस्ते काव्या!").
   - Make sentences flow naturally with real human cadence, reflective pauses, and conversational warmth.

2. VOICE MODULATION & STYLE TAGS:
   - For every dialogue turn, provide a specific "style" instruction for Gemini's neural voice engine (e.g. "warm and conversational, speaking thoughtfully", "curious and engaged, inquiring", "calm, authoritative educator with a smile", "reflective with emphasis on key mechanism").
   - You may use inline tags like <short pause> or <chuckle> where appropriate to make speech cadence sound completely human.

3. DURATION & DEPTH (4 to 5 MINUTES):
   - Total dialogue length must be approximately 700 to 900 words (aiming for 4 to 5 minutes of spoken audio).
   - Give each keyword sufficient depth (at least 2 to 4 back-and-forth turns per keyword) so the student truly grasps the concept, rather than a rushed summary.

4. ETYMOLOGY & PHYSICAL MECHANISMS:
   - Unpack etymological origins when helpful (e.g. Latin or Greek root origins).
   - Explain the physical cause-and-effect mechanism clearly. Keep it visual and simple.

5. HOLISTIC COMPANION TERMS:
   - Mention companion terms only when they genuinely clarify the main keyword.
   - The primary spotlight must remain firmly on the main keyword under discussion.

6. STRICT RULE: ZERO EXAM MENTIONS:
   - Do NOT mention "IBPS", "AFO", "JRF", "ICAR", "exams", "marks", "questions", or "traps".
   - The focus is 100% on conceptual intuition and real-world understanding.

7. JSON FORMAT:
   - Output must be a valid JSON array of dialogue objects.
   - Each object must have:
     * "keyword": Exact name of the keyword being discussed (e.g. "${concepts[0].term}")
     * "speaker": Either "Dr. Rao" or "Kavya"
     * "style": Vocal acting instruction (e.g. "warm and conversational", "curious and thoughtful")
     * "text": Spoken line in Devanagari Hindi with English technical terms.
   - Do NOT include any trailing commas or unescaped quotes inside dialogue strings.`;

  const keys = getGeminiApiKeys();
  let lastError: any = null;

  for (const key of keys) {
    const keyLabel = getKeyLabel(key);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
      
      const payload: any = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                keyword: { type: 'STRING' },
                speaker: { type: 'STRING', enum: ['Dr. Rao', 'Kavya'] },
                style: { type: 'STRING' },
                text: { type: 'STRING' }
              },
              required: ['keyword', 'speaker', 'style', 'text']
            }
          },
          temperature: 0.7
        }
      };

      let response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let data = await response.json();

      // If model version does not support responseSchema (HTTP 400), fall back gracefully
      if (data.error && data.error.code === 400 && data.error.message?.toLowerCase().includes('schema')) {
        delete payload.generationConfig.responseSchema;
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        data = await response.json();
      }

      if (data.error) {
        if (data.error.code === 429 || data.error.status === 'RESOURCE_EXHAUSTED') {
          console.warn(`[Gemini Script] ${keyLabel} quota limit exceeded. Falling back to next available key...`);
          exhaustedKeys.add(key);
          lastError = new Error(data.error.message);
          continue;
        }
        throw new Error(data.error.message);
      }

      const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJson) {
        throw new Error('Empty response received from Gemini dialogue model');
      }

      // Step 1: Clean and parse locally
      try {
        const dialogue = cleanAndParseJson(rawJson);
        if (Array.isArray(dialogue) && dialogue.length > 0) {
          console.log(`[Gemini Script] Generated successfully with ${dialogue.length} dialogue turns using ${keyLabel}!`);
          return dialogue;
        }
      } catch (parseErr: any) {
        console.warn(`[Gemini Script] Direct JSON parse failed (${parseErr.message}). Triggering bounded 1-shot AI repair with ${keyLabel}...`);
        
        // Step 2: 1-Shot AI Repair with strict infinite-loop protection (0 recursion, max 1 fetch)
        const repaired = await repairJsonWithAi(rawJson, parseErr.message, key);
        if (repaired && Array.isArray(repaired) && repaired.length > 0) {
          console.log(`[Gemini Script] Successfully parsed dialogue after 1-shot AI repair (${repaired.length} turns)!`);
          return repaired;
        }

        // If repair failed, proceed to next fallback key
        lastError = parseErr;
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  throw new Error(`Failed to generate dialogue script: ${lastError?.message || lastError}`);
}

/**
 * Robust JSON Sanitization & Parsing Helper
 * Strips markdown code fences, trailing commas, comments, and isolates valid array bounds.
 */
function cleanAndParseJson(raw: string): any {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Empty response string');
  }

  let text = raw.trim();

  // Strip markdown code fences (```json ... ``` or ``` ...)
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Locate the outermost array boundaries
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    text = text.substring(firstBracket, lastBracket + 1);
  }

  // Strip single-line JS comments (// ...)
  text = text.replace(/\/\/[^\n\r]*/g, '');

  // Remove trailing commas before } or ]
  text = text.replace(/,\s*([\]}])/g, '$1');

  try {
    return JSON.parse(text);
  } catch (err: any) {
    // Attempt secondary regex fix for unescaped inner quotes in Devanagari text values
    try {
      const relaxed = text.replace(
        /("text"\s*:\s*")((?:[^"\\]|\\.)*)(")/g,
        (_, p1, p2, p3) => p1 + p2.replace(/"/g, "'") + p3
      );
      return JSON.parse(relaxed);
    } catch {
      throw err;
    }
  }
}

/**
 * 1-Shot Bounded AI JSON Repair
 * Will execute AT MOST 1 attempt. Zero recursion, zero while-loops, zero infinite-loop traps.
 */
async function repairJsonWithAi(
  malformedText: string,
  parseError: string,
  key: string
): Promise<any[] | null> {
  const keyLabel = getKeyLabel(key);
  try {
    const repairPrompt = `You are a strict JSON repair engine.
The following JSON text produced a syntax error: "${parseError}".
Repair it so that it is a 100% syntactically valid JSON array of objects.
Each object in the array must have the following keys:
- "keyword": string
- "speaker": string ("Dr. Rao" or "Kavya")
- "style": string
- "text": string

DO NOT CHANGE any of the Devanagari Hindi or English dialogue content. Just fix the broken quotes, commas, brackets, or unquoted keys so that JSON.parse() succeeds.
OUTPUT ONLY THE RAW VALID JSON ARRAY. ZERO EXPLANATION, ZERO MARKDOWN FENCES.

BROKEN TEXT:
${malformedText.slice(0, 4500)}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: repairPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1 // strictly deterministic
        }
      })
    });

    const data = await response.json();
    if (data.error) {
      console.warn(`[JSON Repair] Model returned error: ${data.error.message}`);
      return null;
    }

    const repairedRaw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!repairedRaw) return null;

    const parsed = cleanAndParseJson(repairedRaw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err: any) {
    console.warn(`[JSON Repair] 1-shot repair failed with ${keyLabel}: ${err.message}`);
  }
  return null;
}

export type AudioEngine = 'google-cloud' | 'gemini';

/**
 * Generate full audio track for a cluster of concepts and store in Supabase Bucket
 */
export async function generateAudioForCluster(params: {
  chapterId: number;
  subCategory: string;
  title: string;
  conceptIds: number[];
  engine?: AudioEngine;
}) {
  const hasGcpKey = Boolean(process.env.Cloud_ARD_Static_Key || process.env.GOOGLE_CLOUD_TTS_API_KEY);
  const {
    chapterId,
    subCategory,
    title,
    conceptIds,
    engine = hasGcpKey ? 'google-cloud' : 'gemini'
  } = params;

  // 1. Fetch concepts
  const concepts = await prisma.chapterConcept.findMany({
    where: {
      id: { in: conceptIds },
      chapterId
    }
  });

  // Preserve requested order
  concepts.sort((a, b) => conceptIds.indexOf(a.id) - conceptIds.indexOf(b.id));

  if (concepts.length === 0) {
    throw new Error('No valid concepts found for cluster');
  }

  // 2. Generate Script
  const dialogue = await generateDialogueScript(title, subCategory, concepts);

  // 3. Synthesize via selected engine (Google Cloud Neural2 or Gemini 3.8 Flash-Lite)
  // Group dialogue turns by keyword
  const keywordGroups: { keyword: string; turns: any[] }[] = [];
  let currentKw = '';
  let currentTurns: any[] = [];

  for (const turn of dialogue) {
    const kw = (turn.keyword || '').trim() || currentKw || 'Introduction';
    if (kw !== currentKw) {
      if (currentTurns.length > 0) {
        keywordGroups.push({ keyword: currentKw, turns: currentTurns });
      }
      currentKw = kw;
      currentTurns = [turn];
    } else {
      currentTurns.push(turn);
    }
  }
  if (currentTurns.length > 0) {
    keywordGroups.push({ keyword: currentKw, turns: currentTurns });
  }

  console.log(`[Audio Synthesis] Synthesizing ${keywordGroups.length} keyword clusters using engine: "${engine}"...`);

  const sampleRate = 24000;
  const pcmBuffers: Buffer[] = [];
  const keywordTimestamps: Record<string, number> = {};
  let currentPcmBytes = 0;
  const transitionPause = Buffer.alloc(Math.round(sampleRate * 0.55) * 2); // 550ms silence

  for (let idx = 0; idx < keywordGroups.length; idx++) {
    const { keyword, turns } = keywordGroups[idx];
    const timestampSec = Math.round((currentPcmBytes / (sampleRate * 2)) * 100) / 100;
    keywordTimestamps[keyword] = timestampSec;

    let pcmChunk: Buffer;
    if (engine === 'google-cloud') {
      try {
        console.log(`[Google Cloud TTS] (${idx + 1}/${keywordGroups.length}) "${keyword}" -> ${timestampSec}s (${turns.length} turns)`);
        pcmChunk = await synthesizeTurnsWithGoogleCloudTts(turns);
      } catch (gcpErr: any) {
        console.warn(`[Google Cloud TTS] Error for "${keyword}": ${gcpErr.message}. Falling back to Gemini TTS...`);
        pcmChunk = await synthesizeTurnsToPcm(turns);
      }
    } else {
      console.log(`[Gemini TTS] (${idx + 1}/${keywordGroups.length}) "${keyword}" -> ${timestampSec}s (${turns.length} turns)`);
      pcmChunk = await synthesizeTurnsToPcm(turns);
    }

    pcmBuffers.push(pcmChunk);
    currentPcmBytes += pcmChunk.length;

    // Transition pause between concepts (except after final concept)
    if (idx < keywordGroups.length - 1) {
      pcmBuffers.push(transitionPause);
      currentPcmBytes += transitionPause.length;
    }
  }

  const combinedPcm = Buffer.concat(pcmBuffers);
  const totalDurationSec = Math.round((combinedPcm.length / (sampleRate * 2)) * 100) / 100;

  console.log(`[Opus Encoder] Compressing ${combinedPcm.length} bytes of raw PCM to 32 kbps Opus...`);
  const opusBuffer = await encodePcmToOpus(combinedPcm, sampleRate, 32);
  console.log(`[Opus Encoder] Compressed to ${opusBuffer.length} bytes (~${(opusBuffer.length / (1024 * 1024)).toFixed(2)} MB)!`);

  // 4. Upload to Supabase Storage
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const subCategorySlug = subCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const storagePath = `chapter-${chapterId}/${subCategorySlug}/${slug}.opus`;
  console.log(`[Storage] Uploading audio to destination: ${storagePath} (${opusBuffer.length} bytes)...`);

  const uploadResult = await uploadAudioBuffer(opusBuffer, storagePath, 'audio/ogg');

  // 5. Save ChapterAudioTrack record in Postgres
  const engineLabel = engine === 'google-cloud' ? 'Google Cloud Neural2' : 'Gemini 3.8 Flash-Lite';
  const track = await prisma.chapterAudioTrack.create({
    data: {
      chapterId,
      subCategory,
      title,
      subtitle: `${engineLabel} • Opus 32 kbps • Natural Hinglish • ${(totalDurationSec / 60).toFixed(1)} mins`,
      audioUrl: uploadResult.url,
      storagePath: uploadResult.storagePath,
      durationSec: totalDurationSec,
      fileSizeBytes: uploadResult.sizeBytes,
      keywordTimestamps: keywordTimestamps,
      status: 'COMPLETED'
    }
  });

  // 6. Lock concepts to this track (enforcing primary explanation non-duplication)
  await prisma.chapterConcept.updateMany({
    where: { id: { in: concepts.map(c => c.id) } },
    data: { audioTrackId: track.id }
  });

  console.log(`🎉 [Audio Service] Successfully created audio track "${track.title}" (ID: ${track.id}) with ${concepts.length} concepts locked!`);

  return {
    track,
    conceptsCount: concepts.length
  };
}

/**
 * Delete an audio track from DB & Storage, freeing concepts back to pending
 */
export async function removeAudioTrack(trackId: string) {
  const track = await prisma.chapterAudioTrack.findUnique({
    where: { id: trackId }
  });

  if (!track) throw new Error('Track not found');

  // 1. Delete from storage
  await deleteAudioFile(track.storagePath);

  // 2. Unlink concepts
  await prisma.chapterConcept.updateMany({
    where: { audioTrackId: trackId },
    data: { audioTrackId: null }
  });

  // 3. Delete track record
  await prisma.chapterAudioTrack.delete({
    where: { id: trackId }
  });

  console.log(`[Audio Service] Deleted track ${trackId} and unlocked concepts.`);
  return { success: true };
}
