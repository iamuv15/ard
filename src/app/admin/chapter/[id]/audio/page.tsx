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
  Check,
  Zap,
  Square
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
  const [isBulkPlanning, setIsBulkPlanning] = useState(false)

  // Bulk Generation state
  const [bulkState, setBulkState] = useState<{
    isRunning: boolean
    total: number
    completed: number
    currentTrackTitle: string
    currentSubCategory: string
    step: string
  } | null>(null)
  const bulkCancelRef = useRef(false)

  // Single Generation state
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

  // Bulk Plan all subcategories that have pending concepts
  const handleBulkPlanAll = async () => {
    const pendingGroups = subcategories.filter(s => s.pendingConcepts.length > 0)
    if (pendingGroups.length === 0) {
      alert('All concepts already have audio masterclasses! Nothing pending to plan.')
      return
    }

    setIsBulkPlanning(true)
    try {
      for (const group of pendingGroups) {
        if (!proposedClusters[group.subCategory] || proposedClusters[group.subCategory].length === 0) {
          const res = await fetch(`/api/admin/chapters/${chapterId}/audio/plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subCategory: group.subCategory })
          })
          if (res.ok) {
            const data = await res.json()
            setProposedClusters(prev => ({
              ...prev,
              [group.subCategory]: data.clusters
            }))
          }
        }
      }
    } catch (err: any) {
      setErrorModal(err.message || 'Error occurred during bulk planning')
    } finally {
      setIsBulkPlanning(false)
    }
  }

  // Bulk Generate sequential audio queue
  const handleBulkGenerate = async (
    targetQueue?: { subCategory: string; cluster: ProposedCluster }[]
  ) => {
    let queue: { subCategory: string; cluster: ProposedCluster }[] = []

    if (targetQueue && targetQueue.length > 0) {
      queue = targetQueue
    } else {
      // Gather already planned clusters across all subcategories
      const currentProposed = { ...proposedClusters }

      // Auto-plan any subcategory that hasn't been planned yet
      const pendingGroups = subcategories.filter(s => s.pendingConcepts.length > 0)
      for (const group of pendingGroups) {
        if (!currentProposed[group.subCategory] || currentProposed[group.subCategory].length === 0) {
          try {
            const planRes = await fetch(`/api/admin/chapters/${chapterId}/audio/plan`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subCategory: group.subCategory })
            })
            if (planRes.ok) {
              const data = await planRes.json()
              currentProposed[group.subCategory] = data.clusters
              setProposedClusters(prev => ({ ...prev, [group.subCategory]: data.clusters }))
            }
          } catch {}
        }
      }

      for (const [subCat, clusters] of Object.entries(currentProposed)) {
        if (Array.isArray(clusters)) {
          for (const cluster of clusters) {
            queue.push({ subCategory: subCat, cluster })
          }
        }
      }
    }

    if (queue.length === 0) {
      alert('No pending concept clusters found to generate!')
      return
    }

    bulkCancelRef.current = false
    setBulkState({
      isRunning: true,
      total: queue.length,
      completed: 0,
      currentTrackTitle: queue[0].cluster.title,
      currentSubCategory: queue[0].subCategory,
      step: 'Starting bulk audio generation...'
    })

    for (let i = 0; i < queue.length; i++) {
      if (bulkCancelRef.current) {
        break
      }

      const item = queue[i]
      setBulkState(prev => prev ? {
        ...prev,
        currentTrackTitle: item.cluster.title,
        currentSubCategory: item.subCategory,
        step: `Drafting dialogue script for "${item.cluster.title}" (${i + 1}/${queue.length})...`
      } : null)

      try {
        const res = await fetch(`/api/admin/chapters/${chapterId}/audio/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subCategory: item.subCategory,
            title: item.cluster.title,
            conceptIds: item.cluster.conceptIds
          })
        })

        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Generation failed')
        }

        // Remove generated cluster from proposed list
        setProposedClusters(prev => {
          const next = { ...prev }
          if (next[item.subCategory]) {
            next[item.subCategory] = next[item.subCategory].filter(c => c.title !== item.cluster.title)
          }
          return next
        })

        setBulkState(prev => prev ? {
          ...prev,
          completed: prev.completed + 1,
          step: `Saved "${item.cluster.title}" to Supabase! (${i + 1}/${queue.length})`
        } : null)

        await fetchChapterAudio()
      } catch (err: any) {
        console.error(`Bulk generation stopped on "${item.cluster.title}":`, err)
        setErrorModal(`Bulk Generation halted at "${item.cluster.title}": ${err.message}`)
        break
      }
    }

    setBulkState(null)
    await fetchChapterAudio()
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
            <div className="text-xs text-emerald-400 font-medium mt-1">Opus Mono 32 kbps (~1.2 MB / 5 min)</div>
          </div>
        </div>

        {/* Bulk Audio Generator Command Center */}
        <div className="p-6 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/60 backdrop-blur space-y-4 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  Bulk Audio Automation
                </span>
                <span className="text-xs text-slate-400">
                  {subcategories.reduce((acc, s) => acc + s.pendingConcepts.length, 0)} concepts pending audio
                </span>
              </div>
              <h2 className="text-lg font-bold text-white">
                Chapter Audio Automation Studio
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl">
                Batch generate masterclasses across the entire chapter in one click. The AI intelligently clusters unassigned concepts by subcategory, drafts multi-speaker Devanagari Hinglish scripts, and synthesizes 32 kbps Opus audio.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleBulkPlanAll}
                disabled={isBulkPlanning || Boolean(bulkState) || subcategories.every(s => s.pendingConcepts.length === 0)}
                className="px-4 py-2.5 rounded-xl border border-purple-500/40 bg-purple-900/20 hover:bg-purple-900/40 text-purple-200 text-xs font-bold flex items-center gap-2 transition disabled:opacity-40 cursor-pointer"
              >
                {isBulkPlanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                    <span>Planning All Clusters...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>1-Click Plan All Clusters</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleBulkGenerate()}
                disabled={Boolean(bulkState) || subcategories.every(s => s.pendingConcepts.length === 0)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition disabled:opacity-40 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>⚡ Bulk Generate All Audio</span>
              </button>
            </div>
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
                    {proposed && proposed.length > 0 && (
                      <button
                        onClick={() => handleBulkGenerate(proposed.map(c => ({ subCategory: group.subCategory, cluster: c })))}
                        disabled={Boolean(bulkState) || Boolean(generatingCluster)}
                        className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                        <span>Generate {proposed.length} {proposed.length === 1 ? 'Track' : 'Tracks'}</span>
                      </button>
                    )}

                    {hasPending && (
                      <button
                        onClick={() => handlePlanClusters(group.subCategory)}
                        disabled={isPlanning}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                      >
                        {isPlanning ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                            <span>Planning Arcs with AI...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
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

      {/* Live Bulk Audio Generation Modal */}
      {bulkState && bulkState.isRunning && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-8 max-w-lg w-full space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Zap className="w-5 h-5 fill-emerald-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Bulk Audio Studio In Progress</h3>
                  <p className="text-xs text-slate-400">
                    Queue {bulkState.completed} of {bulkState.total} tracks completed ({Math.round((bulkState.completed / bulkState.total) * 100)}%)
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  bulkCancelRef.current = true
                  setBulkState(prev => prev ? { ...prev, step: 'Stopping queue after current track...' } : null)
                }}
                className="px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-950/20 hover:bg-red-900/40 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-red-400" />
                <span>Stop Queue</span>
              </button>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span>Progress: Track {bulkState.completed + 1} of {bulkState.total}</span>
                <span className="text-emerald-400 font-bold">{Math.round((bulkState.completed / bulkState.total) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div
                  className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${Math.max(5, (bulkState.completed / bulkState.total) * 100)}%` }}
                />
              </div>
            </div>

            {/* Current Track Info */}
            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/60 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 uppercase">
                  {bulkState.currentSubCategory}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Headphones className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="truncate">{bulkState.currentTrackTitle}</span>
              </h4>
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium pt-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                <span className="truncate">{bulkState.step}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center">
              Multi-speaker script generation and Opus 32 kbps synthesis takes ~15–20s per track. Please keep this tab open until the queue completes.
            </p>
          </div>
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
