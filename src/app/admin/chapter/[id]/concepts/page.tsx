'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Brain, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Search,
  BookOpen,
  RefreshCw,
  Zap,
  ExternalLink
} from 'lucide-react'
import { FormattedExplanation } from '@/components/FormattedExplanation'
import { ConceptDossierModal } from '@/components/concepts/ConceptDossierModal'

interface MindMapTree {
  categories: {
    name: string
    subCategories: {
      name: string
      keywords: string[]
    }[]
  }[]
  allKeywords: string[]
  syllabusAudit?: {
    scorePercent: number
    totalBenchmarkTopics: number
    coveredTopicsCount: number
    gapTopics: string[]
    tnauSourceUrl?: string
  }
}

export default function AdminChapterConceptsPage() {
  const params = useParams()
  const router = useRouter()
  const chapterId = params.id as string

  const [loading, setLoading] = useState(true)
  const [chapterName, setChapterName] = useState('')
  const [mindMap, setMindMap] = useState<MindMapTree | null>(null)
  const [concepts, setConcepts] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConceptSlug, setSelectedConceptSlug] = useState<string | null>(null)

  // Generation status states
  const [mindMapGenerating, setMindMapGenerating] = useState(false)
  const [capsulesGenerating, setCapsulesGenerating] = useState(false)
  const [generatingSingleTerm, setGeneratingSingleTerm] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ current: number; total: number; currentTerm?: string } | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/chapters/${chapterId}/mindmap`)
      const data = await res.json()
      if (res.ok) {
        setChapterName(data.chapterName)
        setMindMap(data.mindMap?.treeData || null)
        setConcepts(data.existingConcepts || [])
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to load chapter data' })
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error loading chapter' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (chapterId) loadData()
  }, [chapterId])

  // STEP 1: Generate Mind Map with Thinking ON (10,000 tokens)
  const handleGenerateMindMap = async () => {
    try {
      setMindMapGenerating(true)
      setStatusMessage({ 
        type: 'info', 
        text: 'Architecting taxonomy with Gemini Thinking (10,000 tokens)... Analyzing chapter questions.' 
      })

      const res = await fetch(`/api/admin/chapters/${chapterId}/mindmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const data = await res.json()
      if (res.ok) {
        setMindMap(data.mindMap)
        setStatusMessage({ 
          type: 'success', 
          text: `Mind Map created! Extracted ${data.totalKeywordsExtracted} key terminologies into structured branches.` 
        })
        loadData()
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to generate Mind Map' })
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Unexpected error' })
    } finally {
      setMindMapGenerating(false)
    }
  }

  // STEP 2A: Generate a Single Concept Capsule (Fast, 1 term)
  const handleGenerateSingleCapsule = async (keyword: string, category: string, subCategory?: string) => {
    try {
      setGeneratingSingleTerm(keyword)
      setStatusMessage(null)

      const res = await fetch(`/api/admin/chapters/${chapterId}/concepts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: [keyword],
          category,
          subCategory
        })
      })

      if (!res.ok) {
        let errText = `Failed with status ${res.status}`
        try {
          const errJson = await res.json()
          errText = errJson.error || errText
        } catch {}
        throw new Error(errText)
      }

      setStatusMessage({
        type: 'success',
        text: `Concept capsule for "${keyword}" generated successfully with tables and exam traps!`
      })
      await loadData()
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error generating capsule for "${keyword}": ${err.message}`
      })
    } finally {
      setGeneratingSingleTerm(null)
    }
  }

  // STEP 2B: Generate Concept Capsules in Chunks of 2 (Thinking OFF, Fast, Live UI reload)
  const handleGenerateAllCapsules = async () => {
    if (!mindMap?.categories) return

    try {
      setCapsulesGenerating(true)
      setStatusMessage(null)

      // Collect all keyword tasks from mindmap
      const tasks: { keyword: string; category: string; subCategory?: string }[] = []
      mindMap.categories.forEach(cat => {
        cat.subCategories.forEach(sub => {
          sub.keywords.forEach(kw => {
            tasks.push({ keyword: kw, category: cat.name, subCategory: sub.name })
          })
        })
      })

      // Filter out terms that already have concepts generated
      const existingNames = new Set(concepts.map(c => c.term.toLowerCase().trim()))
      const pendingTasks = tasks.filter(t => !existingNames.has(t.keyword.toLowerCase().trim()))

      if (pendingTasks.length === 0) {
        setStatusMessage({ type: 'success', text: 'All keywords in this chapter already have capsules!' })
        setCapsulesGenerating(false)
        return
      }

      // Small batch size of 2 terms guarantees ultra-fast execution (~3-5s) well within Vercel serverless timeouts
      const chunkSize = 2
      const totalPending = pendingTasks.length
      let completed = 0

      for (let i = 0; i < pendingTasks.length; i += chunkSize) {
        const chunk = pendingTasks.slice(i, i + chunkSize)
        const primaryCat = chunk[0].category
        const primarySub = chunk[0].subCategory
        const keywords = chunk.map(c => c.keyword)

        setProgress({
          current: completed,
          total: totalPending,
          currentTerm: keywords.join(', ')
        })

        const res = await fetch(`/api/admin/chapters/${chapterId}/concepts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keywords,
            category: primaryCat,
            subCategory: primarySub
          })
        })

        if (!res.ok) {
          let errorText = `Failed with status ${res.status}`
          try {
            const errJson = await res.json()
            errorText = errJson.error || errorText
          } catch {}
          throw new Error(`Generation stopped at "${keywords.join(', ')}": ${errorText}`)
        }

        const data = await res.json()
        const count = data.generatedCount ?? chunk.length
        completed += count

        // Live update UI so each capsule card appears on screen immediately!
        await loadData()

        setProgress({
          current: Math.min(completed, totalPending),
          total: totalPending,
          currentTerm: 'Preparing next batch...'
        })

        // Rate pacing pause
        if (i + chunkSize < pendingTasks.length) {
          await new Promise(r => setTimeout(r, 1200))
        }
      }

      setStatusMessage({ 
        type: 'success', 
        text: `Successfully generated ${completed} concept capsules with comparative tables & exam traps!` 
      })
      await loadData()
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error generating capsules' })
    } finally {
      setCapsulesGenerating(false)
      setProgress(null)
    }
  }

  const existingSlugSet = new Set(concepts.map(c => c.term.toLowerCase().trim()))
  const allKeywords = mindMap?.allKeywords || []
  const generatedCount = concepts.length
  const totalKeywords = allKeywords.length

  // Build the list of pending tasks for the queue view
  const allPendingTasks: { keyword: string; category: string; subCategory?: string }[] = []
  if (mindMap?.categories) {
    mindMap.categories.forEach(cat => {
      cat.subCategories.forEach(sub => {
        sub.keywords.forEach(kw => {
          if (!existingSlugSet.has(kw.toLowerCase().trim())) {
            allPendingTasks.push({ keyword: kw, category: cat.name, subCategory: sub.name })
          }
        })
      })
    })
  }

  const filteredConcepts = concepts.filter(c => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return c.term.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
  })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8 text-slate-900 dark:text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back Link */}
        <Link 
          href="/admin" 
          className="inline-flex items-center text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin Dashboard
        </Link>

        {/* Header Banner */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              Terminology Engine Admin
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {chapterName || 'Chapter'} • Mind Map & Concepts
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl">
              Two-step pipeline: Step 1 builds the Master Taxonomy (10k thinking); Step 2 writes high-yield notes, tables & exam traps (thinking OFF).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/chapter/${chapterId}/concepts`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <span>Student View</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </Link>

            <button
              onClick={handleGenerateMindMap}
              disabled={mindMapGenerating || capsulesGenerating}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer ${
                mindMap
                  ? 'border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white shadow-sm'
              }`}
              title="Step 1: Analyzes questions with 10k thinking tokens to create the topic branches"
            >
              {mindMapGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Reasoning Mind Map...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 text-blue-500" />
                  {mindMap ? 'Re-Sync Mind Map (Optional)' : 'Generate Mind Map (Step 1)'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2-Step Workflow Guide Banner */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Workflow Guide: Which Button To Press?
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step 1 Card */}
            <div className={`p-5 rounded-2xl border transition-all ${
              mindMap 
                ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/10' 
                : 'border-blue-300 dark:border-blue-700 bg-blue-50/40 dark:bg-blue-950/20'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                  STEP 1: TAXONOMY & MIND MAP
                </span>
                {mindMap ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready ({allKeywords.length} terms)
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    Press 1st
                  </span>
                )}
              </div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Mine Keywords & Structure Mind Map
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                Scans all MCQs using <strong>Gemini 3.5 with 10k thinking tokens</strong> to group keywords into macro-branches. Once ready, you only press this if you upload new MCQs.
              </p>

              <button
                onClick={handleGenerateMindMap}
                disabled={mindMapGenerating || capsulesGenerating}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Brain className="w-3.5 h-3.5 text-blue-500" />
                {mindMapGenerating ? 'Reasoning (10k tokens)...' : mindMap ? 'Re-Sync Mind Map (Optional)' : 'Generate Mind Map'}
              </button>
            </div>

            {/* Step 2 Card */}
            <div className={`p-5 rounded-2xl border transition-all ${
              generatedCount === totalKeywords && totalKeywords > 0
                ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                : 'border-amber-300 dark:border-amber-700/60 bg-amber-50/30 dark:bg-amber-950/20'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                  STEP 2: CONCEPT CAPSULES
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {generatedCount}/{totalKeywords} Live
                </span>
              </div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Generate Comparative Notes & Traps
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                Synthesizes definitions, comparative tables & examiner traps for pending keywords. <strong>Thinking is OFF (Fast, ultra-reliable).</strong>
              </p>

              <button
                onClick={handleGenerateAllCapsules}
                disabled={capsulesGenerating || mindMapGenerating || !mindMap || totalKeywords <= generatedCount}
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {capsulesGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating Capsules...
                  </>
                ) : totalKeywords <= generatedCount ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    All Capsules Published ({generatedCount})
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    Batch Generate {totalKeywords - generatedCount} Pending Capsules
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Alerts & Progress */}
        {statusMessage && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-medium ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : statusMessage.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
              : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
          }`}>
            {statusMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
            {statusMessage.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            {statusMessage.type === 'info' && <RefreshCw className="w-5 h-5 animate-spin flex-shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Progress Bar for Batch Generation */}
        {progress && (
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                Generating Concept Capsules ({progress.current}/{progress.total})
              </span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {Math.round((progress.current / progress.total) * 100)}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            {progress.currentTerm && (
              <p className="text-xs text-slate-400 font-mono truncate">
                Current Batch: {progress.currentTerm}
              </p>
            )}
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Keywords in Mind Map
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white">
              {totalKeywords}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Extracted from chapter MCQs
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Generated Concept Capsules
            </div>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {generatedCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              With tables, metrics & exam traps
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Pending Capsules
              </div>
              <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
                {Math.max(0, totalKeywords - generatedCount)}
              </div>
            </div>

            {totalKeywords > generatedCount && (
              <button
                onClick={handleGenerateAllCapsules}
                disabled={capsulesGenerating || mindMapGenerating}
                className="mt-3 w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                Batch Generate Pending (Thinking OFF)
              </button>
            )}
          </div>
        </div>

        {/* TNAU Agritech Syllabus Audit & Gap Detection Card */}
        {mindMap?.syllabusAudit && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    TNAU Agritech Syllabus Completeness Audit
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Benchmarked against standard university curriculum checklist ({mindMap.syllabusAudit.coveredTopicsCount}/{mindMap.syllabusAudit.totalBenchmarkTopics} topics covered by your MCQs)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                    {mindMap.syllabusAudit.scorePercent}%
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Coverage Score
                  </div>
                </div>

                {mindMap.syllabusAudit.tnauSourceUrl && (
                  <a
                    href={mindMap.syllabusAudit.tnauSourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span>TNAU Portal</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                )}
              </div>
            </div>

            {/* Coverage Meter */}
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${mindMap.syllabusAudit.scorePercent}%` }}
              />
            </div>

            {/* Identified Gap Topics (0 MCQs on platform) */}
            {mindMap.syllabusAudit.gapTopics && mindMap.syllabusAudit.gapTopics.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    Identified Syllabus Gaps ({mindMap.syllabusAudit.gapTopics.length} high-yield topics with 0 platform MCQs):
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {mindMap.syllabusAudit.gapTopics.map((gap, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60"
                      title="This topic is part of the standard TNAU/ICAR syllabus but currently has no questions in this chapter."
                    >
                      ⚠️ {gap}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 italic mt-1">
                  Tip: These topics are automatically incorporated into the Mind Map so students can still learn them. You can upload new quizzes to test these areas!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pending Capsules Queue */}
        {allPendingTasks.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Pending Capsules Queue ({allPendingTasks.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  These keywords are in the Mind Map but need capsules generated. Click "Batch Generate" above, or generate individual terms below.
                </p>
              </div>

              <button
                onClick={handleGenerateAllCapsules}
                disabled={capsulesGenerating || mindMapGenerating}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0"
              >
                <Zap className="w-3.5 h-3.5" />
                Batch Generate All ({allPendingTasks.length})
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
              {allPendingTasks.map((task, idx) => {
                const isThisGenerating = generatingSingleTerm === task.keyword
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-[10px] uppercase font-bold text-slate-400 truncate">
                        {task.category}
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate" title={task.keyword}>
                        {task.keyword}
                      </div>
                    </div>

                    <button
                      onClick={() => handleGenerateSingleCapsule(task.keyword, task.category, task.subCategory)}
                      disabled={capsulesGenerating || Boolean(generatingSingleTerm)}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer flex-shrink-0 disabled:opacity-50"
                      title="Generate capsule for this term"
                    >
                      {isThisGenerating ? (
                        <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
                      ) : (
                        <Zap className="w-3 h-3 text-emerald-500" />
                      )}
                      <span>{isThisGenerating ? 'Saving...' : 'Generate'}</span>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Concept List & Search */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-500" />
              Published Concept Capsules ({filteredConcepts.length})
            </h3>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search capsules..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {filteredConcepts.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No concept capsules found. Generate the Mind Map first, then click Batch Generate.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredConcepts.map(c => (
                <div
                  key={c.id}
                  onClick={() => setSelectedConceptSlug(c.slug)}
                  className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700/80 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer transition-all hover:shadow-xs group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      {c.category}
                    </span>
                    <span className="text-[10px] text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                      {c._count?.questions || 0} MCQs
                    </span>
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {c.term}
                  </h4>
                  {c.subCategory && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {c.subCategory}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal preview */}
        <ConceptDossierModal
          slug={selectedConceptSlug}
          chapterId={parseInt(chapterId, 10)}
          onClose={() => setSelectedConceptSlug(null)}
          onSelectRelatedTerm={termSlug => setSelectedConceptSlug(termSlug)}
        />
      </div>
    </div>
  )
}
