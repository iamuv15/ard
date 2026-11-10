'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export type VoiceTutorStatus = 
  | 'idle'
  | 'need_activation'
  | 'awaiting_answer'
  | 'loading_explanation'
  | 'speaking_explanation'
  | 'awaiting_next'
  | 'paused'
  | 'error';

export type VoiceOption = 'hi-IN-MadhurNeural' | 'hi-IN-SwaraNeural';

interface QuestionLike {
  id: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE?: string | null;
  correctAnswer: string;
  explanation?: string | null;
  voiceQuestion?: string | null;
  voiceOptions?: string | null;
  voiceExplanation?: string | null;
}

export function useVoiceTutor(options: {
  isQuiz12?: boolean;
}) {
  const [isEnabled, setIsEnabled] = useState<boolean>(Boolean(options.isQuiz12));
  const [status, setStatus] = useState<VoiceTutorStatus>('awaiting_answer');
  const [voice, setVoice] = useState<VoiceOption>('hi-IN-MadhurNeural');
  const [speed, setSpeed] = useState<number>(1.0);
  const [hasUserActivated, setHasUserActivated] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const activePlayIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentAudioBufferRef = useRef<AudioBuffer | null>(null);

  // Initialize or resume audio context
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Stop any ongoing audio immediately and cancel any in-flight synthesis/download
  const stopAudio = useCallback(() => {
    // Invalidate in-flight play callbacks
    activePlayIdRef.current++;

    // Abort active network request immediately
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Stop and disconnect active audio source
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch {}
      try {
        currentSourceRef.current.disconnect();
      } catch {}
      currentSourceRef.current = null;
    }

    currentAudioBufferRef.current = null;
    setStatus('awaiting_answer');
  }, []);

  // Fetch audio from /api/tts or cache with abort signal support
  const fetchAudioBuffer = useCallback(async (
    text: string, 
    cacheKey: string,
    signal?: AbortSignal
  ): Promise<AudioBuffer | null> => {
    try {
      const fullCacheKey = `${voice}_${cacheKey}`;
      if (audioCacheRef.current.has(fullCacheKey)) {
        return audioCacheRef.current.get(fullCacheKey)!;
      }

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
        signal,
      });

      if (!res.ok) {
        throw new Error(`TTS API failed with status ${res.status}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      const audioCtx = getAudioContext();
      const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      audioCacheRef.current.set(fullCacheKey, decodedBuffer);
      return decodedBuffer;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // Silently handled: user moved to next question or aborted playback
        return null;
      }
      console.error('Error fetching TTS audio:', err);
      return null;
    }
  }, [voice, getAudioContext]);

  // Play a specific buffer
  const playBuffer = useCallback((buffer: AudioBuffer, onEnded?: () => void) => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch {}
      try {
        currentSourceRef.current.disconnect();
      } catch {}
      currentSourceRef.current = null;
    }

    const audioCtx = getAudioContext();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = speed;
    source.connect(audioCtx.destination);

    currentAudioBufferRef.current = buffer;
    currentSourceRef.current = source;

    source.onended = () => {
      if (currentSourceRef.current === source) {
        currentSourceRef.current = null;
        if (onEnded) onEnded();
      }
    };

    source.start(0);
  }, [speed, getAudioContext]);

  // Start explanation narration on answer submission or manual button click
  const speakExplanation = useCallback(async (q: QuestionLike, selectedKey?: string | null) => {
    if (!isEnabled) return;

    // First stop ongoing audio & abort any pending request
    stopAudio();

    // Assign a new playId for this specific playback turn
    const playId = activePlayIdRef.current;

    // Create a new AbortController for this fetch
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const audioCtx = getAudioContext();
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
      setHasUserActivated(true);
    }

    setStatus('loading_explanation');

    let prefix = '';
    let isCorrect = false;
    if (selectedKey) {
      isCorrect = selectedKey.toUpperCase() === q.correctAnswer.toUpperCase();
      prefix = isCorrect
        ? "बहुत अच्छा! आपका answer बिल्कुल सही है। "
        : `गलत जवाब। सही answer Option ${q.correctAnswer.toUpperCase()} है। `;
    }

    let explanationBody = q.voiceExplanation || '';
    if (!explanationBody && q.explanation) {
      explanationBody = q.explanation;
    }

    const fullText = `${prefix}\n\n${explanationBody}`.trim();
    if (!fullText) {
      setStatus('awaiting_next');
      return;
    }

    const cacheKey = `exp_${q.id}_${selectedKey ? (isCorrect ? 'C' : 'I') : 'SOL'}`;

    const buffer = await fetchAudioBuffer(fullText, cacheKey, abortController.signal);

    // If another question was navigated to, stopAudio() was called, or request aborted: DO NOT PLAY!
    if (playId !== activePlayIdRef.current || abortController.signal.aborted) {
      return;
    }

    if (!buffer) {
      setStatus('awaiting_next');
      return;
    }

    setStatus('speaking_explanation');
    playBuffer(buffer, () => {
      if (playId === activePlayIdRef.current) {
        setStatus('awaiting_next');
      }
    });
  }, [isEnabled, getAudioContext, stopAudio, fetchAudioBuffer, playBuffer]);

  // User activates audio via click
  const activateAudio = useCallback((currentQ?: QuestionLike) => {
    const audioCtx = getAudioContext();
    audioCtx.resume().then(() => {
      setHasUserActivated(true);
      if (currentQ) {
        speakExplanation(currentQ, null);
      }
    });
  }, [getAudioContext, speakExplanation]);

  // Replay current audio
  const replayAudio = useCallback(() => {
    if (currentAudioBufferRef.current) {
      setStatus('speaking_explanation');
      playBuffer(currentAudioBufferRef.current, () => {
        setStatus('awaiting_next');
      });
    }
  }, [playBuffer]);

  // Speed change update in real time
  const changeSpeed = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
    if (currentSourceRef.current) {
      currentSourceRef.current.playbackRate.value = newSpeed;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [stopAudio]);

  return {
    isEnabled,
    setIsEnabled: (enabled: boolean) => {
      setIsEnabled(enabled);
      if (!enabled) {
        stopAudio();
        setStatus('idle');
      } else {
        setStatus('awaiting_answer');
      }
    },
    status,
    setStatus,
    voice,
    setVoice,
    speed,
    changeSpeed,
    hasUserActivated,
    activateAudio,
    speakExplanation,
    stopAudio,
    replayAudio,
  };
}
