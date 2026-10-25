'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Headphones,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Trash2,
  Layers,
  Clock,
  HardDrive,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Volume2,
  Sparkle,
  Radio,
  Sliders,
  Check
} from 'lucide-react'

interface AudioTrack {
  id: string
  subCategory: string
  title: string
  subtitle: string | null
  audioUrl: string
  storagePath: string
  durationSec: number
  fileSizeBytes: number | null
  keywordTimestamps: Record<string, number>
  status: string
  concepts: { id: number; term: string; slug: string }[]
  createdAt: string
}

interface SubCategoryGroup {
  subCategory: string
  totalConcepts: number
  explainedConcepts: { id: number; term: string; slug: string; audioTrackId: string | null }[]
  pendingConcepts: { id: number; term: string; slug: string; audioTrackId: string | null }[]
  tracks: AudioTrack[]
}

interface ChapterData {
  id: number
  name: string
  cohort: string
  totalConcepts: number
  totalTracks: number
  totalDurationSec: number
}

interface ProposedCluster {
  title: string
  rationale: string
  conceptIds: number[]
  concepts: { id: number; term: string; definition: string }[]
}

export default function ChapterAudioAdminPage() {
  const params = useParams()
  const router = useRouter()
  const chapterId = params.id as string

  const [loading, setLoading] = useState(true)
  const [chapter, setChapter] = useState<ChapterData | null>(null)
  const [subcategories, setSubcategories] = useState<SubCategoryGroup[]>([])
  const [expandedSubCats, setExpandedSubCats] = useState<Record<string, boolean>>({})

  // Planning state
  const [planningSubCat, setPlanningSubCat] = useState<string | null>(null)
  const [proposedClusters, setProposedClusters] = useState<Record<string, ProposedCluster[]>>({})

  // Generation state
  const [generatingCluster, setGeneratingCluster] = useState<string | null>(null)
  const [generationStep, setGenerationStep] = useState<string>('')
  const [errorModal, setErrorModal] = useState<string | null>(null)

  // Audio player state
  const [activeTrackUrl, setActiveTrackUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const fetchChapterAudio = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/chapters/${chapterId}/audio`)
      if (!res.ok) throw new Error('Failed to fetch audio data')
      const data = await res.json()
      setChapter(data.chapter)
      setSubcategories(data.subcategories)

      // Auto-expand all subcategories by default
      const exp: Record<string, boolean> = {}
      data.subcategories.forEach((s: SubCategoryGroup) => {
        exp[s.subCategory] = true
      })
      setExpandedSubCats(exp)
    } catch (err: any) {
      console.error(err)
      setErrorModal(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (chapterId) fetchChapterAudio()
  }, [chapterId])

  const toggleSubCat = (name: string) => {
    setExpandedSubCats(prev => ({ ...prev, [name]: !prev[name] }))
  }

  const handlePlanClusters = async (subCategory: string) => {
    try {
      setPlanningSubCat(subCategory)
      const res = await fetch(`/api/admin/chapters/${chapterId}/audio/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subCategory })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to plan clusters')
      }

      const data = await res.json()
      setProposedClusters(prev => ({ ...prev, [subCategory]: data.clusters }))
    } catch (err: any) {
      setErrorModal(err.message)
    } finally {
      setPlanningSubCat(null)
    }
  }

  const handleGenerateCluster = async (
    subCategory: string,
    cluster: ProposedCluster
  ) => {
    const clusterKey = `${subCategory}-${cluster.title}`
    try {
      setGeneratingCluster(clusterKey)
      setGenerationStep('Calling Gemini 3.5 Flash-Lite for script...')

      const stepInterval = setInterval(() => {
        setGenerationStep(prev => {
          if (prev.includes('script')) return 'Synthesizing with Gemini 3.8 Flash-Lite TTS (Aoede & Fenrir)...'
          if (prev.includes('Synthesizing')) return 'Encoding & uploading to Supabase Storage bucket...'
          return 'Registering audio track & concept timestamps in database...'
        })
      }, 7000)

      const res = await fetch(`/api/admin/chapters/${chapterId}/audio/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subCategory,
          title: cluster.title,
          conceptIds: cluster.conceptIds
        })
      })

      clearInterval(stepInterval)

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Audio generation failed')
      }

      // Clear proposed cluster from local state
      setProposedClusters(prev => {
        const next = { ...prev }
        delete next[subCategory]
        return next
      })

      // Refresh data
      await fetchChapterAudio()
    } catch (err: any) {
      setErrorModal(err.message)
    } finally {
      setGeneratingCluster(null)
      setGenerationStep('')
    }
  }

  const handleDeleteTrack = async (trackId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the audio track "${title}"? This will unlink its concepts back to pending.`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/chapters/${chapterId}/audio/${trackId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to delete track')
      await fetchChapterAudio()
    } catch (err: any) {
      setErrorModal(err.message)
    }
  }

  // Audio player controls
  const playTrack = (url: string) => {
    if (activeTrackUrl === url && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
      return
    }

    setActiveTrackUrl(url)
    setIsPlaying(true)
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play()
      }
    }, 50)
  }

  const seekTo = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds
      if (!isPlaying) {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  if (loading && !chapter) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-emerald-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="font-medium">Loading Audio Masterclass Dashboard...</span>
        </div>
      </div>
    )
  }

  const totalExplained = subcategories.reduce((acc, s) => acc + s.explainedConcepts.length, 0)
  const coveragePercent = chapter && chapter.totalConcepts > 0 
    ? Math.round((totalExplained / chapter.totalConcepts) * 100) 
    : 0

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      {/* Top Bar */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                  Audio Studio Backend
                </span>
                <span className="text-xs text-slate-400">Chapter {chapter?.id}</span>
              </div>
              <h1 className="text-lg font-bold text-white leading-tight truncate max-w-xl">
                {chapter?.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/admin/chapter/${chapterId}/concepts`}
              className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-2 transition"
            >
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Switch to Concepts Manager</span>
            </Link>
            <button
              onClick={fetchChapterAudio}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Metrics Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Concept Audio Coverage</span>
              <Radio className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white flex items-baseline gap-2">
              <span>{coveragePercent}%</span>
              <span className="text-xs text-slate-400 font-normal">
                ({totalExplained}/{chapter?.totalConcepts} keywords)
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${coveragePercent}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Active Masterclasses</span>
              <Headphones className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {chapter?.totalTracks} <span className="text-xs text-slate-400 font-normal">Audio Tracks</span>
            </div>
            <div className="text-xs text-slate-500 mt-2">Stored on Supabase Storage Bucket</div>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Total Airtime</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {chapter ? (chapter.totalDurationSec / 60).toFixed(1) : 0} <span className="text-xs text-slate-400 font-normal">mins</span>
            </div>
            <div className="text-xs text-slate-500 mt-2">Average 5.2 mins per cluster</div>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Synthesis Engine</span>
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-sm font-semibold text-white">Gemini 3.8 Flash-Lite TTS</div>
            <div className="text-xs text-purple-300/80 mt-1">Multi-Speaker: Aoede & Fenrir</div>
            <div className="text-xs text-slate-500 mt-1">Authentic Devanagari Hinglish</div>
          </div>
        </div>

        {/* Subcategories List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Subcategory Masterclass Clusters</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Every audio track strictly respects subcategory boundaries. Concepts are locked to a single masterclass to guarantee zero redundant explanations.
              </p>
            </div>
          </div>

          {subcategories.map(group => {
            const isExpanded = expandedSubCats[group.subCategory] ?? true
            const hasPending = group.pendingConcepts.length > 0
            const isComplete = group.pendingConcepts.length === 0 && group.totalConcepts > 0
            const isPlanning = planningSubCat === group.subCategory
            const proposed = proposedClusters[group.subCategory]

            return (
              <div
                key={group.subCategory}
                className="rounded-2xl border border-slate-800 bg-slate-900/30 overflow-hidden transition"
              >
                {/* Subcategory Header */}
                <div
                  className="p-5 flex items-center justify-between cursor-pointer select-none bg-slate-900/60 hover:bg-slate-900/90 transition border-b border-slate-800/60"
                  onClick={() => toggleSubCat(group.subCategory)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
                      <Layers className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">{group.subCategory}</h3>
                        {isComplete ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 flex items-center gap-1">
                            <Check className="w-3 h-3" /> 100% Complete
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                            {group.pendingConcepts.length} Pending
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>{group.totalConcepts} total keywords</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-medium">{group.tracks.length} Masterclass Audio Tracks</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                    {hasPending && (
                      <button
                        onClick={() => handlePlanClusters(group.subCategory)}
                        disabled={isPlanning}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                      >
                        {isPlanning ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Planning Arcs with AI...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Plan Missing Clusters</span>
                          </>
                        )}
                      </button>
                    )}

                    <div className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Subcategory Body */}
                {isExpanded && (
                  <div className="p-6 space-y-6">
                    {/* 1. Existing Completed Tracks */}
                    {group.tracks.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Headphones className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Generated Audio Masterclasses ({group.tracks.length})</span>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          {group.tracks.map(track => {
                            const isThisPlaying = activeTrackUrl === track.audioUrl && isPlaying
                            return (
                              <div
                                key={track.id}
                                className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition space-y-4"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="flex items-start gap-3">
                                    <button
                                      onClick={() => playTrack(track.audioUrl)}
                                      className={`p-3 rounded-xl transition shadow-lg ${
                                        isThisPlaying
                                          ? 'bg-emerald-500 text-slate-950 scale-105'
                                          : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white'
                                      }`}
                                    >
                                      {isThisPlaying ? (
                                        <Pause className="w-5 h-5" />
                                      ) : (
                                        <Play className="w-5 h-5 translate-x-0.5" />
                                      )}
                                    </button>

                                    <div>
                                      <h4 className="text-base font-bold text-white">{track.title}</h4>
                                      <p className="text-xs text-slate-400 mt-0.5">{track.subtitle}</p>
                                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                                        <span className="flex items-center gap-1">
                                          <Clock className="w-3 h-3 text-amber-400" />
                                          {formatSec(track.durationSec)}
                                        </span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                          <HardDrive className="w-3 h-3 text-blue-400" />
                                          {track.fileSizeBytes ? (track.fileSizeBytes / (1024 * 1024)).toFixed(2) + ' MB' : 'N/A'}
                                        </span>
                                        <span>•</span>
                                        <span className="text-emerald-400">
                                          {track.storagePath.includes('http') ? 'Cloud CDN' : 'Supabase Bucket'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 self-end sm:self-center">
                                    <a
                                      href={track.audioUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                                      title="Open Direct Audio URL"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                    <button
                                      onClick={() => handleDeleteTrack(track.id, track.title)}
                                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                                      title="Delete Track & Free Concepts"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                {/* Interactive Keyword Timestamp Chips */}
                                <div>
                                  <div className="text-[11px] font-medium text-slate-400 mb-1.5">
                                    Interactive Concept Timestamps (Click to jump):
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {Object.entries(track.keywordTimestamps || {}).map(([keyword, timeSec]) => (
                                      <button
                                        key={keyword}
                                        onClick={() => {
                                          if (activeTrackUrl !== track.audioUrl) {
                                            playTrack(track.audioUrl)
                                          }
                                          seekTo(Number(timeSec))
                                        }}
                                        className="text-xs px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-emerald-950 hover:border-emerald-600/60 hover:text-emerald-300 text-slate-300 transition flex items-center gap-1.5"
                                      >
                                        <span>{keyword}</span>
                                        <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-1 py-0.5 rounded">
                                          {formatSec(Number(timeSec))}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* 2. Proposed AI Clusters (Ready to synthesize) */}
                    {proposed && proposed.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>AI Proposed Teaching Arcs (Ready for Gemini 3.8 Flash-Lite Synthesis)</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {proposed.map((cluster, cIdx) => {
                            const clusterKey = `${group.subCategory}-${cluster.title}`
                            const isThisGenerating = generatingCluster === clusterKey

                            return (
                              <div
                                key={cIdx}
                                className="p-5 rounded-xl border border-amber-500/30 bg-amber-950/10 space-y-4 relative overflow-hidden"
                              >
                                {isThisGenerating && (
                                  <div className="absolute inset-0 bg-slate-950/90 backdrop-blur flex flex-col items-center justify-center p-6 text-center z-20">
                                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
                                    <div className="text-sm font-bold text-white mb-1">
                                      Generating Studio Masterclass
                                    </div>
                                    <div className="text-xs text-emerald-400">{generationStep}</div>
                                  </div>
                                )}

                                <div>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 uppercase">
                                    Proposed Track {cIdx + 1}
                                  </span>
                                  <h4 className="text-base font-bold text-white mt-1.5">{cluster.title}</h4>
                                  <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 mt-2 italic">
                                    &quot;{cluster.rationale}&quot;
                                  </p>
                                </div>

                                <div>
                                  <div className="text-xs font-medium text-slate-400 mb-1.5">
                                    Concepts Included ({cluster.concepts.length}):
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {cluster.concepts.map(c => (
                                      <span
                                        key={c.id}
                                        className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700"
                                      >
                                        {c.term}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleGenerateCluster(group.subCategory, cluster)}
                                  disabled={Boolean(generatingCluster)}
                                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition"
                                >
                                  <Sparkles className="w-4 h-4" />
                                  <span>Generate Studio Audio (Gemini 3.8 Flash-Lite TTS)</span>
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* 3. Pending Concepts Pool */}
                    {group.pendingConcepts.length > 0 && !proposed && (
                      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                        <div className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                          <span>Unassigned Concepts ({group.pendingConcepts.length}):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {group.pendingConcepts.map(c => (
                            <span
                              key={c.id}
                              className="text-xs px-2.5 py-1 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60"
                            >
                              {c.term}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Floating Audio Player */}
      {activeTrackUrl && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-slate-800 backdrop-blur-md px-6 py-3.5 z-50 flex items-center justify-between gap-4 shadow-2xl">
          <audio
            ref={audioRef}
            src={activeTrackUrl}
            onTimeUpdate={() => {
              if (audioRef.current) {
                setCurrentTime(audioRef.current.currentTime)
                setDuration(audioRef.current.duration || 0)
              }
            }}
            onEnded={() => setIsPlaying(false)}
          />

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (audioRef.current) {
                  if (isPlaying) {
                    audioRef.current.pause()
                    setIsPlaying(false)
                  } else {
                    audioRef.current.play()
                    setIsPlaying(true)
                  }
                }
              }}
              className="p-3 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:scale-105 transition"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 translate-x-0.5" />}
            </button>
            <div>
              <div className="text-xs font-bold text-white">Live Masterclass Audio Preview</div>
              <div className="text-[11px] text-slate-400">
                {formatSec(currentTime)} / {formatSec(duration)}
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-2xl mx-4">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={e => seekTo(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          <button
            onClick={() => {
              if (audioRef.current) audioRef.current.pause()
              setActiveTrackUrl(null)
              setIsPlaying(false)
            }}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded"
          >
            Close
          </button>
        </div>
      )}

      {/* Error Modal */}
      {errorModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold">Error</h3>
            </div>
            <p className="text-sm text-slate-300">{errorModal}</p>
            <button
              onClick={() => setErrorModal(null)}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
