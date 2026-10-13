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
  ExternalLink,
  Key,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Sliders,
  Trash2,
  Tag,
  RotateCcw
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

  // Progressive Batch Mining states
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [rawKeywords, setRawKeywords] = useState<string[]>([])
  const [batchIndex, setBatchIndex] = useState(0)
  const [batchMining, setBatchMining] = useState(false)
  const [autoMining, setAutoMining] = useState(false)
  const [pacingDelay, setPacingDelay] = useState(12) // seconds wait between auto-batches (safe for 5 RPM limit)
  const [showKeywordDrawer, setShowKeywordDrawer] = useState(false)
  const autoMiningRef = React.useRef(false)

  // Generation status states
  const [mindMapGenerating, setMindMapGenerating] = useState(false)
  const [capsulesGenerating, setCapsulesGenerating] = useState(false)
  const [capsuleBatchSize, setCapsuleBatchSize] = useState(5) // default 5, options 5, 6, 7 for quality
  const [capsulePacingDelay, setCapsulePacingDelay] = useState(12) // seconds delay between auto batches
  const [capsuleAutoRunning, setCapsuleAutoRunning] = useState(false)
  const capsuleAutoRef = React.useRef(false)
  const [generatingSingleTerm, setGeneratingSingleTerm] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ current: number; total: number; currentTerm?: string } | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [paidApiKey, setPaidApiKey] = useState('')
  const [showKeySettings, setShowKeySettings] = useState(false)

  // User-configurable Phase 1 batch size (persisted in localStorage)
  const [phase1BatchSize, setPhase1BatchSize] = useState<number>(20)
  const batchSize = Math.max(5, Math.min(200, Number(phase1BatchSize) || 20))
  const totalBatches = Math.max(1, Math.ceil(totalQuestions / batchSize))

  useEffect(() => {
    try {
      const saved = localStorage.getItem('gemini_paid_api_key') || ''
      if (saved) setPaidApiKey(saved)
      const savedBatchSize = localStorage.getItem('phase1_batch_size')
      if (savedBatchSize) {
        const parsed = parseInt(savedBatchSize, 10)
        if (!isNaN(parsed) && parsed >= 5 && parsed <= 200) {
          setPhase1BatchSize(parsed)
        }
      }
    } catch {}
  }, [])

  const handleUpdateBatchSize = (newSize: number) => {
    const valid = Math.max(5, Math.min(200, newSize || 20))
    setPhase1BatchSize(valid)
    try {
      localStorage.setItem('phase1_batch_size', String(valid))
    } catch {}
  }

  const handleUpdatePaidKey = (val: string) => {
    setPaidApiKey(val)
    try {
      if (val.trim()) {
        localStorage.setItem('gemini_paid_api_key', val.trim())
      } else {
        localStorage.removeItem('gemini_paid_api_key')
      }
    } catch {}
  }

  const safeParseResponse = async (res: Response) => {
    const text = await res.text()
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      if (res.status === 504 || text.includes('FUNCTION_INVOCATION_TIMEOUT') || text.includes('An error occurred')) {
        throw new Error('Server request timed out on live server (HTTP 504). Please decrease your batch size (e.g. 10 or 15 questions) and retry.')
      }
      throw new Error(`Server returned HTTP ${res.status}: ${text.slice(0, 150)}`)
    }
    if (!res.ok) {
      throw new Error(data.error || `Request failed with status ${res.status}`)
    }
    return data
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/chapters/${chapterId}/mindmap`)
      const data = await safeParseResponse(res)
      setChapterName(data.chapterName)
      setMindMap(data.mindMap?.treeData || null)
      setConcepts(data.existingConcepts || [])
      setTotalQuestions(data.totalQuestions || 0)
      setRawKeywords(data.rawKeywords || [])
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error loading chapter' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (chapterId) loadData()
  }, [chapterId])

  // PHASE 1: Progressive Mining of a Single MCQ Batch (~2s, Thinking OFF)
  const handleMineSingleBatch = async (idx?: number) => {
    const targetIdx = typeof idx === 'number' ? idx : batchIndex
    try {
      setBatchMining(true)
      setStatusMessage({
        type: 'info',
        text: `⚡ Mining Batch ${targetIdx + 1} of ${totalBatches} (Questions ${targetIdx * batchSize + 1} to ${Math.min((targetIdx + 1) * batchSize, totalQuestions)})...`
      })

      const res = await fetch(`/api/admin/chapters/${chapterId}/mindmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mine_batch',
          batchIndex: targetIdx,
          batchSize,
          paidApiKey: paidApiKey.trim() || undefined
        })
      })

      const data = await safeParseResponse(res)

      setRawKeywords(data.allRawKeywords || [])
      const nextIdx = (targetIdx + 1) % totalBatches
      setBatchIndex(nextIdx)

      const sample = data.extractedKeywords?.slice(0, 6).join(', ') || ''
      setStatusMessage({
        type: 'success',
        text: `✅ Batch ${targetIdx + 1}/${totalBatches} mined! +${data.newKeywordsAdded} new terms added (Total Pool: ${data.totalKeywordsPool}). Extracted: [${sample}${data.extractedKeywords?.length > 6 ? ', ...' : ''}]`
      })

      return data
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Error mining batch ${targetIdx + 1}: ${err.message}` })
      throw err
    } finally {
      setBatchMining(false)
    }
  }

  // PHASE 1: Auto-Mine Loop with Browser Pacing Delay (Zero Vercel Timeouts!)
  const handleToggleAutoMine = async () => {
    if (autoMining) {
      autoMiningRef.current = false
      setAutoMining(false)
      setStatusMessage({ type: 'info', text: '⏸️ Auto-mining paused.' })
      return
    }

    autoMiningRef.current = true
    setAutoMining(true)
    let currentIdx = batchIndex

    setStatusMessage({
      type: 'info',
      text: `▶️ Starting Auto-Miner for chapter MCQs with ${pacingDelay}s delay between requests...`
    })

    try {
      while (autoMiningRef.current && currentIdx < totalBatches) {
        await handleMineSingleBatch(currentIdx)
        currentIdx++
        setBatchIndex(currentIdx % totalBatches)

        if (currentIdx >= totalBatches) {
          setStatusMessage({
            type: 'success',
            text: `🎉 Auto-mining complete across all ${totalBatches} batches! Ready to synthesize Master Mind Map in Phase 2.`
          })
          break
        }

        if (autoMiningRef.current) {
          setStatusMessage({
            type: 'info',
            text: `⏳ Waiting ${pacingDelay}s to protect Free Tier limits before Batch ${currentIdx + 1}/${totalBatches}...`
          })
          await new Promise(r => setTimeout(r, pacingDelay * 1000))
        }
      }
    } catch (err: any) {
      console.error('Auto-mining error:', err)
    } finally {
      autoMiningRef.current = false
      setAutoMining(false)
      await loadData()
    }
  }

  // PHASE 1: Reset Keyword Pool
  const handleResetKeywordPool = async () => {
    if (!window.confirm('Are you sure you want to clear the accumulated keyword pool and reset to Batch 1?')) {
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`/api/admin/chapters/${chapterId}/mindmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_keywords' })
      })
      if (res.ok) {
        setRawKeywords([])
        setBatchIndex(0)
        setMindMap(null)
        setStatusMessage({ type: 'success', text: 'Keyword pool reset. You can start mining from Batch 1.' })
        await loadData()
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to reset pool' })
    } finally {
      setLoading(false)
    }
  }

  // PHASE 2: Synthesize Master Mind Map with Thinking ON (10,000 tokens)
  const handleSynthesizeTaxonomy = async () => {
    try {
      setMindMapGenerating(true)
      setStatusMessage({ 
        type: 'info', 
        text: '🧠 Phase 2: Architecting taxonomy with Gemini Thinking (10,000 tokens)... Structuring categories & syllabus audit.' 
      })

      const res = await fetch(`/api/admin/chapters/${chapterId}/mindmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'synthesize',
          paidApiKey: paidApiKey.trim() || undefined 
        })
      })

      const data = await safeParseResponse(res)
      setMindMap(data.mindMap)
      setStatusMessage({ 
        type: 'success', 
        text: `🎉 Master Mind Map created! Extracted ${data.totalKeywordsExtracted} key terminologies into structured branches.` 
      })
      loadData()
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Unexpected error' })
    } finally {
      setMindMapGenerating(false)
    }
  }

  // FAST 1-CLICK Mind Map Fallback (Samples up to 180 MCQs)
  const handleGenerateMindMap = async () => {
    try {
      setMindMapGenerating(true)
      setStatusMessage({ 
        type: 'info', 
        text: 'Quick 1-Click: Sampling chapter questions and reasoning Mind Map with Gemini (10,000 thinking tokens)...' 
      })

      const res = await fetch(`/api/admin/chapters/${chapterId}/mindmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paidApiKey: paidApiKey.trim() || undefined })
      })

      const data = await safeParseResponse(res)
      setMindMap(data.mindMap)
      setStatusMessage({ 
        type: 'success', 
        text: `Mind Map created! Extracted ${data.totalKeywordsExtracted} key terminologies into structured branches.` 
      })
      loadData()
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
          subCategory,
          paidApiKey: paidApiKey.trim() || undefined
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

  // PHASE 3: Generate a Discrete, High-Yield Batch of 5-7 Concept Capsules (Thinking OFF, Maximum Quality)
  const handleGenerateNextCapsuleBatch = async (customBatchSize?: number) => {
    if (!mindMap?.categories) return

    const size = customBatchSize || capsuleBatchSize

    // Collect all pending tasks from mindmap
    const tasks: { keyword: string; category: string; subCategory?: string }[] = []
    mindMap.categories.forEach(cat => {
      cat.subCategories.forEach(sub => {
        sub.keywords.forEach(kw => {
          tasks.push({ keyword: kw, category: cat.name, subCategory: sub.name })
        })
      })
    })

    const existingNames = new Set(concepts.map(c => c.term.toLowerCase().trim()))
    const pendingTasks = tasks.filter(t => !existingNames.has(t.keyword.toLowerCase().trim()))

    if (pendingTasks.length === 0) {
      setStatusMessage({ type: 'success', text: 'All keywords in this chapter already have published capsules!' })
      return
    }

    const batch = pendingTasks.slice(0, size)
    const batchKeywords = batch.map(b => b.keyword)

    try {
      setCapsulesGenerating(true)
      setStatusMessage({
        type: 'info',
        text: `⚡ Generating high-yield batch of ${batch.length} concepts: ${batchKeywords.join(', ')}...`
      })

      const res = await fetch(`/api/admin/chapters/${chapterId}/concepts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: batch,
          paidApiKey: paidApiKey.trim() || undefined
        })
      })

      const data = await safeParseResponse(res)
      setStatusMessage({
        type: 'success',
        text: `✅ Batch of ${data.generatedCount || batch.length} concepts generated with tables & exam traps! You can inspect them below.`
      })
      await loadData()
      return data
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Error generating capsule batch: ${err.message}` })
      throw err
    } finally {
      setCapsulesGenerating(false)
    }
  }

  // PHASE 3: Auto-Run Batches of 5-7 with Browser-Paced Delay (Free Tier Safe)
  const handleToggleAutoCapsules = async () => {
    if (capsuleAutoRunning) {
      capsuleAutoRef.current = false
      setCapsuleAutoRunning(false)
      setStatusMessage({ type: 'info', text: '⏸️ Capsule auto-generation paused.' })
      return
    }

    if (!mindMap?.categories) return

    capsuleAutoRef.current = true
    setCapsuleAutoRunning(true)

    try {
      setStatusMessage({
        type: 'info',
        text: `▶️ Starting auto-generation in quality batches of ${capsuleBatchSize} with ${capsulePacingDelay}s delay between batches...`
      })

      while (capsuleAutoRef.current) {
        // Collect current pending tasks
        const tasks: { keyword: string; category: string; subCategory?: string }[] = []
        mindMap.categories.forEach(cat => {
          cat.subCategories.forEach(sub => {
            sub.keywords.forEach(kw => {
              tasks.push({ keyword: kw, category: cat.name, subCategory: sub.name })
            })
          })
        })

        const res = await fetch(`/api/admin/chapters/${chapterId}/mindmap`)
        const data = await res.json()
        const currentConcepts: any[] = data.existingConcepts || []
        const existingNames = new Set(currentConcepts.map((c: any) => c.term.toLowerCase().trim()))
        const pendingTasks = tasks.filter(t => !existingNames.has(t.keyword.toLowerCase().trim()))

        if (pendingTasks.length === 0) {
          setStatusMessage({ type: 'success', text: '🎉 All chapter capsules have been successfully generated!' })
          break
        }

        const batch = pendingTasks.slice(0, capsuleBatchSize)
        setProgress({
          current: currentConcepts.length,
          total: tasks.length,
          currentTerm: batch.map(b => b.keyword).join(', ')
        })

        await handleGenerateNextCapsuleBatch(capsuleBatchSize)

        if (pendingTasks.length <= capsuleBatchSize) {
          setStatusMessage({ type: 'success', text: '🎉 All chapter concepts have been published!' })
          break
        }

        if (capsuleAutoRef.current) {
          setStatusMessage({
            type: 'info',
            text: `⏳ Waiting ${capsulePacingDelay}s to protect Free Tier limits before next batch of ${capsuleBatchSize}...`
          })
          await new Promise(r => setTimeout(r, capsulePacingDelay * 1000))
        }
      }
    } catch (err: any) {
      console.error('Auto capsule generation error:', err)
    } finally {
      capsuleAutoRef.current = false
      setCapsuleAutoRunning(false)
      setProgress(null)
      await loadData()
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

        {/* Paid Key Resilience & Failover Strategy Banner */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl ${
                paidApiKey 
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
                {paidApiKey ? <ShieldCheck className="w-5 h-5" /> : <Key className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Gemini API Failover Strategy
                  </h3>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    paidApiKey 
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' 
                      : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                  }`}>
                    {paidApiKey ? '🟢 Paid API Key Active (Primary Mode)' : '🔵 Free Tier Active'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {paidApiKey ? 'Using Paid Key as primary to bypass Free Tier demand queues and inspect inputs/outputs. Falls back to Free Key if needed.' : 'Free tier active. You can add a Paid Key below to handle requests directly.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowKeySettings(!showKeySettings)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer flex-shrink-0"
            >
              <span>{paidApiKey ? 'Edit Paid Key' : '+ Add Paid Key Fallback'}</span>
              {showKeySettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showKeySettings && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={paidApiKey}
                    onChange={e => handleUpdatePaidKey(e.target.value)}
                    placeholder="Paste Paid Gemini API Key (e.g. AIzaSy...)"
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {paidApiKey && (
                  <button
                    onClick={() => handleUpdatePaidKey('')}
                    className="px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                🔒 Saved locally in your browser. You can also configure <code className="font-mono text-slate-600 dark:text-slate-300">GEMINI_PAID_API_KEY</code> in Vercel environment variables.
              </p>
            </div>
          )}
        </div>

        {/* 3-Phase Pipeline Architecture Banner */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Resilient 3-Phase Pipeline (Free Tier Safe • Zero Vercel Timeouts)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Break large chapters into fast independent chunks. Run manually or with paced auto-execution.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {totalQuestions} Total Chapter MCQs
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* PHASE 1: MCQ CHUNK MINER */}
            <div className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
              rawKeywords.length > 0 
                ? 'border-blue-300 dark:border-blue-800/80 bg-blue-50/30 dark:bg-blue-950/20' 
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
            }`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    PHASE 1: MCQ MINING
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Batch {Math.min(batchIndex + 1, totalBatches)}/{totalBatches}
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Chunked Question Mining
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Extracts keywords from batches of {batchSize} questions in ~2s (Thinking OFF). Never times out Vercel!
                  </p>
                </div>

                {/* Configurable Batch Size Input */}
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Batch Size:</span>
                      <span className="text-[10px] text-slate-400 ml-1.5">(Questions / pass)</span>
                    </div>
                    {/* Number input box */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={5}
                        max={150}
                        value={phase1BatchSize || ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10)
                          setPhase1BatchSize(isNaN(val) ? 0 : val)
                        }}
                        onBlur={() => {
                          if (!phase1BatchSize || phase1BatchSize < 5) handleUpdateBatchSize(5)
                          else if (phase1BatchSize > 200) handleUpdateBatchSize(200)
                          else handleUpdateBatchSize(phase1BatchSize)
                        }}
                        disabled={batchMining || autoMining}
                        className="w-14 px-2 py-1 text-center font-bold text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        placeholder="20"
                      />
                      <span className="text-[11px] font-semibold text-slate-400">MCQs</span>
                    </div>
                  </div>

                  {/* Preset Quick Chips */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold mr-1">Presets:</span>
                    {[10, 15, 20, 25, 50].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        disabled={batchMining || autoMining}
                        onClick={() => handleUpdateBatchSize(preset)}
                        className={`flex-1 py-0.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                          phase1BatchSize === preset
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        } disabled:opacity-50`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Progress Mini Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-slate-400">
                    <span>Mined: {Math.min(batchIndex * batchSize, totalQuestions)} / {totalQuestions} Qs</span>
                    <span className="text-blue-600 dark:text-blue-400 font-extrabold">{rawKeywords.length} Terms</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.round(((batchIndex * batchSize) / (totalQuestions || 1)) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Controls: Manual & Paced Auto */}
                <div className="space-y-2 pt-1">
                  {/* Manual Single Batch Button */}
                  <button
                    onClick={() => handleMineSingleBatch()}
                    disabled={batchMining || autoMining || mindMapGenerating}
                    className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {batchMining ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Mining Batch {batchIndex + 1}...
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        ⚡ Mine Next Batch ({Math.min(batchSize, Math.max(1, totalQuestions - batchIndex * batchSize))} MCQs)
                      </>
                    )}
                  </button>

                  {/* Auto-Mine & Delay Pacing */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleToggleAutoMine}
                      disabled={batchMining && !autoMining}
                      className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
                        autoMining
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {autoMining ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          Pause Auto-Mine
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          Auto-Mine All
                        </>
                      )}
                    </button>

                    {/* Delay Selector */}
                    <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 bg-white dark:bg-slate-800">
                      <Sliders className="w-3 h-3 text-slate-400" />
                      <select
                        value={pacingDelay}
                        onChange={e => setPacingDelay(Number(e.target.value))}
                        disabled={autoMining}
                        className="bg-transparent text-[11px] font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                        title="Delay between batches to respect Google AI 15 RPM free tier limits"
                      >
                        <option value={10}>10s</option>
                        <option value={12}>12s</option>
                        <option value={15}>15s</option>
                        <option value={20}>20s</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Keyword Drawer Toggle & Reset */}
              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <button
                  onClick={() => setShowKeywordDrawer(!showKeywordDrawer)}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Tag className="w-3 h-3" />
                  <span>{showKeywordDrawer ? 'Hide Pool' : `View Pool (${rawKeywords.length})`}</span>
                </button>
                {rawKeywords.length > 0 && (
                  <button
                    onClick={handleResetKeywordPool}
                    className="text-[11px] text-slate-400 hover:text-red-500 inline-flex items-center gap-1 cursor-pointer"
                    title="Clear keyword pool and restart mining from batch 0"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* PHASE 2: MASTER TAXONOMY & MIND MAP */}
            <div className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
              mindMap 
                ? 'border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/30 dark:bg-indigo-950/20' 
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
            }`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    PHASE 2: MASTER TAXONOMY
                  </span>
                  {mindMap ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      Needs Synthesis
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Master Mind Map Structuring
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Uses <strong>10,000 thinking tokens</strong> to group accumulated keywords into branches & run TNAU Agritech syllabus gap audit.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>Input Vocabulary:</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{rawKeywords.length} keywords</span>
                  </div>
                  {mindMap?.syllabusAudit && (
                    <div className="flex justify-between font-bold">
                      <span>TNAU Audit:</span>
                      <span className="text-emerald-600 dark:text-emerald-400">{mindMap.syllabusAudit.scorePercent}% coverage</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleSynthesizeTaxonomy}
                    disabled={mindMapGenerating || rawKeywords.length === 0}
                    className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {mindMapGenerating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Synthesizing (10k thinking)...
                      </>
                    ) : (
                      <>
                        <Brain className="w-3.5 h-3.5" />
                        {mindMap ? 'Re-Synthesize Mind Map' : '🧠 Synthesize Mind Map (10k Thinking)'}
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleGenerateMindMap}
                    disabled={mindMapGenerating}
                    className="w-full py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                    title="Samples up to 180 questions directly in one shot"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Quick 1-Click Mind Map (180 MCQs sample)
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 text-[11px] text-slate-400">
                Runs cleanly in ~15s (Zero serverless timeout risk).
              </div>
            </div>

            {/* PHASE 3: CONCEPT CAPSULES */}
            <div className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
              generatedCount === totalKeywords && totalKeywords > 0
                ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/30 dark:bg-emerald-950/20'
                : 'border-amber-300 dark:border-amber-700/60 bg-amber-50/30 dark:bg-amber-950/20'
            }`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                    PHASE 3: CONCEPT CAPSULES
                  </span>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {generatedCount}/{totalKeywords} Live
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    High-Yield Dossiers & Traps
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Generated in <strong>batches of 5–7 concepts</strong> to guarantee maximum depth, comparative tables & exam traps.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>Published Capsules:</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{generatedCount}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Pending Terms:</span>
                    <span className="text-amber-600 dark:text-amber-400">{Math.max(0, totalKeywords - generatedCount)}</span>
                  </div>
                  {allPendingTasks.length > 0 && (
                    <div className="pt-1 text-[10px] text-slate-400 truncate">
                      <span className="font-bold text-slate-500">Next Up:</span> {allPendingTasks.slice(0, capsuleBatchSize).map(t => t.keyword).join(', ')}
                    </div>
                  )}
                </div>

                {/* Controls: Manual Next Batch & Auto-Run with Pacing */}
                <div className="space-y-2 pt-1">
                  {/* Manual Single Batch Button */}
                  <button
                    onClick={() => handleGenerateNextCapsuleBatch()}
                    disabled={capsulesGenerating || capsuleAutoRunning || mindMapGenerating || !mindMap || totalKeywords <= generatedCount}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {capsulesGenerating && !capsuleAutoRunning ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Generating Batch ({Math.min(capsuleBatchSize, allPendingTasks.length)} Concepts)...
                      </>
                    ) : totalKeywords <= generatedCount && totalKeywords > 0 ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        All Capsules Published ({generatedCount})
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        ⚡ Generate Next Batch ({Math.min(capsuleBatchSize, Math.max(1, allPendingTasks.length))} Concepts)
                      </>
                    )}
                  </button>

                  {/* Auto-Run & Batch Size / Pacing Controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleToggleAutoCapsules}
                      disabled={capsulesGenerating && !capsuleAutoRunning}
                      className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
                        capsuleAutoRunning
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {capsuleAutoRunning ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          Pause Auto-Run
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          Auto-Run All
                        </>
                      )}
                    </button>

                    {/* Batch Size Selector (5, 6, 7) */}
                    <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 bg-white dark:bg-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold">Size:</span>
                      <select
                        value={capsuleBatchSize}
                        onChange={e => setCapsuleBatchSize(Number(e.target.value))}
                        disabled={capsuleAutoRunning || capsulesGenerating}
                        className="bg-transparent text-[11px] font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                        title="Batch size (5 to 7 concepts) to ensure highest quality tables & exam traps"
                      >
                        <option value={5}>5</option>
                        <option value={6}>6</option>
                        <option value={7}>7</option>
                      </select>
                    </div>

                    {/* Delay Selector */}
                    <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 bg-white dark:bg-slate-800">
                      <Sliders className="w-3 h-3 text-slate-400" />
                      <select
                        value={capsulePacingDelay}
                        onChange={e => setCapsulePacingDelay(Number(e.target.value))}
                        disabled={capsuleAutoRunning}
                        className="bg-transparent text-[11px] font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                        title="Delay between batches to protect Free Tier quota"
                      >
                        <option value={10}>10s</option>
                        <option value={12}>12s</option>
                        <option value={15}>15s</option>
                        <option value={20}>20s</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 text-[11px] text-slate-400">
                Thinking is OFF (Fast, ~4-6s per batch of {capsuleBatchSize}).
              </div>
            </div>
          </div>

          {/* Expandable Keyword Pool Drawer */}
          {showKeywordDrawer && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Accumulated Keywords Pool ({rawKeywords.length} distinct concepts extracted):
                </span>
                <span className="text-[11px] text-slate-400">
                  Ready to be structured in Phase 2
                </span>
              </div>
              {rawKeywords.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No keywords mined yet. Click &quot;⚡ Mine Next Batch ({batchSize} MCQs)&quot; above.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {rawKeywords.map((kw, i) => (
                    <span 
                      key={i} 
                      className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
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
                onClick={() => handleGenerateNextCapsuleBatch()}
                disabled={capsulesGenerating || capsuleAutoRunning || mindMapGenerating}
                className="mt-3 w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                Generate Next Batch ({Math.min(capsuleBatchSize, Math.max(1, totalKeywords - generatedCount))} Concepts)
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
                onClick={() => handleGenerateNextCapsuleBatch()}
                disabled={capsulesGenerating || capsuleAutoRunning || mindMapGenerating}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0"
              >
                <Zap className="w-3.5 h-3.5" />
                Generate Next Batch ({Math.min(capsuleBatchSize, allPendingTasks.length)})
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
