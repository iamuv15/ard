'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, XCircle, Clock, BarChart2, Target, Minus, Bookmark } from 'lucide-react'

type Question = {
  id: number
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  optionE?: string | null
  explanation?: string | null
  correctAnswer: string
}

type Props = {
  quizId: number
  quizName: string
  questions: Question[]
}

export default function AnalysisClient({ quizId, quizName, questions }: Props) {
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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Top bar */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-6 sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium">
          ← {quizName}
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

        {/* Detailed Solutions */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-gray-900">Detailed Solutions</h2>
          <div className="space-y-4">
            {questions.map((q, idx) => {
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
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                      <h4 className="text-[11px] font-bold text-blue-700 uppercase mb-1">Explanation</h4>
                      <p className="text-sm text-blue-900 leading-relaxed">{q.explanation}</p>
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
