import { NextRequest, NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// Default voice: Indian Hindi-English conversational instructor
const DEFAULT_VOICE = 'hi-IN-MadhurNeural'; // Alternatives: 'hi-IN-SwaraNeural', 'en-IN-PrabhatNeural'

function sanitizeSpeechText(raw: string): string {
  if (!raw) return '';
  let cleaned = raw
    // Strip markdown formatting
    .replace(/###?\s*/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove markdown tables
    .replace(/\|.*\|/g, '')
    // Strip raw html tags
    .replace(/<[^>]+>/g, '')
    // Replace LaTeX symbols
    .replace(/\$([^$]+)\$/g, '$1')
    // Standardize spacing and dashes
    .replace(/\s+/g, ' ')
    .trim();

  // Apply phonetic Hinglish pronunciation fixes for Hindi Edge TTS neural voices
  cleaned = cleaned
    // 1. Fix "use", "used", "uses", "using", "user", "useful"
    // English 'use' is mispronounced as Hindi pronoun 'उसे' (usse) by hi-IN neural models
    .replace(/\buse\b/gi, 'यूज़')
    .replace(/\buses\b/gi, 'यूज़ेस')
    .replace(/\bused\b/gi, 'यूज़्ड')
    .replace(/\busing\b/gi, 'यूजिंग')
    .replace(/\buser\b/gi, 'यूज़र')
    .replace(/\busers\b/gi, 'यूज़र्स')
    .replace(/\busage\b/gi, 'यूसेज')
    .replace(/\buseful\b/gi, 'यूज़फुल')
    .replace(/\breuse\b/gi, 'रियूज़')

    // 2. Fix English "main" -> 'मेन' (otherwise mispronounced as Hindi 'मैं' (I) or 'में' (in))
    .replace(/\bmain\b/gi, 'मेन')

    // 3. Agricultural & Engineering Acronyms
    .replace(/\bPTO\b/g, 'पीटीओ')
    .replace(/\bpto\b/g, 'पीटीओ')
    .replace(/\bRPM\b/g, 'आरपीएम')
    .replace(/\brpm\b/g, 'आरपीएम')
    .replace(/\bMSP\b/g, 'एमएसपी')
    .replace(/\bmsp\b/g, 'एमएसपी')
    .replace(/\bCACP\b/g, 'सीएसीपी')
    .replace(/\bcacp\b/g, 'सीएसीपी')
    .replace(/\bICAR\b/g, 'आईसीएआर')
    .replace(/\bicar\b/g, 'आईसीएआर')
    .replace(/\bNABARD\b/g, 'नाबार्ड')
    .replace(/\bnabard\b/g, 'नाबार्ड')
    .replace(/\bFCI\b/g, 'एफसीआई')
    .replace(/\bfci\b/g, 'एफसीआई')
    .replace(/\bFYM\b/g, 'एफवाईएम')
    .replace(/\bfym\b/g, 'एफवाईएम')
    .replace(/\bSMAM\b/g, 'एसएमएएम')
    .replace(/\bPMFBY\b/g, 'पीएम-एफबीवाई')
    .replace(/\bpmfby\b/g, 'पीएम-एफबीवाई')
    .replace(/\bRKVY\b/g, 'आरकेवीवाई')
    .replace(/\brkvy\b/g, 'आरकेवीवाई')
    .replace(/(\d+)\s*hp\b/gi, '$1 एचपी')
    .replace(/\bHP\b/g, 'एचपी')

    // 4. Units & Common abbreviations
    .replace(/\bkg\/ha\b/gi, 'किलोग्राम पर हेक्टेयर')
    .replace(/\bkm\/h\b/gi, 'किलोमीटर प्रति घंटा')
    .replace(/\bkmph\b/gi, 'किलोमीटर प्रति घंटा')
    .replace(/\bvs\.?\b/gi, 'वर्सेस')
    .replace(/\be\.g\.,?\b/gi, 'जैसे कि')
    .replace(/\bi\.e\.,?\b/gi, 'यानी कि')
    .replace(/\betc\.?\b/gi, 'इत्यादि')
    .replace(/\bapprox\.?\b/gi, 'लगभग')
    .replace(/\bNo\.\s*(\d+)/gi, 'नंबर $1')
    .replace(/\bLiveShala\b/gi, 'लाइव शाला');

  return cleaned;
}

// In-memory server-side audio cache to return instantaneous responses for frequent scripts
const ttsMemoryCache = new Map<string, Buffer>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voice = DEFAULT_VOICE, rate = '+0%' } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required for TTS synthesis' }, { status: 400 });
    }

    const cleanedText = sanitizeSpeechText(text);
    if (!cleanedText) {
      return NextResponse.json({ error: 'Text is empty after sanitization' }, { status: 400 });
    }

    // Instant server-side cache hit (0-2ms response)
    const cacheKey = `${voice}_${rate}_${cleanedText}`;
    if (ttsMemoryCache.has(cacheKey)) {
      const cached = ttsMemoryCache.get(cacheKey)!;
      return new Response(cached as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': cached.length.toString(),
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
          'X-TTS-Cache': 'HIT',
        },
      });
    }

    // Synthesize audio via MsEdgeTTS
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const timeout = setTimeout(() => {
        tts.close();
        reject(new Error('TTS synthesis timed out after 10 seconds'));
      }, 10000);

      try {
        const { audioStream } = tts.toStream(cleanedText, { rate });
        const chunks: Buffer[] = [];

        audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
        audioStream.on('end', () => {
          clearTimeout(timeout);
          tts.close();
          resolve(Buffer.concat(chunks));
        });
        audioStream.on('error', (err) => {
          clearTimeout(timeout);
          tts.close();
          reject(err);
        });
      } catch (err) {
        clearTimeout(timeout);
        tts.close();
        reject(err);
      }
    });

    if (buffer && buffer.length > 0) {
      // LRU evict if over 600 items (~60MB RAM)
      if (ttsMemoryCache.size > 600) {
        const firstKey = ttsMemoryCache.keys().next().value;
        if (firstKey) ttsMemoryCache.delete(firstKey);
      }
      ttsMemoryCache.set(cacheKey, buffer);
    }

    return new Response(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error: any) {
    console.error('Edge TTS Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to synthesize speech' },
      { status: 500 }
    );
  }
}

