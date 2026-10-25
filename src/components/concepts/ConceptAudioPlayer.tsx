'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Headphones,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react'
import { AudioTrack } from '@/lib/audioRegistry'

interface ConceptAudioPlayerProps {
  track: AudioTrack
  currentKeyword?: string | null
  onSelectKeyword?: (keyword: string) => void
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

export function ConceptAudioPlayer({
  track,
  currentKeyword,
  onSelectKeyword
}: ConceptAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [isMuted, setIsMuted] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Active playing keyword computed from timestamps
  const activePlayingKeyword = useMemo(() => {
    if (!track.keywordTimestamps) return null
    const entries = Object.entries(track.keywordTimestamps).sort((a, b) => a[1] - b[1])
    let current: string | null = null
    for (const [kw, time] of entries) {
      if (currentTime >= time) {
        current = kw
      } else {
        break
      }
    }
    return current
  }, [track.keywordTimestamps, currentTime])

  const jumpToKeyword = useCallback(
    (kw: string) => {
      if (track.keywordTimestamps && track.keywordTimestamps[kw] !== undefined) {
        const targetTime = track.keywordTimestamps[kw]
        if (audioRef.current) {
          audioRef.current.currentTime = targetTime
          setCurrentTime(targetTime)
          if (!isPlaying) {
            audioRef.current
              .play()
              .then(() => setIsPlaying(true))
              .catch(console.warn)
          }
        }
      }
      onSelectKeyword?.(kw)
    },
    [track.keywordTimestamps, isPlaying, onSelectKeyword]
  )

  // Auto-sync audio if user switches keyword while audio is already actively playing
  const lastSelectedKeywordRef = useRef<string | null>(null)
  useEffect(() => {
    if (
      currentKeyword &&
      currentKeyword !== lastSelectedKeywordRef.current &&
      track.keywordTimestamps &&
      track.keywordTimestamps[currentKeyword] !== undefined
    ) {
      lastSelectedKeywordRef.current = currentKeyword
      if (audioRef.current && isPlaying) {
        const targetTime = track.keywordTimestamps[currentKeyword]
        audioRef.current.currentTime = targetTime
        setCurrentTime(targetTime)
      }
    }
  }, [currentKeyword, track.keywordTimestamps, isPlaying])

  // Sync playback rate when rate changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate
    }
  }, [playbackRate])

  // Reset or handle track change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = track.audioUrl
      audioRef.current.load()
      setIsPlaying(false)
      setCurrentTime(0)
    }
  }, [track.audioUrl])

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.warn('Audio play failed:', err)
          setIsPlaying(false)
        })
    }
  }, [isPlaying])

  const skipSeconds = useCallback((offset: number) => {
    if (!audioRef.current) return
    const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + offset))
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }, [duration])

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = val
      setCurrentTime(val)
    }
  }

  const cycleSpeed = () => {
    const speeds = [1.0, 1.25, 1.5, 1.75, 2.0]
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length
    setPlaybackRate(speeds[nextIdx])
  }

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/70 to-indigo-50/50 dark:from-emerald-950/40 dark:via-slate-900/90 dark:to-indigo-950/30 border border-emerald-200/80 dark:border-emerald-800/40 shadow-sm transition-all duration-300">
      {/* Hidden native audio element */}
      <audio
        ref={audioRef}
        src={track.audioUrl}
        preload="metadata"
        onLoadedMetadata={e => {
          setDuration(e.currentTarget.duration)
          setIsLoaded(true)
        }}
        onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      {/* Header Bar */}
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Animated Wave / Icon Badge */}
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
              <Headphones className="w-5 h-5" />
              {isPlaying && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  Audio Masterclass
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                  NotebookLM Deep Dive
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate mt-0.5">
                {track.title}
              </h3>
            </div>
          </div>

          {/* Quick Right Action / Minimize */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Speed Pill */}
            <button
              onClick={cycleSpeed}
              title="Change playback speed"
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {playbackRate}x
            </button>

            {/* Minimize / Expand Toggle */}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? 'Expand Audio Controls' : 'Minimize Audio Controls'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
            >
              {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Audio Controls and Progress (if not minimized) */}
        {!isMinimized && (
          <div className="mt-4 space-y-3">
            {/* Scrubber Bar */}
            <div className="space-y-1">
              <div className="relative flex items-center group">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 bg-slate-200/80 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
                  style={{
                    background: `linear-gradient(to right, #10b981 ${progressPercent}%, rgba(226, 232, 240, 0.6) ${progressPercent}%)`
                  }}
                />
              </div>

              {/* Timestamps */}
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span>{formatTime(currentTime)}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {isPlaying ? 'Playing • Listen & Follow Along' : 'Paused'}
                </span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Control Buttons Row */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1">
                {/* Volume Mute Toggle */}
                <button
                  onClick={toggleMute}
                  title={isMuted ? 'Unmute' : 'Mute'}
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Main Transport: SkipBack, Play/Pause, SkipForward */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => skipSeconds(-15)}
                  title="Rewind 15 seconds"
                  className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  onClick={togglePlay}
                  title={isPlaying ? 'Pause Audio' : 'Play Audio'}
                  className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>

                <button
                  onClick={() => skipSeconds(15)}
                  title="Forward 15 seconds"
                  className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Visualizer wave animation */}
              <div className="flex items-end gap-1 h-5 px-2">
                {[40, 75, 100, 60, 85].map((height, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full bg-emerald-500 transition-all duration-300 ${
                      isPlaying ? 'animate-pulse' : 'opacity-30'
                    }`}
                    style={{
                      height: isPlaying ? `${height}%` : '20%',
                      animationDelay: `${i * 120}ms`
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Keyword Chips: Follow-Along Revision Badges with Interactive Skipping */}
            {track.keywords && track.keywords.length > 0 && (
              <div className="pt-3 border-t border-emerald-200/50 dark:border-slate-800/80">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Keywords Covered {track.keywordTimestamps ? '(Click to jump audio & notes)' : '(Click to view notes)'}:</span>
                  </div>
                  {track.keywordTimestamps && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      ⚡ Tap any topic to jump
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {track.keywords.map((kw, i) => {
                    const isSelected = (currentKeyword || '').toLowerCase() === kw.toLowerCase()
                    const isNowPlaying = (activePlayingKeyword || '').toLowerCase() === kw.toLowerCase()
                    const hasTimestamp = track.keywordTimestamps && track.keywordTimestamps[kw] !== undefined

                    return (
                      <button
                        key={i}
                        onClick={() => jumpToKeyword(kw)}
                        title={
                          hasTimestamp
                            ? `Jump audio to ${kw} (${formatTime(track.keywordTimestamps![kw])})`
                            : `View notes for ${kw}`
                        }
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                          isNowPlaying
                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400 font-bold scale-105'
                            : isSelected
                            ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 font-bold'
                            : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700 hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300'
                        }`}
                      >
                        {isNowPlaying && isPlaying && (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                          </span>
                        )}
                        <span>{kw}</span>
                        {hasTimestamp && (
                          <span className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                            isNowPlaying ? 'bg-emerald-700/80 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                          }`}>
                            {formatTime(track.keywordTimestamps![kw])}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
