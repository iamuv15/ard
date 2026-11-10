'use client';

import React, { useState } from 'react';
import { Volume2, VolumeX, RotateCcw, Sparkles, User, Settings2 } from 'lucide-react';
import { VoiceTutorStatus, VoiceOption } from '@/lib/useVoiceTutor';

interface VoiceTutorBarProps {
  isEnabled: boolean;
  onToggleEnabled: (val: boolean) => void;
  status: VoiceTutorStatus;
  voice: VoiceOption;
  onChangeVoice: (voice: VoiceOption) => void;
  speed: number;
  onChangeSpeed: (speed: number) => void;
  onActivate: () => void;
  onReplay: () => void;
  onStop: () => void;
  spokenHinglishScript?: string | null;
}

export function VoiceTutorBar({
  isEnabled,
  onToggleEnabled,
  status,
  voice,
  onChangeVoice,
  speed,
  onChangeSpeed,
  onActivate,
  onReplay,
  onStop,
  spokenHinglishScript,
}: VoiceTutorBarProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showScript, setShowScript] = useState(false);

  const isSpeaking = status === 'speaking_explanation';
  const isLoading = status === 'loading_explanation';

  // Activation Banner when user hasn't clicked yet
  if (isEnabled && status === 'need_activation') {
    return (
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl shadow-lg border border-indigo-700/50 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-300">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
            <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm uppercase tracking-wider text-yellow-300">Voice Tutor Mode</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">Edge TTS Hinglish</span>
            </div>
            <p className="text-xs text-blue-100 font-medium mt-0.5">
              Experience live interactive practice with a conversational AI instructor speaking natural Hinglish.
            </p>
          </div>
        </div>
        <button
          onClick={onActivate}
          className="w-full sm:w-auto px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-black text-sm rounded-xl transition-all shadow-md hover:scale-105 active:scale-95 shrink-0 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Volume2 className="w-4 h-4 text-gray-900" />
          <span>Start Practice with Voice</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-white border border-gray-200/80 rounded-2xl shadow-xs overflow-hidden transition-all">
      {/* Main Bar */}
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Tutor Identity & Live Status */}
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
            isEnabled 
              ? (isSpeaking ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-indigo-50 text-indigo-600') 
              : 'bg-gray-100 text-gray-400'
          }`}>
            {isEnabled ? (
              isSpeaking ? (
                <div className="flex items-center gap-0.5 h-4">
                  <span className="w-1 bg-white rounded-full animate-bounce [animation-delay:-0.3s] h-3"></span>
                  <span className="w-1 bg-white rounded-full animate-bounce [animation-delay:-0.15s] h-4"></span>
                  <span className="w-1 bg-white rounded-full animate-bounce h-2"></span>
                </div>
              ) : (
                <Volume2 className="w-4 h-4" />
              )
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-gray-800">
                AI Voice Tutor
              </span>
              {isEnabled && (
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isSpeaking ? 'bg-indigo-100 text-indigo-800 animate-pulse' :
                  isLoading ? 'bg-amber-100 text-amber-800' :
                  'bg-emerald-100 text-emerald-800'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    isSpeaking ? 'bg-indigo-600' :
                    isLoading ? 'bg-amber-600' :
                    'bg-emerald-600'
                  }`} />
                  {isSpeaking ? 'Explaining solution & options...' :
                   isLoading ? 'Loading audio...' :
                   (status === 'awaiting_answer' ? 'Answer to hear audio solution' : 'Ready')}
                </span>
              )}
            </div>
            <div className="text-[11px] text-gray-500 font-medium">
              {isEnabled 
                ? `${voice === 'hi-IN-MadhurNeural' ? 'Madhur Sir' : 'Swara Ma\'am'} • Detailed Audio Explanations`
                : 'Muted. Practice continuing in visual mode.'}
            </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {isEnabled && (
            <>
              {/* Replay Button */}
              <button
                onClick={onReplay}
                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                title="Replay Audio"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Speed Button */}
              <button
                onClick={() => {
                  const nextSpeed = speed === 1.0 ? 1.25 : speed === 1.25 ? 1.5 : 1.0;
                  onChangeSpeed(nextSpeed);
                }}
                className="px-2.5 py-1 text-xs font-black text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                title="Playback Speed"
              >
                {speed}x
              </button>

              {/* Settings Toggle */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  showSettings ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
                }`}
                title="Voice Settings"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Master Voice ON/OFF Toggle */}
          <button
            onClick={() => onToggleEnabled(!isEnabled)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              isEnabled
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isEnabled ? 'Voice ON' : 'Voice OFF'}
          </button>
        </div>
      </div>

      {/* Collapsible Settings Drawer */}
      {isEnabled && showSettings && (
        <div className="px-4 py-3 bg-gray-50/80 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-700 animate-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-500">Instructor Voice:</span>
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
              <button
                onClick={() => onChangeVoice('hi-IN-MadhurNeural')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                  voice === 'hi-IN-MadhurNeural' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Madhur Sir (Male)
              </button>
              <button
                onClick={() => onChangeVoice('hi-IN-SwaraNeural')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                  voice === 'hi-IN-SwaraNeural' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Swara Ma'am (Female)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {spokenHinglishScript && (
              <button
                onClick={() => setShowScript(!showScript)}
                className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                {showScript ? 'Hide Spoken Script' : 'View Spoken Script'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Optional Spoken Script Drawer */}
      {isEnabled && showScript && spokenHinglishScript && (
        <div className="px-4 py-3 bg-indigo-50/50 border-t border-indigo-100 text-xs text-indigo-950 font-medium leading-relaxed italic animate-in fade-in duration-200">
          <span className="font-black text-indigo-900 not-italic uppercase tracking-wider text-[10px] block mb-1">
            Instructor&apos;s Spoken Hinglish Script:
          </span>
          &ldquo;{spokenHinglishScript}&rdquo;
        </div>
      )}
    </div>
  );
}

