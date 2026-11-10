'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ArrowRight, CheckCircle2, XCircle, HelpCircle, ChevronLeft, Bookmark, Sparkles, Volume2, Check, ExternalLink } from 'lucide-react'
import { ReportQuestionButton } from '@/components/ReportQuestionButton'
import { FormattedExplanation } from '@/components/FormattedExplanation'
import { SimplifyExplanationButton } from '@/components/SimplifyExplanationButton'
import { AdminReEnrichButton } from '@/components/admin/AdminReEnrichButton'
import { ConceptDossierModal } from '@/components/concepts/ConceptDossierModal'
import { BookOpen } from 'lucide-react'
import { sanitizeQuestionText } from '@/lib/sanitizeQuestion'
import { VoiceTutorBar } from '@/components/voice/VoiceTutorBar'
import { useVoiceTutor } from '@/lib/useVoiceTutor'

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
  simpleExplanation?: string | null
  correctAnswer: string
  voiceQuestion?: string | null
  voiceOptions?: string | null
  voiceExplanation?: string | null
  concepts?: { id: number; term: string; slug: string; category: string }[]
}


export default function QuizPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [activeConceptSlug, setActiveConceptSlug] = useState<string | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isFinished, setIsFinished] = useState(false)
  const [bookmarks, setBookmarks] = useState<Record<number, string>>({})
  const [bookmarkDropdownOpen, setBookmarkDropdownOpen] = useState<number | null>(null)
  const [geminiToast, setGeminiToast] = useState(false)
  const router = useRouter()
  const params = useParams()

  const currentQ = questions[currentIndex] as Question | undefined

  const options = currentQ ? [
    { key: 'A', value: currentQ.optionA, explanation: currentQ.explanationA },
    { key: 'B', value: currentQ.optionB, explanation: currentQ.explanationB },
    { key: 'C', value: currentQ.optionC, explanation: currentQ.explanationC },
    { key: 'D', value: currentQ.optionD, explanation: currentQ.explanationD },
    ...(currentQ.optionE ? [{ key: 'E', value: currentQ.optionE, explanation: currentQ.explanationE }] : [])
  ].filter(opt => opt.value !== 'undefined' && opt.value !== '' && opt.value !== null) : []

  // Dynamic Document Title to steer Chrome's Native Gemini Side Panel (Alt + G)
  useEffect(() => {
    if (currentQ) {
      document.title = `Question ${currentIndex + 1}: ${currentQ.topic || 'Agriculture Engineering'} - LiveShala ARD`
    }
    return () => {
      document.title = 'LiveShala ARD Practice'
    }
  }, [currentIndex, currentQ])

  const handleOpenGeminiInChrome = () => {
    if (!currentQ) return

    const correctOptionLetter = currentQ.correctAnswer.toUpperCase()
    const correctOptionVal = options.find(o => o.key === correctOptionLetter)?.value || ''
    const otherOptionVals = options.filter(o => o.key !== correctOptionLetter).map(o => `${o.key}: ${sanitizeQuestionText(o.value)}`).join(', ')

    const prompt = `Please provide a deep conceptual explanation with diagrams/schematics and practical field demonstration video suggestions for this question:

📌 Topic: ${currentQ.topic || 'Agriculture Engineering'}
❓ Question: ${sanitizeQuestionText(currentQ.questionText)}

Options:
${options.map(o => `${o.key}) ${sanitizeQuestionText(o.value)}`).join('\n')}

✅ Correct Answer: Option ${correctOptionLetter} (${correctOptionVal})

Please break down:
1. Core Concept & Mechanism: Explain in detail how ${correctOptionVal} works, its engineering/agronomic principles, and why it is the correct answer.
2. Conceptual Comparison & Option Differentiation: Define and contrast the other options (${otherOptionVals}) so their individual definitions and roles are completely clear.
3. Visuals & Field Practice: Describe what this looks like in practice (schematics/diagrams) and suggest exact search terms or topics for field machinery demonstration videos.`

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(prompt).catch(err => {
        console.error('Failed to write prompt to clipboard:', err)
      })
    }
    setGeminiToast(true)
    setTimeout(() => setGeminiToast(false), 7000)
  }

  // Keyboard shortcut listener: Auto-copy prompt to clipboard when student presses Alt + G
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'g' || e.key === 'G')) {
        handleOpenGeminiInChrome()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentQ, currentIndex, options])

  const isQuiz12 = params.quizId === '12'
  const voiceTutor = useVoiceTutor({ isQuiz12 })

  // Stop audio and abort pending TTS when moving between questions or finishing
  useEffect(() => {
    voiceTutor.stopAudio()
    if (currentQ && voiceTutor.isEnabled && !isFinished) {
      // Instantaneously pre-buffer current question audio in background while student reads
      voiceTutor.preloadExplanation(currentQ)

      // Opportunistically pre-buffer next question in background
      if (questions[currentIndex + 1]) {
        const timer = setTimeout(() => {
          voiceTutor.preloadExplanation(questions[currentIndex + 1])
        }, 1200)
        return () => clearTimeout(timer)
      }
    }
  }, [currentIndex, isFinished, currentQ?.id, voiceTutor.isEnabled])

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

  useEffect(() => {
    const quizId = params.quizId
    
    if (!quizId) return;

    fetch(`/api/questions?quizId=${quizId}`)
      .then(res => res.json())
      .then(data => {
        if (data.questions) {
          const shuffled = [...data.questions]
          // Simple shuffle
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          setQuestions(shuffled)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.quizId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">No questions available!</h2>
        <p className="text-gray-600 mb-8">Please wait for the admin to upload the quiz.</p>
        <button onClick={() => router.push('/')} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Go Home</button>
      </div>
    )
  }

  if (isFinished) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="h-14 bg-white border-b border-gray-200 flex items-center px-6 shrink-0">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium">
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center">
            <div className="w-20 h-20 mx-auto bg-green-50 border border-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-2">Practice Complete!</h2>
            <p className="text-gray-500 font-medium mb-8">
              You scored {score} out of {questions.length}.
            </p>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!currentQ) return null

  const handleSelect = async (key: string) => {
    if (isAnswered) return
    setSelectedOption(key)
    setIsAnswered(true)

    // Trigger Voice Tutor explanation immediately
    if (voiceTutor.isEnabled) {
      voiceTutor.speakExplanation(currentQ, key)
    }

    if (key === currentQ.correctAnswer.toUpperCase()) {
      setScore(s => s + 1)
    } else {
      // Log mistake
      try {
        await fetch('/api/mistakes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId: currentQ.id })
        })
      } catch (e) {
        console.error('Failed to save mistake', e)
      }
    }
  }

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

  const handleNext = async () => {
    voiceTutor.stopAudio()
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(curr => curr + 1)
      setSelectedOption(null)
      setIsAnswered(false)
      setExpanded({})
      window.scrollTo(0, 0)
    } else {
      // Save final score
      try {
        await fetch('/api/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quizId: parseInt(params.quizId as string, 10),
            score: score + (selectedOption === currentQ.correctAnswer.toUpperCase() ? 1 : 0),
            total: questions.length
          })
        })
      } catch (e) {
        console.error('Failed to save attempt', e)
      }
      setIsFinished(true)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 pb-24">
      {/* Top Header */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10 shrink-0 shadow-sm">
        <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
          <ChevronLeft className="w-4 h-4" /> Exit Practice
        </Link>
        <div className="text-sm font-bold text-gray-800">Score: <span className="text-blue-600">{score}</span></div>
      </div>

      <div className="max-w-6xl w-full mx-auto p-4 md:p-6 lg:p-8 flex-1">
        
        {/* Voice Tutor Header Bar */}
        <VoiceTutorBar
          isEnabled={voiceTutor.isEnabled}
          onToggleEnabled={voiceTutor.setIsEnabled}
          status={voiceTutor.status}
          voice={voiceTutor.voice}
          onChangeVoice={voiceTutor.setVoice}
          speed={voiceTutor.speed}
          onChangeSpeed={voiceTutor.changeSpeed}
          onActivate={() => voiceTutor.activateAudio(currentQ)}
          onReplay={voiceTutor.replayAudio}
          onStop={voiceTutor.stopAudio}
          spokenHinglishScript={isAnswered ? (currentQ.voiceExplanation || null) : null}
        />

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            <span>Question {currentIndex + 1} of {questions.length}</span>
            <span>{Math.round((currentIndex / questions.length) * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Main Content (Question & Options) */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8 mb-6">
              
              {/* Semantic Prompt block for Chrome's Native Gemini Side Panel */}
              <div className="sr-only" aria-hidden="false">
                <h2>Topic: {currentQ.topic || 'Agriculture Engineering'} - LiveShala ARD Practice</h2>
                <h3>Question {currentIndex + 1}: {sanitizeQuestionText(currentQ.questionText)}</h3>
                <h2>Key Conceptual Comparison: {options.map(o => sanitizeQuestionText(o.value)).join(' vs ')}</h2>
                <p>
                  Ask Gemini to explain working principles, seed placement or soil manipulation mechanisms, biological or engineering concepts, sowing depth uniformity, and visual diagrams.
                </p>
                <p>
                  Compare and differentiate definitions of all options: {options.map(o => `Option ${o.key}: ${sanitizeQuestionText(o.value)}`).join(' | ')}.
                </p>
                <p>
                  Correct answer is Option {currentQ.correctAnswer.toUpperCase()} ({options.find(o => o.key === currentQ.correctAnswer.toUpperCase())?.value || ''}). Provide visual schematics and practical field demonstration video search terms.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 mb-4">
                {currentQ.topic ? (
                  <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded">
                    {currentQ.topic}
                  </span>
                ) : <span />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenGeminiInChrome}
                    title="Copy prompt for Chrome Gemini Side Panel (Alt + G)"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 border-indigo-200 text-indigo-700 hover:from-blue-100 hover:to-indigo-100 hover:border-indigo-300 cursor-pointer group"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
                    <span>Ask Gemini</span>
                    <span className="text-[10px] bg-white text-indigo-800 px-1.5 py-0.5 rounded font-mono border border-indigo-200/80 shadow-2xs">Alt+G</span>
                  </button>
                  <ReportQuestionButton key={currentQ.id} questionId={currentQ.id} />
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => handleBookmarkClick(currentQ.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm ${
                      bookmarks[currentQ.id] === 'MOST_IMPORTANT'
                        ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                        : bookmarks[currentQ.id] === 'IMPORTANT'
                        ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Bookmark
                      className={`w-4 h-4 transition-transform ${
                        bookmarks[currentQ.id] === 'MOST_IMPORTANT' ? 'fill-red-500 text-red-500' 
                        : bookmarks[currentQ.id] === 'IMPORTANT' ? 'fill-amber-500 text-amber-500' 
                        : 'text-gray-400'
                      }`}
                    />
                    <span>
                      {bookmarks[currentQ.id] === 'MOST_IMPORTANT' ? 'Highly Probable 🔥' 
                      : bookmarks[currentQ.id] === 'IMPORTANT' ? 'Marked' 
                      : 'Mark to Revise'}
                    </span>
                  </button>
                  
                  {bookmarkDropdownOpen === currentQ.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setBookmarkDropdownOpen(null)} 
                      />
                      <div className="absolute top-full right-0 mt-1.5 w-56 bg-white border border-gray-100 shadow-xl rounded-xl z-20 py-1.5 overflow-hidden ring-1 ring-black/5">
                      {!bookmarks[currentQ.id] && (
                        <>
                          <button 
                            onClick={() => handleBookmarkAction(currentQ.id, 'IMPORTANT')}
                            className="w-full text-left px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2.5 transition-colors"
                          >
                            ⭐ Save as Important
                          </button>
                          <button 
                            onClick={() => handleBookmarkAction(currentQ.id, 'MOST_IMPORTANT')}
                            className="w-full text-left px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-red-700 flex items-center gap-2.5 transition-colors"
                          >
                            🔥 Save as Highly Probable
                          </button>
                        </>
                      )}
                      
                      {bookmarks[currentQ.id] === 'IMPORTANT' && (
                        <button 
                          onClick={() => handleBookmarkAction(currentQ.id, 'MOST_IMPORTANT')}
                          className="w-full text-left px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-red-700 flex items-center gap-2.5 transition-colors"
                        >
                          🔥 Upgrade to Highly Probable
                        </button>
                      )}
                      
                      {bookmarks[currentQ.id] === 'MOST_IMPORTANT' && (
                        <button 
                          onClick={() => handleBookmarkAction(currentQ.id, 'IMPORTANT')}
                          className="w-full text-left px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2.5 transition-colors"
                        >
                          ⭐ Downgrade to Important
                        </button>
                      )}

                      {bookmarks[currentQ.id] && (
                        <div className="px-3 py-1">
                          <div className="h-px bg-gray-100 mb-1"></div>
                          <button 
                            onClick={() => handleBookmarkAction(currentQ.id, 'REMOVE')}
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
              
              <h3 className="text-lg md:text-xl font-bold text-gray-900 leading-relaxed mb-6">
                {sanitizeQuestionText(currentQ.questionText)}
              </h3>

              <div className="space-y-3">
                {options.map((opt) => {
                  let btnClass = "w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-center group relative overflow-hidden "
                  
                  if (!isAnswered) {
                    btnClass += "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer"
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
                          ${!isAnswered ? 'bg-gray-100 text-gray-500 group-hover:bg-white group-hover:text-blue-600 shadow-sm' : 
                            (opt.key === currentQ.correctAnswer.toUpperCase() ? 'bg-green-500 text-white shadow-sm' : 
                            (opt.key === selectedOption ? 'bg-red-500 text-white shadow-sm' : 'bg-gray-200 text-gray-400'))}
                        `}>
                          {opt.key}
                        </div>
                        <span className={`font-medium text-[15px] leading-snug flex-1 ${!isAnswered ? 'text-gray-700 group-hover:text-gray-900' : ''}`}>{sanitizeQuestionText(opt.value)}</span>
                        
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

          {/* Right Sidebar (Explanations) */}
          <div className="w-full lg:w-[400px] shrink-0">
            {isAnswered ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-24 animate-in slide-in-from-right-4 fade-in duration-300">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-2 h-6 rounded-full ${selectedOption === currentQ.correctAnswer.toUpperCase() ? 'bg-green-500' : 'bg-red-500'}`} />
                  <h3 className="text-lg font-black text-gray-900">
                    {selectedOption === currentQ.correctAnswer.toUpperCase() ? 'Correct!' : 'Incorrect'}
                  </h3>
                </div>
                
                <div className="text-sm text-gray-600 leading-relaxed mb-6">
                  {selectedOption === currentQ.correctAnswer.toUpperCase() 
                    ? "Great job! You got the right answer." 
                    : `The correct answer was Option ${currentQ.correctAnswer.toUpperCase()}.`}
                </div>

                {currentQ.explanation && (
                  <div className="bg-slate-50/70 rounded-2xl p-4.5 border border-slate-200">
                    <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-200/80">
                      <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-blue-600" /> Rationale
                      </h4>
                      <AdminReEnrichButton
                        questionId={currentQ.id}
                        onEnriched={(newExp, newConcepts) => {
                          setQuestions(prev => prev.map(q => q.id === currentQ.id ? { 
                            ...q, 
                            explanation: newExp,
                            ...(newConcepts ? { concepts: newConcepts } : {})
                          } : q))
                        }}
                      />
                    </div>
                    <FormattedExplanation
                      text={currentQ.explanation}
                      className="text-[13px] text-slate-800 leading-relaxed"
                    />
                    <SimplifyExplanationButton
                      key={currentQ.id}
                      questionId={currentQ.id}
                      initialSimpleExplanation={currentQ.simpleExplanation}
                    />

                    {/* Ask Gemini in Chrome Helper */}
                    <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2">
                      <button
                        onClick={handleOpenGeminiInChrome}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 hover:from-blue-800 hover:to-indigo-800 text-white rounded-xl font-bold text-xs shadow-sm hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse group-hover:scale-110 transition-transform" />
                          <span>Ask Gemini in Chrome Side Panel</span>
                        </div>
                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md text-blue-100 font-mono tracking-wider">
                          Alt + G
                        </span>
                      </button>

                      {geminiToast && (
                        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-950 rounded-xl text-xs space-y-1.5 animate-in fade-in duration-200">
                          <div className="flex items-center gap-1.5 font-bold text-amber-900">
                            <Check className="w-3.5 h-3.5 text-green-600" />
                            <span>Prompt copied to clipboard!</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-amber-800">
                            Press <kbd className="px-1.5 py-0.5 bg-white border border-amber-300 rounded text-amber-900 font-mono font-bold">Alt + G</kbd> on Windows (or click Chrome Menu <strong>⋮ &gt; Open Gemini in Chrome</strong>) to chat side-by-side with zero cost!
                          </p>
                          <div className="pt-1">
                            <a
                              href="https://gemini.google.com/app"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-indigo-700 hover:underline inline-flex items-center gap-1"
                            >
                              <span>Or open Gemini Web App</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      )}

                      {voiceTutor.isEnabled && (
                        <button
                          onClick={() => voiceTutor.speakExplanation(currentQ, selectedOption)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>🎧 Listen to Spoken Solution (Hinglish)</span>
                        </button>
                      )}
                    </div>

                    {/* Linked High-Yield Concepts */}
                    {currentQ.concepts && currentQ.concepts.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200/80">
                        <div className="text-[11px] font-black text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Tested Concepts in this Question:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {currentQ.concepts.map(c => (
                            <button
                              key={c.id}
                              onClick={() => setActiveConceptSlug(c.slug)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              title="View High-Yield Capsule"
                            >
                              <span>{c.term}</span>
                              <span className="text-[10px] opacity-75">📖</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                
                {/* Specific option explanations could go here if they exist */}
                {options.map(opt => {
                  if (opt.explanation && (opt.key === selectedOption || opt.key === currentQ.correctAnswer.toUpperCase())) {
                     return (
                       <div key={opt.key} className="mt-4 pt-4 border-t border-gray-100">
                         <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Option {opt.key} Notes</h4>
                         <p className="text-[13px] text-gray-600 leading-relaxed">{opt.explanation}</p>
                       </div>
                     )
                  }
                  return null;
                })}
              </div>
            ) : (
              <div className="hidden lg:flex bg-gray-100/50 border border-gray-200/50 border-dashed rounded-2xl p-8 h-full min-h-[300px] items-center justify-center text-center">
                <div>
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <HelpCircle className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">Select an answer to see<br/>detailed explanations</p>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>

      {/* Fixed Bottom Bar for Next Question */}
      {isAnswered && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20 animate-in slide-in-from-bottom-full duration-300">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="hidden sm:block">
              <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                {selectedOption === currentQ.correctAnswer.toUpperCase() ? '✅ Well done' : '❌ Review the explanation'}
              </span>
            </div>
            <button
              onClick={handleNext}
              className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-8 bg-gray-900 hover:bg-black text-white text-[15px] font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md"
            >
              {currentIndex === questions.length - 1 ? 'Finish Practice' : 'Next Question'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Contextual Concept Capsule Modal */}
      <ConceptDossierModal
        slug={activeConceptSlug}
        onClose={() => setActiveConceptSlug(null)}
        onSelectRelatedTerm={termSlug => setActiveConceptSlug(termSlug)}
      />

      {/* Floating Toast Notification for Gemini Auto-Copy (Alt + G) */}
      {geminiToast && (
        <div className="fixed bottom-24 right-6 z-50 max-w-sm bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-white">Copied Gemini Deep-Dive Prompt!</p>
              <p className="text-[11px] text-slate-300 leading-snug">
                Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-yellow-300 font-mono text-[10px] font-bold">Alt + G</kbd> to open Chrome's Gemini side panel, then press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-yellow-300 font-mono text-[10px] font-bold">Ctrl + V</kbd>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
