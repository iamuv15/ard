'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Brain, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  BookOpen, 
  ExternalLink,
  ChevronRight,
  Zap,
  HelpCircle
} from 'lucide-react'

interface ChapterData {
  id: number
  name: string
  cohort: string
  totalQuestions: number
  mindMap: {
    id: number
    lastSyncAt: string
    keywordsCount: number
    categoriesCount: number
  } | null
  conceptsCount: number
}

export default function AdminMindMapsHubPage() {
  const [chapters, setChapters] = useState<ChapterData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [generatingId, setGeneratingId] = useState<number | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadChapters = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/mindmaps')
      const data = await res.json()
      if (res.ok) {
        setChapters(data.chapters || [])
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to load chapters' })
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error loading chapters' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadChapters()
  }, [])

  // Trigger Mind Map generation with 10k Thinking Budget
  const handleGenerateMindMap = async (chapterId: number, chapterName: string) => {
    try {
      setGeneratingId(chapterId)
      setStatusMessage(null)

      const res = await fetch(`/api/admin/chapters/${chapterId}/mindmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const data = await res.json()
      if (res.ok) {
        setStatusMessage({
          type: 'success',
          text: `Mind Map for "${chapterName}" generated successfully with 10,000 thinking tokens! Extracted ${data.totalKeywordsExtracted} keywords.`
        })
        loadChapters()
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to generate mind map' })
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Unexpected error' })
    } finally {
      setGeneratingId(null)
    }
  }

  const filteredChapters = chapters.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalMindMapsReady = chapters.filter(c => Boolean(c.mindMap)).length
  const totalConceptsGenerated = chapters.reduce((acc, c) => acc + c.conceptsCount, 0)
  const totalKeywordsAcrossChapters = chapters.reduce((acc, c) => acc + (c.mindMap?.keywordsCount || 0), 0)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8 text-slate-900 dark:text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <Link 
          href="/admin" 
          className="inline-flex items-center text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin Dashboard
        </Link>

        {/* Header Hero Banner */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                <Brain className="w-3.5 h-3.5" />
                Dedicated Mind Map & Taxonomy Control
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Chapter Mind Maps & Terminology Hub
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl font-medium">
                Create and manage high-yield chapter mind maps powered by <strong>Gemini 3.5 Flash-Lite</strong> with <strong>10,000 thinking tokens</strong>. Reverse-engineer syllabus topics directly from multiple-choice questions.
              </p>
            </div>

            <div className="flex items-center gap-4 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-slate-800">
              <div className="text-center px-4 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {totalMindMapsReady}/{chapters.length}
                </div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Mind Maps Ready
                </div>
              </div>

              <div className="text-center px-4 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {totalConceptsGenerated}
                </div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Capsules Live
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Alerts */}
        {statusMessage && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-medium ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}>
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Toolbar: Search */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter chapters..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Showing {filteredChapters.length} of {chapters.length} chapters
          </div>
        </div>

        {/* Chapters Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-sm font-medium">Loading chapter mind map status...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredChapters.map(chapter => {
              const hasMindMap = Boolean(chapter.mindMap)
              const isGenerating = generatingId === chapter.id

              return (
                <div
                  key={chapter.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-800 transition-all space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {chapter.cohort}
                        </span>
                        <span className="text-xs text-slate-400">
                          {chapter.totalQuestions} Questions
                        </span>
                      </div>

                      {hasMindMap ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" />
                          Mind Map Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                          Pending Setup
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      {chapter.name}
                    </h3>

                    {hasMindMap && (
                      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span>🏷️ {chapter.mindMap?.keywordsCount} Keywords</span>
                        <span>📑 {chapter.mindMap?.categoriesCount} Macro-Branches</span>
                        <span>📖 {chapter.conceptsCount} Capsules</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <button
                      onClick={() => handleGenerateMindMap(chapter.id, chapter.name)}
                      disabled={isGenerating || chapter.totalQuestions === 0}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        hasMindMap
                          ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      } disabled:opacity-50`}
                      title="Generates/re-clusters taxonomy using Gemini with 10k thinking tokens"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Reasoning (10k tokens)...
                        </>
                      ) : (
                        <>
                          <Brain className="w-3.5 h-3.5 text-emerald-500" />
                          {hasMindMap ? 'Re-Sync Mind Map' : 'Generate Mind Map (10k Thinking)'}
                        </>
                      )}
                    </button>

                    <Link
                      href={`/admin/chapter/${chapter.id}/concepts`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-xs font-bold border border-blue-200/60 dark:border-blue-800/40 transition-colors"
                    >
                      <span>Manage Capsules</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
