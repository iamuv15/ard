import sys
import os
import io
import json
import time
import base64
import urllib.request
import urllib.error
import numpy as np
import soundfile as sf

# Fix Windows console UTF-8 encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def load_env():
    env_vars = {}
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env_vars[k.strip()] = v.strip().strip('"').strip("'")
    return env_vars

def call_gemini_tts(parts, api_keys):
    payload = {
        "contents": [{
            "parts": [
                {
                    "text": p["text"],
                    "speech_metadata": {
                        "speaker": p.get("speaker", "Kavya"),
                        "style": p.get("style", "warm and conversational")
                    }
                } for p in parts
            ]
        }],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "multiSpeakerVoiceConfig": {
                    "speakerVoiceConfigs": [
                        {
                            "speaker": "Kavya",
                            "voiceConfig": { "prebuiltVoiceConfig": { "voiceName": "Aoede" } }
                        },
                        {
                            "speaker": "Dr. Rao",
                            "voiceConfig": { "prebuiltVoiceConfig": { "voiceName": "Fenrir" } }
                        }
                    ]
                }
            }
        }
    }

    body = json.dumps(payload).encode('utf-8')
    last_err = None

    tts_model = os.getenv('GEMINI_TTS_MODEL', 'gemini-3.8-flash-lite-tts')
    for key in api_keys:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{tts_model}:generateContent?key={key}"
        for attempt in range(1, 4):
            try:
                req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
                with urllib.request.urlopen(req, timeout=45) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    if "candidates" in data and len(data["candidates"]) > 0:
                        part = data["candidates"][0]["content"]["parts"][0]
                        if "inlineData" in part:
                            return base64.b64decode(part["inlineData"]["data"])
                    print(f"[Gemini TTS] Unexpected response structure: {list(data.keys())}")
            except Exception as e:
                last_err = e
                print(f"[Gemini TTS] Attempt {attempt} error with key: {e}")
                time.sleep(2 * attempt)

    raise Exception(f"All Gemini TTS attempts failed: {last_err}")

def synthesize_podcast(dialogue_json_path, output_mp3_path):
    env_vars = load_env()
    free_keys = [
        env_vars.get('GEMINI_API_KEY') or os.getenv('GEMINI_API_KEY'),
        env_vars.get('GEMINI_API_KEY_2') or os.getenv('GEMINI_API_KEY_2'),
        env_vars.get('GEMINI_API_KEY_3') or os.getenv('GEMINI_API_KEY_3'),
        env_vars.get('GEMINI_API_KEY_4') or os.getenv('GEMINI_API_KEY_4'),
        env_vars.get('GEMINI_API_KEY_5') or os.getenv('GEMINI_API_KEY_5'),
    ]
    paid_key = env_vars.get('GEMINI_PAID_API_KEY') or os.getenv('GEMINI_PAID_API_KEY')
    api_keys = [k for k in free_keys if k]
    if paid_key:
        api_keys.append(paid_key)

    if not api_keys:
        raise ValueError("No Gemini API keys found in .env or environment!")

    print(f"[Gemini TTS] Loading dialogue from: {dialogue_json_path}")
    with open(dialogue_json_path, 'r', encoding='utf-8') as f:
        dialogue = json.load(f)

    # Group dialogue turns by keyword
    keyword_groups = []
    current_kw = None
    current_turns = []

    for turn in dialogue:
        kw = turn.get('keyword', '').strip()
        if not kw:
            kw = current_kw or 'Introduction'

        if kw != current_kw:
            if current_turns:
                keyword_groups.append((current_kw, current_turns))
            current_kw = kw
            current_turns = [turn]
        else:
            current_turns.append(turn)

    if current_turns:
        keyword_groups.append((current_kw, current_turns))

    print(f"[Gemini TTS] Found {len(keyword_groups)} keyword clusters to synthesize.")

    sample_rate = 24000
    all_samples = []
    keyword_timestamps = {}
    current_time_sec = 0.0
    transition_pause = np.zeros(int(sample_rate * 0.55), dtype=np.float32)  # 550ms natural transition between concepts

    for idx, (kw, turns) in enumerate(keyword_groups):
        print(f"\n[Gemini TTS] ({idx + 1}/{len(keyword_groups)}) Synthesizing concept: \"{kw}\" ({len(turns)} dialogue lines)...")
        t0 = time.time()
        
        # Record timestamp for this keyword
        keyword_timestamps[kw] = round(current_time_sec, 2)
        print(f"[Timestamp] {kw} -> {round(current_time_sec, 2)}s")

        # Synthesize audio segment via Gemini 3.8 Flash TTS
        wav_bytes = call_gemini_tts(turns, api_keys)
        samples, sr = sf.read(io.BytesIO(wav_bytes), dtype='float32')
        sample_rate = sr

        all_samples.append(samples)
        current_time_sec += len(samples) / sample_rate
        print(f"[Gemini TTS] Generated {len(samples) / sample_rate:.2f}s of audio in {time.time() - t0:.2f}s.")

        # Add pause between keyword concepts (except after the final concept)
        if idx < len(keyword_groups) - 1:
            all_samples.append(transition_pause)
            current_time_sec += len(transition_pause) / sample_rate

    if not all_samples:
        print("[Gemini TTS] Error: No audio samples collected!")
        return

    master_audio = np.concatenate(all_samples)
    total_duration = len(master_audio) / sample_rate

    dirname = os.path.dirname(output_mp3_path)
    if dirname:
        os.makedirs(dirname, exist_ok=True)

    sf.write(output_mp3_path, master_audio, sample_rate, format='MP3')
    print(f"\n[Gemini TTS] Success! Final MP3 saved to: {output_mp3_path}")
    print(f"[Gemini TTS] Total duration: {total_duration:.2f}s ({total_duration / 60:.2f} mins), File size: {os.path.getsize(output_mp3_path)} bytes")

    result = {
        "output_path": output_mp3_path,
        "total_duration": round(total_duration, 2),
        "keyword_timestamps": keyword_timestamps
    }

    print("---RESULT_START---")
    print(json.dumps(result))
    print("---RESULT_END---")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python synthesize_gemini_tts.py <dialogue_json_path> <output_mp3_path>")
        sys.exit(1)

    synthesize_podcast(sys.argv[1], sys.argv[2])
