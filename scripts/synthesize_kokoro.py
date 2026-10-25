import sys
import os
import json
import time
import numpy as np
import soundfile as sf
import kokoro_onnx

MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', 'kokoro', 'kokoro-v1.0.onnx')
VOICES_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', 'kokoro', 'voices-v1.0.bin')

def synthesize_podcast(dialogue_json_path, output_mp3_path):
    print(f"[Kokoro] Loading model from {MODEL_PATH}...")
    t0 = time.time()
    kokoro = kokoro_onnx.Kokoro(MODEL_PATH, VOICES_PATH)
    print(f"[Kokoro] Model initialized in {time.time() - t0:.2f}s")

    with open(dialogue_json_path, 'r', encoding='utf-8') as f:
        dialogue = json.load(f)

    all_samples = []
    sample_rate = 24000
    keyword_timestamps = {}
    current_time_sec = 0.0
    current_keyword = None

    # Pause buffers
    inter_line_pause = np.zeros(int(sample_rate * 0.35), dtype=np.float32)  # 350ms natural conversational pause
    inter_keyword_pause = np.zeros(int(sample_rate * 0.60), dtype=np.float32)  # 600ms transition pause

    for idx, turn in enumerate(dialogue):
        kw = turn.get('keyword', '').strip()
        speaker = turn.get('speaker', 'Dr. Rao')
        voice = turn.get('voice', '').strip()
        text = turn.get('text', '').strip()
        speed = float(turn.get('speed', 1.02))

        # Handle edge case where LLM swapped text into voice key
        if not text and len(voice) > 20:
            text = voice
            voice = ''

        # Assign voice by speaker identity
        if not voice or len(voice) > 15:
            voice = 'hm_omega' if ('Rao' in speaker or 'Dr' in speaker) else 'hf_alpha'

        if not text:
            continue

        # Record timestamp when a new keyword starts
        if kw and kw != current_keyword:
            if current_keyword is not None:
                # Add transition pause between concepts
                all_samples.append(inter_keyword_pause)
                current_time_sec += len(inter_keyword_pause) / sample_rate

            current_keyword = kw
            keyword_timestamps[kw] = round(current_time_sec, 2)
            print(f"[Timestamp] {kw} -> {round(current_time_sec, 2)}s ({speaker})")

        print(f"[Kokoro] Synthesizing ({voice}) [{speaker}]: \"{text[:60]}...\"")
        lang = turn.get('lang', 'hi' if voice.startswith('h') else 'en-us')
        try:
            samples, sr = kokoro.create(text, voice=voice, speed=speed, lang=lang)
            sample_rate = sr
            all_samples.append(samples)
            current_time_sec += len(samples) / sample_rate

            # Add inter-line conversational pause
            all_samples.append(inter_line_pause)
            current_time_sec += len(inter_line_pause) / sample_rate
        except Exception as e:
            print(f"[Kokoro] Error synthesizing line: {e}")

    if not all_samples:
        print("[Kokoro] No audio generated!")
        return

    # Concatenate all audio samples
    master_audio = np.concatenate(all_samples)
    total_duration = len(master_audio) / sample_rate

    dirname = os.path.dirname(output_mp3_path)
    if dirname:
        os.makedirs(dirname, exist_ok=True)
    sf.write(output_mp3_path, master_audio, sample_rate, format='MP3')
    print(f"[Kokoro] Finished! Output saved to: {output_mp3_path}")
    print(f"[Kokoro] Total duration: {total_duration:.2f}s, File size: {os.path.getsize(output_mp3_path)} bytes")

    result = {
        "output_path": output_mp3_path,
        "total_duration": round(total_duration, 2),
        "keyword_timestamps": keyword_timestamps
    }

    # Print JSON result to stdout for parent process
    print("---RESULT_START---")
    print(json.dumps(result))
    print("---RESULT_END---")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python synthesize_kokoro.py <dialogue_json_path> <output_mp3_path>")
        sys.exit(1)

    synthesize_podcast(sys.argv[1], sys.argv[2])
