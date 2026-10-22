'use client'

import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Edit3,
  Trash2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
  X
} from 'lucide-react'
import { sanitizeQuestionText } from '@/lib/sanitizeQuestion'

type Question = {
  id: number
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  optionE?: string | null
  correctAnswer: string
  explanation?: string | null
  quiz?: {
    id: number
    name: string
    chapter?: { id: number; name: string }
  }
}

type QuestionReport = {
  id: number
  questionId: number
  question: Question
  reportedBy?: { id: number; name: string; email: string } | null
  reason: string
  userNote?: string | null
  status: 'PENDING_AI' | 'AUTO_CORRECTED' | 'NEEDS_ADMIN_REVIEW' | 'ADMIN_RESOLVED' | 'DISMISSED'
  aiConfidence?: 'HIGH' | 'MEDIUM' | 'LOW' | null
  aiReasoning?: string | null
  previousAnswer?: string | null
  suggestedAnswer?: string | null
  suggestedExplanation?: string | null
  resolvedAt?: string | null
  createdAt: string
}

type ConceptMediaReport = {
  id: number
  conceptId: number
  mediaType: string
  flaggedUrl?: string | null
  reason: string
  userNote?: string | null
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED'
  createdAt: string
  resolvedAt?: string | null
  concept: {
    id: number
    term: string
    slug: string
    category: string
    imageUrl?: string | null
    thumbnailUrl?: string | null
    imageCaption?: string | null
    sourceUrl?: string | null
    videoUrl?: string | null
    chapter?: { id: number; name: string }
  }
  reportedBy?: { id: number; name: string; email: string } | null
}

export function QuestionReportsHub() {
  const [activeTab, setActiveTab] = useState<'auto' | 'review' | 'resolved' | 'media'>('review')
  const [reports, setReports] = useState<QuestionReport[]>([])
  const [mediaReports, setMediaReports] = useState<ConceptMediaReport[]>([])
  const [counts, setCounts] = useState({ autoCorrected: 0, needsReview: 0, resolved: 0, pendingMedia: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Edit Modal State
  const [editingReport, setEditingReport] = useState<QuestionReport | null>(null)
  const [editForm, setEditForm] = useState({
    correctAnswer: 'A',
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    optionE: '',
    explanation: ''
  })

  const loadReports = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reports?type=${activeTab}`)
      const data = await res.json()
      if (res.ok && data.success) {
        setReports(data.reports || [])
        setMediaReports(data.mediaReports || [])
        setCounts(data.counts || { autoCorrected: 0, needsReview: 0, resolved: 0, pendingMedia: 0, total: 0 })
      }
    } catch (err) {
      console.error('Failed to load reports:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [activeTab])

  const handleAction = async (reportId: number, action: string, customData?: any) => {
    setActionLoadingId(reportId)
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, action, customData })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        await loadReports()
        if (editingReport?.id === reportId) {
          setEditingReport(null)
        }
      } else {
        alert(data.error || 'Action failed')
      }
    } catch (err) {
      console.error('Error performing report action:', err)
      alert('Network error')
    } finally {
      setActionLoadingId(null)
    }
  }

  const openEditModal = (report: QuestionReport) => {
    setEditingReport(report)
    setEditForm({
      correctAnswer: report.question.correctAnswer || 'A',
      questionText: report.question.questionText || '',
      optionA: report.question.optionA || '',
      optionB: report.question.optionB || '',
      optionC: report.question.optionC || '',
      optionD: report.question.optionD || '',
      optionE: report.question.optionE || '',
      explanation: report.question.explanation || ''
    })
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingReport) return
    handleAction(editingReport.id, 'custom_update', editForm)
  }

  const filteredReports = reports.filter(r => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      r.question.questionText.toLowerCase().includes(q) ||
      r.reason.toLowerCase().includes(q) ||
      (r.userNote && r.userNote.toLowerCase().includes(q)) ||
      (r.aiReasoning && r.aiReasoning.toLowerCase().includes(q)) ||
      (r.question.quiz?.name && r.question.quiz.name.toLowerCase().includes(q))
    )
  })

  const filteredMediaReports = mediaReports.filter(m => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      m.concept.term.toLowerCase().includes(q) ||
      m.reason.toLowerCase().includes(q) ||
      (m.userNote && m.userNote.toLowerCase().includes(q)) ||
      (m.concept.chapter?.name && m.concept.chapter.name.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-6">
      {/* Tabs Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('review')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xs ${
              activeTab === 'review'
                ? 'bg-amber-500 text-white shadow-amber-500/20'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span>Needs Manual Review</span>
            {counts.needsReview > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                activeTab === 'review' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
              }`}>
                {counts.needsReview}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('auto')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xs ${
              activeTab === 'auto'
                ? 'bg-blue-600 text-white shadow-blue-500/20'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Auto-Corrected Queue</span>
            {counts.autoCorrected > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                activeTab === 'auto' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
              }`}>
                {counts.autoCorrected}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('resolved')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xs ${
              activeTab === 'resolved'
                ? 'bg-gray-700 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Resolved History</span>
            <span className="text-xs opacity-75">({counts.resolved})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xs ${
              activeTab === 'media'
                ? 'bg-purple-600 text-white shadow-purple-500/20'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <span>🖼️ Flagged Media</span>
            {counts.pendingMedia > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                activeTab === 'media' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-800'
              }`}>
                {counts.pendingMedia}
              </span>
            )}
          </button>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reported questions..."
              className="pl-9 pr-4 py-1.5 rounded-xl text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52 md:w-64"
            />
          </div>
          <button
            type="button"
            onClick={loadReports}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 text-gray-600 dark:text-gray-300 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content List */}
      {loading ? (
        <div className="py-16 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm">Loading reported questions...</p>
        </div>
      ) : activeTab === 'media' ? (
        filteredMediaReports.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-80" />
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
              Clean Slate! No Flagged Media Reports
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              When students flag an inaccurate breed image or broken video link, it will appear here for 1-click removal or review.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMediaReports.map((mReport) => {
              const c = mReport.concept
              const isBusy = actionLoadingId === mReport.id
              const isResolved = mReport.status === 'RESOLVED' || mReport.status === 'DISMISSED'

              return (
                <div
                  key={mReport.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-xs space-y-4"
                >
                  {/* Meta Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-700 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                        {c.term}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {c.category} {c.chapter?.name ? `(${c.chapter.name})` : ''}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                        Reason: {mReport.reason}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        mReport.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : mReport.status === 'RESOLVED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {mReport.status}
                      </span>
                    </div>

                    <div className="text-xs text-gray-400">
                      Reported {new Date(mReport.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    {/* Media Preview */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Media Preview</span>
                      {c.imageUrl ? (
                        <div className="relative w-full h-32 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-900/5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={c.imageUrl}
                            alt={c.term}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : c.videoUrl ? (
                        <a
                          href={c.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 font-bold text-xs flex items-center gap-2 hover:bg-red-100"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Open YouTube Link</span>
                        </a>
                      ) : (
                        <div className="p-3 text-xs text-gray-400 italic bg-gray-50 rounded-xl">
                          Media already removed from concept card.
                        </div>
                      )}
                    </div>

                    {/* Report Notes */}
                    <div className="md:col-span-2 space-y-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Student Issue Description</span>
                        <p className="text-xs text-gray-800 dark:text-gray-200 mt-0.5 font-medium">
                          {mReport.userNote || 'No additional details provided by student.'}
                        </p>
                      </div>

                      {mReport.reportedBy && (
                        <div className="text-[11px] text-gray-400">
                          Reported by: {mReport.reportedBy.name || mReport.reportedBy.email}
                        </div>
                      )}

                      {/* Admin Actions */}
                      {!isResolved && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                          {c.imageUrl && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleAction(mReport.id, 'media_remove_image')}
                              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors"
                            >
                              🗑️ Remove Image
                            </button>
                          )}
                          {c.videoUrl && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleAction(mReport.id, 'media_remove_video')}
                              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors"
                            >
                              🗑️ Remove Video Link
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleAction(mReport.id, 'media_dismiss')}
                            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 transition-colors"
                          >
                            Dismiss (Keep Media)
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleAction(mReport.id, 'media_resolve')}
                            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                          >
                            Mark Resolved
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : filteredReports.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-80" />
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
            {activeTab === 'auto'
              ? 'No AI auto-corrections logged yet'
              : activeTab === 'review'
              ? 'Clean slate! No questions waiting for manual review'
              : 'No resolved reports in history'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
            When users click "Mark as Incorrect", Gemini AI checks the question. Auto-corrections and uncertain questions will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => {
            const q = report.question
            const isAutoTab = activeTab === 'auto' || report.status === 'AUTO_CORRECTED'
            const isBusy = actionLoadingId === report.id

            return (
              <div
                key={report.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-xs hover:border-gray-300 dark:hover:border-gray-600 transition-all space-y-5"
              >
                {/* Meta bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-700 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      ID #{q.id} • {q.quiz?.name || 'Quiz'}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                      Reason: {report.reason.replace(/_/g, ' ')}
                    </span>
                    {report.aiConfidence && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        report.aiConfidence === 'HIGH'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : report.aiConfidence === 'MEDIUM'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        AI Confidence: {report.aiConfidence}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-gray-400">
                    Reported {new Date(report.createdAt).toLocaleDateString()} at {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {/* Question Text */}
                <div className="space-y-3">
                  <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-snug">
                    {sanitizeQuestionText(q.questionText)}
                  </h4>

                  {/* Options Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {[
                      { key: 'A', text: sanitizeQuestionText(q.optionA) },
                      { key: 'B', text: sanitizeQuestionText(q.optionB) },
                      { key: 'C', text: sanitizeQuestionText(q.optionC) },
                      { key: 'D', text: sanitizeQuestionText(q.optionD) },
                      ...(q.optionE ? [{ key: 'E', text: sanitizeQuestionText(q.optionE) }] : [])
                    ].map((opt) => {
                      const isCurrentCorrect = opt.key === q.correctAnswer.toUpperCase()
                      const isPrevAnswer = opt.key === report.previousAnswer?.toUpperCase()
                      const isAiSuggested = opt.key === report.suggestedAnswer?.toUpperCase()

                      return (
                        <div
                          key={opt.key}
                          className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
                            isCurrentCorrect
                              ? 'bg-green-50/70 border-green-300 dark:bg-green-950/30 dark:border-green-800 text-green-900 dark:text-green-200 font-semibold'
                              : isAiSuggested && !isCurrentCorrect
                              ? 'bg-amber-50/70 border-amber-300 dark:bg-amber-950/30 text-amber-900 font-medium'
                              : 'bg-gray-50/60 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded flex items-center justify-center font-black shrink-0 text-[11px] ${
                            isCurrentCorrect
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                          }`}>
                            {opt.key}
                          </span>
                          <span className="flex-1">{opt.text}</span>
                          {isCurrentCorrect && (
                            <span className="text-[10px] font-black uppercase text-green-700 dark:text-green-300">
                              Current Key
                            </span>
                          )}
                          {isAutoTab && isPrevAnswer && !isCurrentCorrect && (
                            <span className="text-[10px] font-bold text-red-600 dark:text-red-400">
                              Previous Key
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* AI Correction Comparison Box for Queue 1 */}
                {isAutoTab && report.previousAnswer && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-600 text-white p-2 rounded-xl shadow-xs">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                          AI Auto-Correction Audit
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm font-black text-gray-800 dark:text-gray-100">
                          <span className="text-red-600 line-through">Previous: Option {report.previousAnswer}</span>
                          <ArrowRight className="w-4 h-4 text-blue-500" />
                          <span className="text-green-600 font-bold">Auto-Corrected: Option {q.correctAnswer}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleAction(report.id, 'revert')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-red-100/80 hover:bg-red-200 transition-colors shadow-xs"
                        title="Undo correction and restore original answer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Revert to {report.previousAnswer}</span>
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleAction(report.id, 'dismiss')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-green-700 bg-green-100 hover:bg-green-200 transition-colors shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve Fix</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* AI Reasoning & User Note Box */}
                <div className="bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-2 text-xs">
                  {report.userNote && (
                    <div className="pb-2 border-b border-gray-200 dark:border-gray-600">
                      <span className="font-bold text-gray-700 dark:text-gray-300">User's Note:</span>{' '}
                      <span className="italic text-gray-600 dark:text-gray-300">"{report.userNote}"</span>
                    </div>
                  )}

                  {report.aiReasoning && (
                    <div>
                      <span className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1 mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Gemini AI Assessment:
                      </span>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {report.aiReasoning}
                      </p>
                    </div>
                  )}

                  {q.explanation && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">Explanation on File:</span> {q.explanation}
                    </div>
                  )}
                </div>

                {/* Actions for Queue 2 (Needs Manual Review) */}
                {activeTab === 'review' && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      {report.suggestedAnswer && report.suggestedAnswer !== q.correctAnswer && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleAction(report.id, 'accept_ai')}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-700 text-white shadow-xs transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Accept AI Suggestion ({report.suggestedAnswer})</span>
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => openEditModal(report)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors shadow-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Question</span>
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleAction(report.id, 'retry_ai')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors"
                        title="Re-run AI verification"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Re-verify AI</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleAction(report.id, 'dismiss')}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Dismiss (Keep As-Is)
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Question Modal */}
      {editingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Edit Question #{editingReport.question.id}
              </h3>
              <button
                type="button"
                onClick={() => setEditingReport(null)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Question Text
                </label>
                <textarea
                  value={editForm.questionText}
                  onChange={(e) => setEditForm({ ...editForm, questionText: e.target.value })}
                  rows={3}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(['A', 'B', 'C', 'D', 'E'] as const).map((opt) => {
                  const key = `option${opt}` as keyof typeof editForm
                  return (
                    <div key={opt}>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Option {opt} {opt === 'E' ? '(Optional)' : ''}
                      </label>
                      <input
                        type="text"
                        value={editForm[key] || ''}
                        onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                        className="w-full text-xs p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                        required={opt !== 'E'}
                      />
                    </div>
                  )
                })}

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Correct Answer Key
                  </label>
                  <select
                    value={editForm.correctAnswer}
                    onChange={(e) => setEditForm({ ...editForm, correctAnswer: e.target.value })}
                    className="w-full text-xs p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold text-blue-600"
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                    {editForm.optionE && <option value="E">Option E</option>}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Explanation
                </label>
                <textarea
                  value={editForm.explanation}
                  onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === editingReport.id}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  Save & Resolve Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
