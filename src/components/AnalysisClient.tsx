'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart2,
  Target,
  Minus,
  Bookmark,
  Zap,
  BookOpen,
  Sparkles,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  Brain,
  Loader2
} from 'lucide-react'
import { ReportQuestionButton } from '@/components/ReportQuestionButton'
import { FormattedExplanation } from '@/components/FormattedExplanation'
import { SimplifyExplanationButton } from '@/components/SimplifyExplanationButton'
import { AdminReEnrichButton } from '@/components/admin/AdminReEnrichButton'

type Concept = {
  id: number
  slug: string
  term: string
  category: string
  chapterId: number
}

type Question = {
  id: number
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  optionE?: string | null
  explanation?: string | null
  simpleExplanation?: string | null
  correctAnswer: string
  topic?: string | null
  concepts?: Concept[]
}

type Props = {
  quizId: number
  quizName: string
  chapterId?: number
  chapterName?: string
  questions: Question[]
}

export default function AnalysisClient({ quizId, quizName, chapterId, chapterName, questions }: Props) {
  const [questionList, setQuestionList] = useState(questions)
  const [result, setResult] = useState<{
    answers: Record<number, string>
    score: number
    total: number
    timeTaken: number
  } | null>(null)
  const [bookmarks, setBookmarks] = useState<Record<number, string>>({})
  const [bookmarkDropdownOpen, setBookmarkDropdownOpen] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/bookmarks')
      .then(res => res.json())
      .then(data => {
        if (data.bookmarksRecord) {
          setBookmarks(data.bookmarksRecord)
        }
      })
      .catch(err => console.error('Failed to load bookmarks', err))
  }, [])

  const handleBookmarkClick = (qId: number) => {
    setBookmarkDropdownOpen(bookmarkDropdownOpen === qId ? null : qId)
  }

  const handleBookmarkAction = async (qId: number, level: 'IMPORTANT' | 'MOST_IMPORTANT' | 'REMOVE') => {
    setBookmarkDropdownOpen(null)
    const newLevel = level === 'REMOVE' ? null : level

    setBookmarks(prev => {
      const next = { ...prev }
      if (newLevel) {
        next[qId] = newLevel
      } else {
        delete next[qId]
      }
      return next
    })

    try {
      await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          questionId: qId, 
          importanceLevel: newLevel,
          action: level === 'REMOVE' ? 'remove' : undefined
        })
      })
    } catch (e) {
      console.error('Failed to update bookmark', e)
    }
  }

  useEffect(() => {
    const data = localStorage.getItem(`mock_result_${quizId}`)
    if (data) {
      setResult(JSON.parse(data))
    }
  }, [quizId])

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">No test results found.</p>
          <Link href="/" className="text-blue-500 hover:underline mt-4 block text-sm">Return Home</Link>
        </div>
      </div>
    )
  }

  const accuracy = Math.round((result.score / result.total) * 100) || 0
  const incorrect = result.total - result.score - (result.total - Object.keys(result.answers).length)
  const skipped = result.total - Object.keys(result.answers).length
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}m ${s}s`
  }

  // Aggregate weak concepts and missed question IDs
  const { missedQuestionIds, weakConcepts } = useMemo(() => {
    if (!result) return { missedQuestionIds: [], weakConcepts: [] }

    const missedIds: number[] = []
    const conceptMap = new Map<string, { concept: Concept; count: number; questionIds: number[] }>()

    questionList.forEach((q, idx) => {
      const userAns = result.answers[idx]
      const correctAns = q.correctAnswer.toUpperCase()
      const isCorrect = userAns === correctAns
      if (!isCorrect) {
        missedIds.push(q.id)
        if (q.concepts && q.concepts.length > 0) {
          q.concepts.forEach(c => {
            const existing = conceptMap.get(c.slug)
            if (existing) {
              existing.count += 1
              if (!existing.questionIds.includes(q.id)) existing.questionIds.push(q.id)
            } else {
              conceptMap.set(c.slug, { concept: c, count: 1, questionIds: [q.id] })
            }
          })
        }
      }
    })

    return {
      missedQuestionIds: missedIds,
      weakConcepts: Array.from(conceptMap.values()).sort((a, b) => b.count - a.count)
    }
  }, [result, questionList])

  const [generatingAi, setGeneratingAi] = useState(false)
  const [aiMessage, setAiMessage] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  const handleGenerateAiQuestions = async (specificConceptIds?: number[]) => {
    const ids = specificConceptIds || weakConcepts.map(w => w.concept.id)
    if (ids.length === 0) return

    setGeneratingAi(true)
    setAiMessage(null)
    setAiError(null)

    try {
      const res = await fetch('/api/concepts/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptIds: ids,
          chapterId,
          quizId,
          count: 5
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate AI questions')

      setAiMessage(`✓ Generated and saved ${data.count} AI exam-trap questions to database! Loading practice drill...`)
      setTimeout(() => {
        window.location.href = `/redemption/quiz?conceptIds=${ids.join(',')}&chapterId=${chapterId}&cooldown=true`
      }, 1200)
    } catch (err: any) {
      setAiError(err.message || 'Error generating questions with Gemini 3.5 Flash Lite')
    } finally {
      setGeneratingAi(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Top bar */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-6 sticky top-0 z-10">
        <Link
          href={chapterId ? `/chapter/${chapterId}` : '/'}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {chapterName || 'Chapter'}</span>
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-black text-gray-900">Test Analysis</h1>
          <p className="text-gray-500 text-sm mt-1">{quizName} • Completed in {formatTime(result.timeTaken)}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-200 text-center">
            <div className="flex justify-center mb-2"><Target className="w-5 h-5 text-blue-500" /></div>
            <div className="text-3xl font-black text-gray-900">{result.score}<span className="text-lg text-gray-400">/{result.total}</span></div>
            <div className="text-[11px] font-bold text-gray-400 uppercase mt-1">Score</div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200 text-center">
            <div className="flex justify-center mb-2"><BarChart2 className="w-5 h-5 text-green-500" /></div>
            <div className="text-3xl font-black text-gray-900">{accuracy}%</div>
            <div className="text-[11px] font-bold text-gray-400 uppercase mt-1">Accuracy</div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200 text-center">
            <div className="flex justify-center mb-2"><XCircle className="w-5 h-5 text-red-400" /></div>
            <div className="text-3xl font-black text-gray-900">{incorrect < 0 ? 0 : incorrect}</div>
            <div className="text-[11px] font-bold text-gray-400 uppercase mt-1">Incorrect</div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200 text-center">
            <div className="flex justify-center mb-2"><Minus className="w-5 h-5 text-orange-400" /></div>
            <div className="text-3xl font-black text-gray-900">{skipped}</div>
            <div className="text-[11px] font-bold text-gray-400 uppercase mt-1">Skipped</div>
          </div>
        </div>

        {/* Targeted Review & Weak Concepts Section */}
        {missedQuestionIds.length > 0 ? (
          <div className="bg-white rounded-2xl border border-rose-100 shadow-xs p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-rose-100">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-200">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Targeted Gap Analysis</span>
                </div>
                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <span>Weak Concepts to Master</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                    {missedQuestionIds.length} Missed
                  </span>
                </h2>
                <p className="text-xs text-gray-500 max-w-xl">
                  You missed or skipped {missedQuestionIds.length} question{missedQuestionIds.length === 1 ? '' : 's'} in this test. Re-study the linked high-yield notes and visual documentation below, then test your retention immediately.
                </p>
              </div>

              {/* Action Buttons for Retest & AI Generation */}
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. Pick all questions of that particular keyword */}
                <Link
                  href={`/redemption/quiz?conceptIds=${weakConcepts.map(w => w.concept.id).join(',')}&chapterId=${chapterId}&cooldown=true`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all whitespace-nowrap cursor-pointer"
                  title="Practice all existing questions from the chapter covering your weak keywords"
                >
                  <Zap className="w-4 h-4 fill-current text-amber-300" />
                  <span>Retest All Keyword Questions ({weakConcepts.length} Topics)</span>
                </Link>

                {/* 2. Generate 5-10 AI Trap Questions on demand with Gemini 3.5 Flash Lite */}
                <button
                  type="button"
                  onClick={() => handleGenerateAiQuestions()}
                  disabled={generatingAi}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs shadow-sm hover:shadow transition-all whitespace-nowrap cursor-pointer"
                  title="Use Gemini 3.5 Flash Lite to create 5 new trap questions on your weak concepts and save to database"
                >
                  {generatingAi ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-200" />
                      <span>Generating with Gemini 3.5 Flash Lite...</span>
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 text-indigo-200" />
                      <span>🧠 Generate 5 AI Trap Questions</span>
                    </>
                  )}
                </button>

                {chapterId && (
                  <Link
                    href={`/chapter/${chapterId}/concepts`}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-colors"
                    title="Open 3-Column Notes Reader for this chapter"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                    <span>Open Chapter Notes</span>
                  </Link>
                )}
              </div>
            </div>

            {/* AI Generation Status / Error Messages */}
            {aiMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{aiMessage}</span>
              </div>
            )}
            {aiError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

            {/* List of Weak Concepts */}
            {weakConcepts.length > 0 ? (
              <div className="space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  High-Yield Concept Notes Requiring Attention:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {weakConcepts.map(({ concept, count }) => (
                    <div
                      key={concept.id}
                      className="group flex flex-col justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-emerald-500 hover:shadow-sm transition-all"
                    >
                      <div className="space-y-1.5 mb-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-600">
                            {concept.category}
                          </span>
                          <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> {count} question{count === 1 ? '' : 's'} missed
                          </span>
                        </div>
                        <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                          {concept.term}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Link
                          href={`/chapter/${chapterId || concept.chapterId}/concepts?concept=${encodeURIComponent(concept.slug)}`}
                          className="flex-1 inline-flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Study Notes</span>
                          </span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleGenerateAiQuestions([concept.id])}
                          disabled={generatingAi}
                          className="px-2.5 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shrink-0 flex items-center gap-1"
                          title="Generate 5 new AI trap questions specifically for this concept and save to database"
                        >
                          <Brain className="w-3.5 h-3.5" />
                          <span>+AI Traps</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Questions missed in this quiz are general questions without specific concept tags.
              </p>
            )}
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-emerald-950 text-lg">Flawless Mastery!</h3>
                <p className="text-xs text-emerald-700">You scored 100% on this quiz. All core concepts are solidly retained.</p>
              </div>
            </div>
            {chapterId && (
              <Link
                href={`/chapter/${chapterId}`}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors whitespace-nowrap"
              >
                Back to Chapter Hub →
              </Link>
            )}
          </div>
        )}

        {/* Detailed Solutions */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-gray-900">Detailed Solutions</h2>
          <div className="space-y-4">
            {questionList.map((q, idx) => {
              const userAns = result.answers[idx]
              const correctAns = q.correctAnswer.toUpperCase()
              const isCorrect = userAns === correctAns
              const isSkipped = !userAns

              return (
                <div key={q.id} className="bg-white rounded-xl p-6 border border-gray-200">
                  {/* Question header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-gray-400 uppercase">Q{idx + 1}</span>
                      {isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" /> CORRECT
                        </span>
                      ) : isSkipped ? (
                        <span className="inline-flex items-center gap-1 text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-[10px] font-bold">
                          SKIPPED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold">
                          <XCircle className="w-3 h-3" /> INCORRECT
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <ReportQuestionButton key={q.id} questionId={q.id} />
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => handleBookmarkClick(q.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm ${
                          bookmarks[q.id] === 'MOST_IMPORTANT'
                            ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                            : bookmarks[q.id] === 'IMPORTANT'
                            ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        title="Mark to revise later"
                      >
                        <Bookmark
                          className={`w-4 h-4 transition-transform ${
                            bookmarks[q.id] === 'MOST_IMPORTANT' ? 'fill-red-500 text-red-500' 
                            : bookmarks[q.id] === 'IMPORTANT' ? 'fill-amber-500 text-amber-500' 
                            : 'text-gray-400'
                          }`}
                        />
                        <span>
                          {bookmarks[q.id] === 'MOST_IMPORTANT' ? 'Highly Probable 🔥' 
                          : bookmarks[q.id] === 'IMPORTANT' ? 'Marked' 
                          : 'Mark to Revise'}
                        </span>
                      </button>
                      
                      {bookmarkDropdownOpen === q.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setBookmarkDropdownOpen(null)} 
                          />
                          <div className="absolute top-full right-0 mt-1.5 w-56 bg-white border border-gray-100 shadow-xl rounded-xl z-20 py-1.5 overflow-hidden ring-1 ring-black/5">
                          {!bookmarks[q.id] && (
                            <>
                              <button 
                                onClick={() => handleBookmarkAction(q.id, 'IMPORTANT')}
                                className="w-full text-left px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2.5 transition-colors"
                              >
                                ⭐ Save as Important
                              </button>
                              <button 
                                onClick={() => handleBookmarkAction(q.id, 'MOST_IMPORTANT')}
                                className="w-full text-left px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-red-700 flex items-center gap-2.5 transition-colors"
                              >
                                🔥 Save as Highly Probable
                              </button>
                            </>
                          )}
                          
                          {bookmarks[q.id] === 'IMPORTANT' && (
                            <button 
                              onClick={() => handleBookmarkAction(q.id, 'MOST_IMPORTANT')}
                              className="w-full text-left px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-red-700 flex items-center gap-2.5 transition-colors"
                            >
                              🔥 Upgrade to Highly Probable
                            </button>
                          )}
                          
                          {bookmarks[q.id] === 'MOST_IMPORTANT' && (
                            <button 
                              onClick={() => handleBookmarkAction(q.id, 'IMPORTANT')}
                              className="w-full text-left px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2.5 transition-colors"
                            >
                              ⭐ Downgrade to Important
                            </button>
                          )}

                          {bookmarks[q.id] && (
                            <div className="px-3 py-1">
                              <div className="h-px bg-gray-100 mb-1"></div>
                              <button 
                                onClick={() => handleBookmarkAction(q.id, 'REMOVE')}
                                className="w-full text-left px-2 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2.5 transition-colors"
                              >
                                ❌ Remove from Saved
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                      )}
                      </div>
                    </div>
                  </div>

                  <p className="text-[15px] font-medium mb-5 text-gray-800 leading-relaxed">{q.questionText}</p>

                  {/* Options */}
                  <div className="space-y-2 mb-4">
                    {[
                      { k: 'A', v: q.optionA },
                      { k: 'B', v: q.optionB },
                      { k: 'C', v: q.optionC },
                      { k: 'D', v: q.optionD },
                      ...(q.optionE ? [{ k: 'E', v: q.optionE }] : [])
                    ].map(opt => {
                      const isThisCorrect = opt.k === correctAns
                      const isThisUserPick = opt.k === userAns
                      let borderClass = 'border-gray-200'
                      let bgClass = 'bg-white'
                      if (isThisCorrect) {
                        borderClass = 'border-green-400'
                        bgClass = 'bg-green-50'
                      } else if (isThisUserPick) {
                        borderClass = 'border-red-400'
                        bgClass = 'bg-red-50'
                      }
                      return (
                        <div key={opt.k} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${borderClass} ${bgClass}`}>
                          <div className={`
                            w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                            ${isThisCorrect ? 'bg-green-500 text-white' : (isThisUserPick ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500')}
                          `}>{opt.k}</div>
                          <span className="text-sm text-gray-700">{opt.v}</span>
                          {isThisCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-auto shrink-0" />}
                          {isThisUserPick && !isThisCorrect && <XCircle className="w-3.5 h-3.5 text-red-500 ml-auto shrink-0" />}
                        </div>
                      )
                    })}
                  </div>

                  {/* Explanation */}
                  {q.explanation && (
                    <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 mt-3">
                      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-200">
                        <h4 className="text-xs font-bold text-slate-900 uppercase">Explanation</h4>
                        <AdminReEnrichButton
                          questionId={q.id}
                          onEnriched={(newExp) => {
                            setQuestionList(prev => prev.map(item => item.id === q.id ? { ...item, explanation: newExp } : item))
                          }}
                        />
                      </div>
                      <FormattedExplanation text={q.explanation} className="text-sm text-slate-800 leading-relaxed" />
                      <SimplifyExplanationButton
                        key={q.id}
                        questionId={q.id}
                        initialSimpleExplanation={q.simpleExplanation}
                      />
                    </div>
                  )}

                  {/* Linked High-Yield Concepts */}
                  {q.concepts && q.concepts.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Linked Concept Notes:
                      </span>
                      {q.concepts.map(c => (
                        <Link
                          key={c.id}
                          href={`/chapter/${chapterId || c.chapterId}/concepts?concept=${encodeURIComponent(c.slug)}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <BookOpen className="w-3 h-3 text-emerald-600" />
                          <span>{c.term}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-emerald-500" />
                        </Link>
                      ))}
                    </div>
                  )}

                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
