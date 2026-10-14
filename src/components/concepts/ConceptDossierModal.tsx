'use client'

import React, { useEffect, useState } from 'react'
import {
  X,
  BookOpen,
  AlertTriangle,
  Layers,
  ArrowRight,
  HelpCircle,
  Loader2,
  ExternalLink,
  Flag,
  Play,
  ImageIcon,
  CheckCircle2
} from 'lucide-react'
import { FormattedExplanation } from '@/components/FormattedExplanation'

export interface ConceptDetail {
  id: number
  term: string
  slug: string
  category: string
  subCategory?: string | null
  definition: string
  content: string
  examTraps?: string | null
  relatedTerms: string[]
  imageUrl?: string | null
  thumbnailUrl?: string | null
  imageCaption?: string | null
  sourceUrl?: string | null
  videoUrl?: string | null
  chapter?: { id: number; name: string }
  questions?: {
    id: number
    questionText: string
    optionA: string
    optionB: string
    optionC: string
    optionD: string
    optionE?: string | null
    correctAnswer: string
    explanation?: string | null
  }[]
}

interface ConceptDossierModalProps {
  slug: string | null
  chapterId?: number
  onClose: () => void
  onSelectRelatedTerm?: (termSlug: string) => void
}

export function ConceptDossierModal({
  slug,
  chapterId,
  onClose,
  onSelectRelatedTerm
}: ConceptDossierModalProps) {
  const [concept, setConcept] = useState<ConceptDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'notes' | 'mcqs'>('notes')

  // Media Report State
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [reportType, setReportType] = useState<'IMAGE' | 'VIDEO'>('IMAGE')
  const [reportReason, setReportReason] = useState('Incorrect / Mismatched breed or entity')
  const [reportDetails, setReportDetails] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportSuccess, setReportSuccess] = useState(false)

  useEffect(() => {
    if (!slug) return

    let cancelled = false
    setLoading(true)
    const url = `/api/concepts/${encodeURIComponent(slug)}${chapterId ? `?chapterId=${chapterId}` : ''}`
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data.concept) {
          setConcept(data.concept)
        }
      })
      .catch(err => console.error('Failed to load concept detail', err))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug, chapterId])

  const handleOpenReport = (type: 'IMAGE' | 'VIDEO') => {
    setReportType(type)
    setReportReason(
      type === 'IMAGE'
        ? 'Incorrect / Mismatched breed or entity'
        : 'Inaccurate or broken video link'
    )
    setReportDetails('')
    setReportSuccess(false)
    setReportModalOpen(true)
  }

  const handleSubmitReport = async () => {
    if (!concept) return
    try {
      setReportSubmitting(true)
      const res = await fetch('/api/reports/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptId: concept.id,
          reportedUrl: reportType === 'IMAGE' ? concept.imageUrl : concept.videoUrl,
          reason: reportReason,
          details: reportDetails
        })
      })

      if (res.ok) {
        setReportSuccess(true)
        setTimeout(() => {
          setReportModalOpen(false)
          setReportSuccess(false)
        }, 1800)
      } else {
        alert('Failed to submit report. Please try again.')
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting report')
    } finally {
      setReportSubmitting(false)
    }
  }

  if (!slug) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm transition-all animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-sm shadow-emerald-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
                  {concept?.category || 'High-Yield Keyword'}
                </span>
                {concept?.subCategory && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {concept.subCategory}
                    </span>
                  </>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {concept?.term || slug.replace(/-/g, ' ')}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        {concept && concept.questions && concept.questions.length > 0 && (
          <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 gap-6 bg-white dark:bg-slate-900 text-sm font-semibold">
            <button
              onClick={() => setActiveTab('notes')}
              className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'notes'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              High-Yield Capsule
            </button>
            <button
              onClick={() => setActiveTab('mcqs')}
              className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'mcqs'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              MCQs on this Concept ({concept.questions.length})
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              <p className="text-sm font-medium">Loading high-yield concept capsule...</p>
            </div>
          ) : !concept ? (
            <div className="text-center py-16 text-slate-500">
              Concept details are currently being curated for this keyword.
            </div>
          ) : activeTab === 'notes' ? (
            <>
              {/* Core Definition Card */}
              <div className="relative p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200/70 dark:border-emerald-800/40 shadow-xs">
                <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-700 dark:text-emerald-400 block mb-1.5">
                  Core Examination Definition
                </span>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                  {concept.definition}
                </p>
              </div>

              {/* Visual Media & Field Demo Section */}
              {(concept.imageUrl || concept.videoUrl) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Photo Visualizer */}
                  {concept.imageUrl && (
                    <div className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-950/40 shadow-xs">
                      <div className="relative w-full h-48 bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={concept.imageUrl}
                          alt={concept.term}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            if (concept.thumbnailUrl && e.currentTarget.src !== concept.thumbnailUrl) {
                              e.currentTarget.src = concept.thumbnailUrl
                            }
                          }}
                        />
                        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/75 text-white backdrop-blur-xs flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          Wikimedia CC
                        </div>
                      </div>
                      <div className="p-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
                        <span className="truncate max-w-[200px]" title={concept.imageCaption || concept.term}>
                          {concept.imageCaption || concept.term}
                        </span>
                        <div className="flex items-center gap-2">
                          {concept.sourceUrl && (
                            <a
                              href={concept.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 font-medium"
                            >
                              <span>Source</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          <button
                            onClick={() => handleOpenReport('IMAGE')}
                            className="text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                            title="Report inaccurate image"
                          >
                            <Flag className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* YouTube Clinical / Field Demo */}
                  {concept.videoUrl && (
                    <div className="flex flex-col justify-between p-4 rounded-2xl border border-red-200/80 dark:border-red-950/40 bg-gradient-to-br from-red-50/50 via-white to-red-50/30 dark:from-red-950/20 dark:via-slate-900 dark:to-red-950/10 shadow-xs">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 flex items-center gap-1">
                            <Play className="w-3 h-3 fill-red-600 text-red-600 dark:text-red-400" />
                            Practical Demonstration
                          </span>
                          <button
                            onClick={() => handleOpenReport('VIDEO')}
                            className="text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-xs flex items-center gap-1"
                            title="Report video issue"
                          >
                            <Flag className="w-3 h-3" />
                          </button>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          Clinical & Field Procedure Video
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          Watch verified practical demonstrations of {concept.term} in clinical & livestock field settings.
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-red-100 dark:border-red-950/50 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 font-medium">YouTube Field Search</span>
                        <a
                          href={concept.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-colors"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Watch Demo
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Main Content & Tables */}
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <FormattedExplanation text={concept.content} />
              </div>

              {/* Exam Traps Callout */}
              {concept.examTraps && (
                <div className="p-4.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2 mb-2 font-bold text-amber-800 dark:text-amber-400">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span>Examiner Trap & High-Probability Rules</span>
                  </div>
                  <div className="text-sm leading-relaxed text-amber-950 dark:text-amber-100">
                    <FormattedExplanation text={concept.examTraps} />
                  </div>
                </div>
              )}

              {/* Related Adjacent Terms */}
              {concept.relatedTerms && concept.relatedTerms.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <Layers className="w-4 h-4" />
                    Adjacent Linked Concepts
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {concept.relatedTerms.map((termName, i) => {
                      const termSlug = termName.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-')
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            if (onSelectRelatedTerm) {
                              onSelectRelatedTerm(termSlug)
                            }
                          }}
                          className="group inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 transition-all cursor-pointer shadow-2xs"
                        >
                          <span>{termName}</span>
                          <ArrowRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* MCQs List */
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Multiple-Choice Questions Testing &ldquo;{concept.term}&rdquo;
              </p>
              {concept.questions?.map((q, idx) => {
                const correctAns = (q.correctAnswer || '').trim().toUpperCase()
                return (
                  <div key={q.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">Q{idx + 1}.</span>
                      <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{q.questionText}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className={`p-2 rounded-lg border ${correctAns === 'A' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 font-bold text-emerald-800 dark:text-emerald-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                        A: {q.optionA}
                      </div>
                      <div className={`p-2 rounded-lg border ${correctAns === 'B' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 font-bold text-emerald-800 dark:text-emerald-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                        B: {q.optionB}
                      </div>
                      <div className={`p-2 rounded-lg border ${correctAns === 'C' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 font-bold text-emerald-800 dark:text-emerald-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                        C: {q.optionC}
                      </div>
                      <div className={`p-2 rounded-lg border ${correctAns === 'D' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 font-bold text-emerald-800 dark:text-emerald-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                        D: {q.optionD}
                      </div>
                    </div>
                  {q.explanation && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">Explanation: </span>
                      {q.explanation}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          )}
        </div>
      </div>

      {/* Flag / Report Media Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-base">
                <Flag className="w-5 h-5" />
                <span>Report {reportType === 'IMAGE' ? 'Image' : 'Video Link'}</span>
              </div>
              <button
                onClick={() => setReportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-in zoom-in" />
                <p className="font-bold text-slate-900 dark:text-white">Report Received!</p>
                <p className="text-xs text-slate-500">
                  Thank you. Our agronomy moderation team will review this media.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    What is the issue with this {reportType === 'IMAGE' ? 'image' : 'video'}?
                  </label>
                  <select
                    value={reportReason}
                    onChange={e => setReportReason(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    <option value="Incorrect / Mismatched breed or entity">Incorrect / Mismatched breed or entity</option>
                    <option value="Inaccurate anatomical or clinical diagram">Inaccurate anatomical or clinical diagram</option>
                    <option value="Low quality or unclear visual">Low quality or unclear visual</option>
                    <option value="Broken link or media error">Broken link or media error</option>
                    <option value="Inappropriate or unrelated content">Inappropriate or unrelated content</option>
                    <option value="Other issue">Other issue</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Optional Details / Suggestion
                  </label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={e => setReportDetails(e.target.value)}
                    placeholder="e.g. This photo shows a Jersey cow instead of Sahiwal breed..."
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setReportModalOpen(false)}
                    disabled={reportSubmitting}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitReport}
                    disabled={reportSubmitting}
                    className="px-4 py-1.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {reportSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Submit Report
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
