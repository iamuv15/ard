import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import prisma from './prisma';
import { uploadAudioFile, deleteAudioFile } from './storageService';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_KEY_2 = process.env.GEMINI_API_KEY_2;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

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

  const keys = [GEMINI_API_KEY, GEMINI_API_KEY_2].filter(Boolean);
  let lastError = null;

  for (const key of keys) {
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
      if (data.error) throw new Error(data.error.message);

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
     * "text": Spoken line in Devanagari Hindi with English technical terms.`;

  const keys = [GEMINI_API_KEY, GEMINI_API_KEY_2].filter(Boolean);
  let lastError = null;

  for (const key of keys) {
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
      if (data.error) throw new Error(data.error.message);

      const rawJson = data.candidates[0].content.parts[0].text;
      const dialogue = JSON.parse(rawJson);
      console.log(`[Gemini] Script generated successfully with ${dialogue.length} dialogue turns!`);
      return dialogue;
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`Failed to generate dialogue script: ${lastError}`);
}

/**
 * Generate full audio track for a cluster of concepts and store in Supabase Bucket
 */
export async function generateAudioForCluster(params: {
  chapterId: number;
  subCategory: string;
  title: string;
  conceptIds: number[];
}) {
  const { chapterId, subCategory, title, conceptIds } = params;

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

  // 3. Save dialogue to scratch
  const scratchDir = path.join(process.cwd(), 'scratch');
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const dialoguePath = path.join(scratchDir, `${slug}_dialogue.json`);
  fs.writeFileSync(dialoguePath, JSON.stringify(dialogue, null, 2), 'utf8');

  // 4. Synthesize with Gemini 3.8 Flash TTS via Python script
  const tempWavPath = path.join(scratchDir, `${slug}.mp3`);
  const pyScript = path.join(process.cwd(), 'scripts', 'synthesize_gemini_tts.py');
  const pythonCmd = `python "${pyScript}" "${dialoguePath}" "${tempWavPath}"`;

  console.log(`[Gemini TTS] Synthesizing audio via python...`);
  const stdout = execSync(pythonCmd, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
  });

  const resultMatch = stdout.match(/---RESULT_START---([\s\S]*?)---RESULT_END---/);
  if (!resultMatch) {
    throw new Error(`Failed to parse synthesis result from Python output: ${stdout}`);
  }

  const result = JSON.parse(resultMatch[1].trim());
  const { total_duration, keyword_timestamps } = result;

  // 5. Upload to Supabase Storage
  const subCategorySlug = subCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const storagePath = `chapter-${chapterId}/${subCategorySlug}/${slug}.mp3`;
  console.log(`[Storage] Uploading audio to destination: ${storagePath}...`);

  const uploadResult = await uploadAudioFile(tempWavPath, storagePath);

  // 6. Save ChapterAudioTrack record in Postgres
  const track = await prisma.chapterAudioTrack.create({
    data: {
      chapterId,
      subCategory,
      title,
      subtitle: `Gemini 3.8 Studio TTS • Natural Hinglish • ${Math.round(total_duration / 60)} mins`,
      audioUrl: uploadResult.url,
      storagePath: uploadResult.storagePath,
      durationSec: total_duration,
      fileSizeBytes: uploadResult.sizeBytes,
      keywordTimestamps: keyword_timestamps,
      status: 'COMPLETED'
    }
  });

  // 7. Lock concepts to this track (enforcing primary explanation non-duplication)
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
