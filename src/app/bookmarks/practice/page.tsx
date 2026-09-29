'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ArrowRight, CheckCircle2, XCircle, HelpCircle, ChevronLeft, Bookmark, RotateCcw } from 'lucide-react'

type Question = {
  id: number
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  optionE?: string | null
  explanationA?: string | null
  explanationB?: string | null
  explanationC?: string | null
  explanationD?: string | null
  explanationE?: string | null
  topic?: string | null
  explanation?: string | null
  correctAnswer: string
  quiz?: {
    id: number
    name: string
    chapter?: {
      id: number
      name: string
    }
  }
}

function RevisionPracticeContent() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isFinished, setIsFinished] = useState(false)
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set())

  const router = useRouter()
  const searchParams = useSearchParams()
  const chapterId = searchParams.get('chapterId')

  useEffect(() => {
    let url = '/api/bookmarks?includeQuestions=true'
    if (chapterId) url += `&chapterId=${chapterId}`

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.bookmarks && data.bookmarks.length > 0) {
          const qs: Question[] = data.bookmarks.map((b: any) => b.question).filter(Boolean)
          // Shuffle questions
          const shuffled = [...qs]
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          setQuestions(shuffled)
          setBookmarkedIds(new Set(qs.map(q => q.id)))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [chapterId])

  const handleToggleBookmark = async (qId: number) => {
    const isBookmarked = bookmarkedIds.has(qId)
    const nextSet = new Set(bookmarkedIds)
    if (isBookmarked) {
      nextSet.delete(qId)
    } else {
      nextSet.add(qId)
    }
    setBookmarkedIds(nextSet)

    try {
      await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: qId })
      })
    } catch (e) {
      console.error('Failed to update bookmark', e)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-6">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4 text-amber-600">
          <Bookmark className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Revision Questions Found</h2>
        <p className="text-gray-500 mb-6 max-w-sm">
          You haven&apos;t marked any questions for revision yet, or they have all been unmarked.
        </p>
        <Link 
          href="/" 
          className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-xl transition-all shadow-sm"
        >
          Return to Dashboard
        </Link>
      </div>
    )
  }

  if (isFinished) {
    const accuracy = Math.round((score / questions.length) * 100)
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="h-14 bg-white border-b border-gray-200 flex items-center px-6 shrink-0">
          <Link href="/bookmarks" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium">
            <ChevronLeft className="w-4 h-4" /> Back to Revision Hub
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center">
            <div className="w-20 h-20 mx-auto bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mb-6 text-amber-600">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-2">Revision Complete!</h2>
            <p className="text-gray-500 font-medium mb-4">
              You scored <span className="font-bold text-amber-700">{score}</span> out of {questions.length} ({accuracy}% accuracy).
            </p>
            <p className="text-xs text-gray-400 mb-8">
              Keep practicing your marked questions to ensure maximum exam readiness!
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setCurrentIndex(0)
                  setSelectedOption(null)
                  setIsAnswered(false)
                  setScore(0)
                  setIsFinished(false)
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-colors shadow-sm text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Practice Again</span>
              </button>
              <Link
                href="/bookmarks"
                className="w-full block py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition-colors text-sm"
              >
                Return to Revision Hub
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentQ = questions[currentIndex]

  const options = [
    { key: 'A', value: currentQ.optionA, explanation: currentQ.explanationA },
    { key: 'B', value: currentQ.optionB, explanation: currentQ.explanationB },
    { key: 'C', value: currentQ.optionC, explanation: currentQ.explanationC },
    { key: 'D', value: currentQ.optionD, explanation: currentQ.explanationD },
    ...(currentQ.optionE ? [{ key: 'E', value: currentQ.optionE, explanation: currentQ.explanationE }] : [])
  ].filter(opt => opt.value && opt.value !== 'undefined' && opt.value !== null)

  const handleSelect = (key: string) => {
    if (isAnswered) return
    setSelectedOption(key)
    setIsAnswered(true)

    if (key === currentQ.correctAnswer.toUpperCase()) {
      setScore(s => s + 1)
    }
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(curr => curr + 1)
      setSelectedOption(null)
      setIsAnswered(false)
      window.scrollTo(0, 0)
    } else {
      setIsFinished(true)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 pb-24">
      {/* Top Header */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10 shrink-0 shadow-xs">
        <Link href="/bookmarks" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
          <ChevronLeft className="w-4 h-4" /> Exit Revision Practice
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
            Revision Mode
          </span>
          <div className="text-sm font-bold text-gray-800">
            Score: <span className="text-amber-600">{score}</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl w-full mx-auto p-4 md:p-6 lg:p-8 flex-1">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            <span>Revision Question {currentIndex + 1} of {questions.length}</span>
            <span>{Math.round(((currentIndex) / questions.length) * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 transition-all duration-500 ease-out"
              style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content (Question & Options) */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 lg:p-8 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  {currentQ.quiz?.chapter?.name && (
                    <span className="inline-block px-2.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase rounded">
                      {currentQ.quiz.chapter.name}
                    </span>
                  )}
                  {currentQ.topic && (
                    <span className="inline-block px-2.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase rounded">
                      {currentQ.topic}
                    </span>
                  )}
                </div>

                {/* Bookmark Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleBookmark(currentQ.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    bookmarkedIds.has(currentQ.id)
                      ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-xs'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-700'
                  }`}
                  title={bookmarkedIds.has(currentQ.id) ? "Marked for revision - click to unmark" : "Mark to revise"}
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 transition-transform ${
                      bookmarkedIds.has(currentQ.id) ? 'fill-amber-500 text-amber-500' : 'text-gray-400'
                    }`}
                  />
                  <span>{bookmarkedIds.has(currentQ.id) ? 'Marked for Revision' : 'Mark to Revise'}</span>
                </button>
              </div>

              <h3 className="text-lg md:text-xl font-bold text-gray-900 leading-relaxed mb-6">
                {currentQ.questionText}
              </h3>

              <div className="space-y-3">
                {options.map((opt) => {
                  let btnClass = "w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-center group relative overflow-hidden "

                  if (!isAnswered) {
                    btnClass += "border-gray-200 hover:border-amber-300 hover:bg-amber-50/40 cursor-pointer"
                  } else {
                    if (opt.key === currentQ.correctAnswer.toUpperCase()) {
                      btnClass += "border-green-500 bg-green-50 text-green-900"
                    } else if (opt.key === selectedOption) {
                      btnClass += "border-red-400 bg-red-50 text-red-900"
                    } else {
                      btnClass += "border-gray-100 bg-gray-50 opacity-60 grayscale"
                    }
                  }

                  return (
                    <button
                      key={opt.key}
                      onClick={() => {
                        if (!isAnswered) handleSelect(opt.key)
                      }}
                      className={btnClass}
                      disabled={isAnswered}
                    >
                      <div className="flex items-center gap-4 w-full">
                        <div className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold shrink-0 transition-colors
                          ${!isAnswered ? 'bg-gray-100 text-gray-500 group-hover:bg-white group-hover:text-amber-700 shadow-xs' : 
                            (opt.key === currentQ.correctAnswer.toUpperCase() ? 'bg-green-500 text-white shadow-xs' : 
                            (opt.key === selectedOption ? 'bg-red-500 text-white shadow-xs' : 'bg-gray-200 text-gray-400'))}
                        `}>
                          {opt.key}
                        </div>
                        <span className={`font-medium text-[15px] leading-snug flex-1 ${!isAnswered ? 'text-gray-700 group-hover:text-gray-900' : ''}`}>
                          {opt.value}
                        </span>

                        {isAnswered && opt.key === currentQ.correctAnswer.toUpperCase() && (
                          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                        )}
                        {isAnswered && opt.key === selectedOption && opt.key !== currentQ.correctAnswer.toUpperCase() && (
                          <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right Sidebar (Explanation) */}
          <div className="w-full lg:w-[380px] shrink-0">
            {isAnswered ? (
              <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 sticky top-20 animate-in slide-in-from-right-4 fade-in duration-300">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-2 h-6 rounded-full ${selectedOption === currentQ.correctAnswer.toUpperCase() ? 'bg-green-500' : 'bg-red-500'}`} />
                  <h3 className="text-lg font-black text-gray-900">
                    {selectedOption === currentQ.correctAnswer.toUpperCase() ? 'Correct!' : 'Incorrect'}
                  </h3>
                </div>

                <div className="text-sm text-gray-600 leading-relaxed mb-6">
                  {selectedOption === currentQ.correctAnswer.toUpperCase() 
                    ? "Great job! Your memory recall is spot on." 
                    : `The correct answer was Option ${currentQ.correctAnswer.toUpperCase()}.`}
                </div>

                {currentQ.explanation && (
                  <div className="bg-blue-50/60 rounded-xl p-4 border border-blue-100/60">
                    <h4 className="text-[11px] font-black text-blue-800 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" /> Exam Rationale
                    </h4>
                    <p className="text-[13px] font-medium text-blue-900/80 leading-relaxed">
                      {currentQ.explanation}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden lg:flex bg-gray-100/50 border border-gray-200/60 border-dashed rounded-2xl p-8 h-full min-h-[260px] items-center justify-center text-center">
                <div>
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs">
                    <HelpCircle className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">
                    Select an answer to reveal<br/>exam rationale and notes
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      {isAnswered && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20 animate-in slide-in-from-bottom-full duration-300">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="hidden sm:block">
              <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                {selectedOption === currentQ.correctAnswer.toUpperCase() ? '✅ Correct' : '❌ Review the explanation'}
              </span>
            </div>
            <button
              onClick={handleNext}
              className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-8 bg-amber-600 hover:bg-amber-700 text-white text-[15px] font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md"
            >
              {currentIndex === questions.length - 1 ? 'Finish Revision' : 'Next Question'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function RevisionPracticePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    }>
      <RevisionPracticeContent />
    </Suspense>
  )
}
