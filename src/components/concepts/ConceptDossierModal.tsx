'use client'

import React, { useEffect, useState } from 'react'
import { X, BookOpen, AlertTriangle, Layers, ArrowRight, HelpCircle, Loader2 } from 'lucide-react'
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
              {concept.questions?.map((q, idx) => (
                <div key={q.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">Q{idx + 1}.</span>
                    <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{q.questionText}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className={`p-2 rounded-lg border ${q.correctAnswer === 'A' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 font-bold text-emerald-800 dark:text-emerald-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                      A: {q.optionA}
                    </div>
                    <div className={`p-2 rounded-lg border ${q.correctAnswer === 'B' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 font-bold text-emerald-800 dark:text-emerald-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                      B: {q.optionB}
                    </div>
                    <div className={`p-2 rounded-lg border ${q.correctAnswer === 'C' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 font-bold text-emerald-800 dark:text-emerald-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                      C: {q.optionC}
                    </div>
                    <div className={`p-2 rounded-lg border ${q.correctAnswer === 'D' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 font-bold text-emerald-800 dark:text-emerald-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
