'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Pause, Flag, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

type Question = {
  id: number
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  optionE?: string | null
  correctAnswer: string
}

type Props = {
  quizId: number
  quizName: string
  questions: Question[]
  userName: string | null
}

type QuestionStatus = 'not_visited' | 'not_answered' | 'answered' | 'marked' | 'answered_marked'

export default function MockEngineClient({ quizId, quizName, questions, userName }: Props) {
  const router = useRouter()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [statuses, setStatuses] = useState<Record<number, QuestionStatus>>({})
  const [timeLeft, setTimeLeft] = useState(questions.length * 60)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (questions.length > 0 && !statuses[0]) {
      setStatuses(prev => ({ ...prev, [0]: 'not_answered' }))
    }
  }, [questions])

  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmitTest()
      return
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')} : ${m.toString().padStart(2, '0')} : ${s.toString().padStart(2, '0')}`
  }

  const currentQ = questions[currentIndex]

  const options = [
    { key: 'A', value: currentQ.optionA },
    { key: 'B', value: currentQ.optionB },
    { key: 'C', value: currentQ.optionC },
    { key: 'D', value: currentQ.optionD },
    ...(currentQ.optionE ? [{ key: 'E', value: currentQ.optionE }] : [])
  ].filter(opt => opt.value !== 'undefined' && opt.value !== '' && opt.value !== null)

  const handleSelectOption = (key: string) => {
    setAnswers(prev => ({ ...prev, [currentIndex]: key }))
    const currentStatus = statuses[currentIndex]
    if (currentStatus === 'marked' || currentStatus === 'answered_marked') {
      setStatuses(prev => ({ ...prev, [currentIndex]: 'answered_marked' }))
    } else {
      setStatuses(prev => ({ ...prev, [currentIndex]: 'answered' }))
    }
  }

  const handleClear = () => {
    const newAnswers = { ...answers }
    delete newAnswers[currentIndex]
    setAnswers(newAnswers)
    const currentStatus = statuses[currentIndex]
    if (currentStatus === 'answered_marked') {
      setStatuses(prev => ({ ...prev, [currentIndex]: 'marked' }))
    } else {
      setStatuses(prev => ({ ...prev, [currentIndex]: 'not_answered' }))
    }
  }

  const handleMarkReview = () => {
    const hasAnswer = !!answers[currentIndex]
    setStatuses(prev => ({
      ...prev,
      [currentIndex]: hasAnswer ? 'answered_marked' : 'marked'
    }))
  }

  const navigateTo = (index: number) => {
    if (statuses[currentIndex] === undefined || statuses[currentIndex] === 'not_visited') {
      setStatuses(prev => ({ ...prev, [currentIndex]: 'not_answered' }))
    }
    setCurrentIndex(index)
    if (!statuses[index]) {
      setStatuses(prev => ({ ...prev, [index]: 'not_answered' }))
    }
  }

  const getStatusColor = (status: QuestionStatus | undefined) => {
    if (!status || status === 'not_visited') return 'bg-gray-200 text-gray-600'
    if (status === 'not_answered') return 'bg-red-500 text-white'
    if (status === 'answered') return 'bg-green-500 text-white'
    if (status === 'marked') return 'bg-purple-600 text-white'
    if (status === 'answered_marked') return 'bg-purple-600 text-white ring-2 ring-green-400 ring-offset-1'
    return 'bg-gray-200 text-gray-600'
  }

  const getStatusCounts = () => {
    let answered = 0, notAnswered = 0, marked = 0
    for (let i = 0; i < questions.length; i++) {
      const s = statuses[i] || 'not_visited'
      if (s === 'answered' || s === 'answered_marked') answered++
      if (s === 'not_visited' || s === 'not_answered') notAnswered++
      if (s === 'marked' || s === 'answered_marked') marked++
    }
    return { answered, notAnswered, marked }
  }

  const handleSubmitTest = async () => {
    setIsSubmitting(true)
    const mistakesToLog: number[] = []
    let correctCount = 0

    questions.forEach((q, idx) => {
      const userAns = answers[idx]
      if (userAns && userAns === q.correctAnswer.toUpperCase()) {
        correctCount++
      } else {
        mistakesToLog.push(q.id)
      }
    })

    for (const qId of mistakesToLog) {
      try {
        await fetch('/api/mistakes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId: qId })
        })
      } catch (e) {
        console.error('Failed to log mistake', e)
      }
    }

    localStorage.setItem(`mock_result_${quizId}`, JSON.stringify({
      answers,
      score: correctCount,
      total: questions.length,
      timeTaken: (questions.length * 60) - timeLeft
    }))

    router.push(`/quiz/${quizId}/analysis`)
  }

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900 overflow-hidden">

      {/* Header Bar */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="text-gray-500 hover:text-gray-900">
            <X className="w-5 h-5" />
          </button>
          <span className="font-semibold text-[15px] text-gray-800">{quizName}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-mono tracking-wider font-bold text-gray-800">
              {formatTime(timeLeft)}
            </span>
            <button className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
              <Pause className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-200">
            <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px] font-bold">
              {userName ? userName.charAt(0).toUpperCase() : 'S'}
            </div>
            <span className="text-xs font-semibold text-green-700">{userName || 'Student'}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left: Question Area */}
        <div className="flex-1 flex flex-col border-r border-gray-200">
          {/* Topic tag */}
          <div className="h-10 border-b border-gray-200 flex items-center px-6">
            <span className="text-[10px] font-bold px-2 py-0.5 border border-gray-300 rounded text-gray-500 uppercase tracking-wider">
              {quizName}
            </span>
          </div>

          {/* Question */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            <div className="flex justify-between items-start">
              <h2 className="text-sm font-bold text-gray-500">Q. {currentIndex + 1} of {questions.length}</h2>
              <button className="text-yellow-400 hover:text-yellow-500">
                <Flag className="w-4 h-4" />
              </button>
            </div>

            <p className="text-lg leading-relaxed font-medium text-gray-800">
              {currentQ.questionText}
            </p>

            <div className="space-y-3 pt-2">
              {options.map(opt => (
                <label
                  key={opt.key}
                  className={`
                    flex items-center gap-4 px-4 py-3 rounded-lg cursor-pointer border transition-all
                    ${answers[currentIndex] === opt.key
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                  `}
                >
                  <div className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0
                    ${answers[currentIndex] === opt.key ? 'border-blue-500 text-blue-600' : 'border-gray-300 text-gray-400'}
                  `}>
                    {opt.key.toLowerCase()}
                  </div>
                  <input
                    type="radio"
                    name={`q-${currentIndex}`}
                    className="hidden"
                    checked={answers[currentIndex] === opt.key}
                    onChange={() => handleSelectOption(opt.key)}
                  />
                  <span className="text-[15px] text-gray-700">{opt.value}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="h-14 bg-white border-t border-gray-200 px-6 flex items-center justify-between shrink-0">
            <div className="flex gap-4">
              <button
                onClick={handleMarkReview}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 uppercase"
              >
                <Flag className="w-3.5 h-3.5" /> Mark for Review
              </button>
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 uppercase"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            </div>

            <div className="flex gap-3 items-center">
              <div className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                <button
                  onClick={() => navigateTo(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                  className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {currentIndex + 1} of {questions.length}
                <button
                  onClick={() => navigateTo(Math.min(questions.length - 1, currentIndex + 1))}
                  disabled={currentIndex === questions.length - 1}
                  className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => navigateTo(Math.min(questions.length - 1, currentIndex + 1))}
                className="bg-[#007bff] hover:bg-[#0069d9] text-white px-5 py-2 rounded text-xs font-bold"
              >
                NEXT →
              </button>
              <button
                onClick={() => setShowSubmitModal(true)}
                className="bg-[#28a745] hover:bg-[#218838] text-white px-5 py-2 rounded text-xs font-bold"
              >
                SUBMIT
              </button>
            </div>
          </div>
        </div>

        {/* Right: Question Palette */}
        <div className="w-72 bg-white flex flex-col shrink-0">
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-5 gap-2.5">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => navigateTo(i)}
                  className={`
                    w-9 h-9 rounded-full font-bold text-[11px] flex items-center justify-center transition-transform hover:scale-110 relative
                    ${getStatusColor(statuses[i])}
                    ${i === currentIndex ? 'ring-2 ring-gray-900 ring-offset-1' : ''}
                  `}
                >
                  {i + 1}
                  {statuses[i] === 'answered_marked' && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-white"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 shrink-0 space-y-3">
            <div className="grid grid-cols-2 gap-y-2 gap-x-2 text-[9px] uppercase font-bold text-gray-500">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div> Answered</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Not Answered</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-purple-600"></div> Marked for Review</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-gray-200"></div> Not Visited</div>
              <div className="flex items-center gap-1.5 col-span-2">
                <div className="relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-600"></div>
                  <div className="absolute -bottom-[1px] -right-[1px] w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                </div>
                Answered & Marked for Review
              </div>
            </div>
            <div className="flex gap-2 text-[10px] font-bold text-gray-400 uppercase">
              <button className="hover:text-gray-600">All Question</button>
              <button className="hover:text-gray-600">Instruction</button>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden relative">
            <button
              onClick={() => setShowSubmitModal(false)}
              disabled={isSubmitting}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-2">Submit Quiz</h2>
              <p className="text-gray-400 text-sm mb-6">When you are ready, click Submit button</p>

              {(() => {
                const { answered, notAnswered, marked } = getStatusCounts()
                return (
                  <div className="bg-gray-50 rounded-lg p-5 space-y-3 text-left border border-gray-100 mb-6">
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Total Questions</span>
                      <span>{questions.length}</span>
                    </div>
                    <div className="h-px bg-gray-200" />
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div> Answered</div>
                      <span className="font-semibold">{answered}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Skipped/Unattempted</div>
                      <span className="font-semibold">{notAnswered}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-purple-600"></div> Mark for review</div>
                      <span className="font-semibold">{marked}</span>
                    </div>
                  </div>
                )
              })()}

              <button
                onClick={handleSubmitTest}
                disabled={isSubmitting}
                className="w-full bg-[#5cb85c] hover:bg-[#4cae4c] text-white py-3 rounded font-bold text-sm disabled:opacity-50"
              >
                {isSubmitting ? 'SUBMITTING...' : 'SUBMIT'}
              </button>
              <button
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
                className="w-full text-gray-400 hover:text-gray-600 font-semibold text-sm py-2 mt-2"
              >
                ← BACK TO TEST
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
