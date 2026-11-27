'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Flag,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  HelpCircle,
  Trophy,
  Flame,
  Calendar,
  ArrowRight,
  RotateCcw,
  History,
  BarChart3,
  Target,
  Award,
} from 'lucide-react'
import { sanitizeQuestionText } from '@/lib/sanitizeQuestion'
import { FormattedExplanation } from '@/components/FormattedExplanation'
import { VoiceTutorBar } from '@/components/voice/VoiceTutorBar'
import { useVoiceTutor } from '@/lib/useVoiceTutor'
import { ConceptDossierModal } from '@/components/concepts/ConceptDossierModal'

type ConceptTag = {
  id: number
  term: string
  slug: string
  category: string
}

type DailyQuestionItem = {
  dailyQuestionId: number
  orderIndex: number
  questionId: number | null
  chapterId: number | null
  chapterName: string
  sourceBucket: 'RECENT_WRONG' | 'RECENT_FRESH' | 'OLDER_WRONG' | 'OLDER_FRESH' | 'AI_REFRAMED'
  selectedOption: string | null
  isCorrect: boolean | null
  isFlagged: boolean
  answeredAt: string | null
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  optionE: string | null
  explanationA: string | null
  explanationB: string | null
  explanationC: string | null
  explanationD: string | null
  explanationE: string | null
  correctAnswer: string
  explanation: string | null
  simpleExplanation: string | null
  topic: string | null
  difficulty: string | null
  voiceQuestion: string | null
  voiceOptions: string | null
  voiceExplanation: string | null
  concepts: ConceptTag[]
  isReframed: boolean
}

type DailyQuizData = {
  id: string
  periodKey: string
  status: 'generating' | 'pending' | 'in_progress' | 'completed'
  focusChapters: string[]
  totalQuestions: number
  currentIndex: number
  score: number | null
  completedAt: string | null
  questions: DailyQuestionItem[]
}

type EligibilityInfo = {
  unlocked: boolean
  completedSourceQuizzes: number
  unlockThreshold: number
  loggedAnswers: number
  mistakeCount: number
}

type StreakStats = {
  currentStreak: number
  longestStreak: number
  totalCompleted: number
  totalAttempted: number
  averageAccuracy: number
  bestScore: number | null
  todayCompleted: boolean
}

type DailyHistoryEntry = {
  id: string
  periodKey: string
  status: string
  score: number | null
  totalQuestions: number
  answeredCount: number
  focusChapters: string[]
  completedAt: string | null
  createdAt: string
}

type CalendarDay = {
  periodKey: string
  status: 'completed' | 'in_progress' | 'none'
  score: number | null
  totalQuestions: number
  isToday: boolean
}

function formatFriendlyDate(periodKey: string, todayKey: string): string {
  if (periodKey === todayKey) return 'Today'
  const [y, m, d] = periodKey.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.toLocaleDateString('en-IN', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getBucketBadge(bucket: DailyQuestionItem['sourceBucket']) {
  switch (bucket) {
    case 'RECENT_WRONG':
    case 'OLDER_WRONG':
      return { label: 'Past Mistake Review', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
    case 'AI_REFRAMED':
      return { label: 'AI Reframed Concept', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
    case 'OLDER_FRESH':
      return { label: 'Spaced Retention', cls: 'bg-amber-50 text-amber-800 border-amber-200' }
    default:
      return { label: 'Recent Chapter Focus', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  }
}

export default function DailyQuizPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unlocked, setUnlocked] = useState<boolean>(true)
  const [eligibility, setEligibility] = useState<EligibilityInfo | null>(null)
  const [periodKey, setPeriodKey] = useState<string>('')
  const [quiz, setQuiz] = useState<DailyQuizData | null>(null)
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [savingAnswer, setSavingAnswer] = useState<boolean>(false)
  const [activeConceptSlug, setActiveConceptSlug] = useState<string | null>(null)
  const [reviewFilter, setReviewFilter] = useState<'ALL' | 'INCORRECT' | 'FLAGGED'>('ALL')
  const [activeTab, setActiveTab] = useState<'TODAY' | 'HISTORY'>('TODAY')
  const [streakStats, setStreakStats] = useState<StreakStats | null>(null)
  const [historyList, setHistoryList] = useState<DailyHistoryEntry[]>([])
  const [activityCalendar, setActivityCalendar] = useState<CalendarDay[]>([])
  const [pastQuiz, setPastQuiz] = useState<DailyQuizData | null>(null)
  const [loadingPast, setLoadingPast] = useState<boolean>(false)

  const voiceTutor = useVoiceTutor({ isQuiz12: false })

  const loadQuiz = async () => {
    try {
      setError(null)
      const res = await fetch('/ard/api/daily-quiz', { cache: 'no-store' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to load Daily Retention Quiz.')
        setLoading(false)
        return
      }

      setPeriodKey(data.periodKey || '')
      setEligibility(data.eligibility || null)
      setUnlocked(Boolean(data.unlocked))
      if (data.streakStats) setStreakStats(data.streakStats)
      if (Array.isArray(data.history)) setHistoryList(data.history)
      if (Array.isArray(data.activityCalendar)) setActivityCalendar(data.activityCalendar)

      if (data.generating) {
        setTimeout(() => loadQuiz(), 1500)
        return
      }

      if (data.quiz) {
        setQuiz(data.quiz)
        const resumeIdx =
          typeof data.quiz.currentIndex === 'number' &&
          data.quiz.currentIndex >= 0 &&
          data.quiz.currentIndex < data.quiz.questions.length
            ? data.quiz.currentIndex
            : 0
        setCurrentIndex(resumeIdx)
      }
      setLoading(false)
    } catch {
      setError('Network error while loading your daily quiz.')
      setLoading(false)
    }
  }

  const handleOpenPastQuiz = async (targetPeriodKey: string) => {
    if (targetPeriodKey === periodKey && quiz) {
      setPastQuiz(null)
      setActiveTab('TODAY')
      return
    }
    setLoadingPast(true)
    setReviewFilter('ALL')
    try {
      const res = await fetch(`/ard/api/daily-quiz?periodKey=${encodeURIComponent(targetPeriodKey)}`, {
        cache: 'no-store',
      })
      const data = await res.json()
      if (res.ok && data.quiz) {
        setPastQuiz(data.quiz)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (e) {
      console.error('Failed to load past quiz', e)
    } finally {
      setLoadingPast(false)
    }
  }

  useEffect(() => {
    loadQuiz()
    return () => {
      voiceTutor.stopAudio()
    }
  }, [])

  const currentQ = quiz?.questions?.[currentIndex]

  useEffect(() => {
    voiceTutor.stopAudio()
    if (
      currentQ &&
      quiz?.status !== 'completed' &&
      voiceTutor.isEnabled &&
      currentQ.questionId &&
      currentQ.voiceExplanation
    ) {
      voiceTutor.preloadExplanation(currentQ as any)
    }
  }, [currentIndex, quiz?.status, currentQ?.dailyQuestionId, voiceTutor.isEnabled])

  const options = useMemo(() => {
    if (!currentQ) return []
    return [
      { key: 'A', value: currentQ.optionA, explanation: currentQ.explanationA },
      { key: 'B', value: currentQ.optionB, explanation: currentQ.explanationB },
      { key: 'C', value: currentQ.optionC, explanation: currentQ.explanationC },
      { key: 'D', value: currentQ.optionD, explanation: currentQ.explanationD },
      ...(currentQ.optionE
        ? [{ key: 'E', value: currentQ.optionE, explanation: currentQ.explanationE }]
        : []),
    ].filter((opt) => opt.value !== 'undefined' && opt.value !== '' && opt.value !== null)
  }, [currentQ])

  const answeredCount = useMemo(() => {
    if (!quiz) return 0
    return quiz.questions.filter((q) => q.selectedOption !== null).length
  }, [quiz])

  const currentCorrectCount = useMemo(() => {
    if (!quiz) return 0
    return quiz.questions.filter((q) => q.isCorrect === true).length
  }, [quiz])

  const handleSelectOption = async (optKey: string) => {
    if (!quiz || !currentQ || currentQ.selectedOption !== null || savingAnswer) return

    const normalized = optKey.toUpperCase()
    const isCorrect = normalized === currentQ.correctAnswer.toUpperCase()

    // Optimistic UI update
    setQuiz((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        status: prev.status === 'pending' ? 'in_progress' : prev.status,
        questions: prev.questions.map((q) =>
          q.dailyQuestionId === currentQ.dailyQuestionId
            ? { ...q, selectedOption: normalized, isCorrect, answeredAt: new Date().toISOString() }
            : q
        ),
      }
    })

    if (voiceTutor.isEnabled && currentQ.questionId && currentQ.voiceExplanation) {
      voiceTutor.speakExplanation(currentQ as any, normalized)
    }

    setSavingAnswer(true)
    try {
      await fetch('/ard/api/daily-quiz', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyQuizId: quiz.id,
          dailyQuestionId: currentQ.dailyQuestionId,
          selectedOption: normalized,
          currentIndex,
        }),
      })
    } catch (e) {
      console.error('Failed to auto-save answer', e)
    } finally {
      setSavingAnswer(false)
    }
  }

  const handleToggleFlag = async () => {
    if (!quiz || !currentQ || quiz.status === 'completed') return
    const nextFlag = !currentQ.isFlagged

    setQuiz((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        questions: prev.questions.map((q) =>
          q.dailyQuestionId === currentQ.dailyQuestionId ? { ...q, isFlagged: nextFlag } : q
        ),
      }
    })

    try {
      await fetch('/ard/api/daily-quiz', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyQuizId: quiz.id,
          dailyQuestionId: currentQ.dailyQuestionId,
          isFlagged: nextFlag,
        }),
      })
    } catch (e) {
      console.error('Failed to toggle flag', e)
    }
  }

  const navigateTo = async (idx: number) => {
    if (!quiz || idx < 0 || idx >= quiz.questions.length) return
    voiceTutor.stopAudio()
    setCurrentIndex(idx)
    window.scrollTo({ top: 0, behavior: 'smooth' })

    if (quiz.status !== 'completed') {
      fetch('/ard/api/daily-quiz', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyQuizId: quiz.id,
          currentIndex: idx,
        }),
      }).catch(() => {})
    }
  }

  const handleSubmitQuiz = async () => {
    if (!quiz || submitting) return
    voiceTutor.stopAudio()
    setSubmitting(true)

    try {
      const res = await fetch('/ard/api/daily-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyQuizId: quiz.id }),
      })
      const data = await res.json()
      if (res.ok && data.quiz) {
        setQuiz(data.quiz)
        if (data.streakStats) setStreakStats(data.streakStats)
        if (Array.isArray(data.history)) setHistoryList(data.history)
        if (Array.isArray(data.activityCalendar)) setActivityCalendar(data.activityCalendar)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (e) {
      console.error('Failed to submit daily quiz', e)
    } finally {
      setSubmitting(false)
    }
  }

  // Shared Top Navigation Header
  const renderHeader = () => (
    <header className="h-16 bg-white border-b border-stone-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 px-3 py-1.5 rounded-lg transition-colors shrink-0"
        >
          ← Back to Liveshala
        </a>
        <span className="hidden sm:inline text-stone-300">|</span>
        <div className="hidden sm:flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-sm font-black text-stone-900 truncate">Daily Retention Quiz</span>
          {periodKey && (
            <span className="text-[11px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
              {periodKey}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {streakStats && (
          <button
            type="button"
            onClick={() => {
              setPastQuiz(null)
              setActiveTab(activeTab === 'HISTORY' ? 'TODAY' : 'HISTORY')
            }}
            className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              streakStats.currentStreak > 0
                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
            }`}
            title="View streaks & past daily quiz history"
          >
            <Flame className={`w-3.5 h-3.5 ${streakStats.currentStreak > 0 ? 'fill-amber-500 text-amber-500' : 'text-stone-400'}`} />
            <span>{streakStats.currentStreak}d Streak</span>
          </button>
        )}

        <div className="hidden md:flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200">
          <button
            type="button"
            onClick={() => {
              setPastQuiz(null)
              setActiveTab('TODAY')
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'TODAY' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => {
              setPastQuiz(null)
              setActiveTab('HISTORY')
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'HISTORY' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <History className="w-3 h-3" />
            <span>History ({historyList.length})</span>
          </button>
        </div>

        {activeTab === 'TODAY' && quiz && quiz.status !== 'completed' && (
          <div className="text-xs font-bold text-stone-700 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200">
            <span className="hidden sm:inline">Answered: </span>
            <span className="text-stone-900">{answeredCount}/{quiz.totalQuestions}</span>
          </div>
        )}
        <Link
          href="/"
          className="text-xs font-semibold text-stone-600 hover:text-stone-900 px-2.5 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
        >
          ARD Syllabus
        </Link>
      </div>
    </header>
  )

  // 1. Loading / Generating State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex flex-col font-sans text-stone-900">
        {renderHeader()}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white border border-stone-200 shadow-xs flex items-center justify-center mb-4">
            <Loader2 className="w-7 h-7 animate-spin text-stone-800" />
          </div>
          <h2 className="text-lg font-black text-stone-900 mb-1">
            Preparing Your Daily 20Q Retention Quiz...
          </h2>
          <p className="text-sm text-stone-500 max-w-md">
            Analyzing your recent 7-day chapter activity, unresolved mistakes, and spaced-repetition priorities.
          </p>
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex flex-col font-sans text-stone-900">
        {renderHeader()}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-stone-200 p-8 text-center shadow-xs space-y-4">
            <h2 className="text-xl font-black text-stone-900">Unable to Load Daily Quiz</h2>
            <p className="text-sm text-stone-600">{error}</p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  setLoading(true)
                  loadQuiz()
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry</span>
              </button>
              <a
                href="/"
                className="px-5 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-sm font-bold transition-colors"
              >
                ← Back to Liveshala
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 2. Cold-Start Locked State (unlocked === false)
  if (!unlocked) {
    const completed = eligibility?.completedSourceQuizzes ?? 0
    const threshold = eligibility?.unlockThreshold ?? 1
    const logged = eligibility?.loggedAnswers ?? 0

    return (
      <div className="min-h-screen bg-[#FBF9F5] flex flex-col font-sans text-stone-900">
        {renderHeader()}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white rounded-3xl border border-stone-200 p-8 sm:p-10 shadow-xs text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <BookOpen className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                Personalized Retention Unlocks Soon
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-stone-900">
                Attempt Your First Chapter Quiz
              </h1>
              <p className="text-sm text-stone-600 leading-relaxed">
                Your Daily 20Q Retention Quiz adapts automatically to the chapters you practice and mistakes you make. Complete at least <strong>{threshold} chapter quiz</strong> (or answer <strong>15+ questions</strong>) in ARDShala to unlock it.
              </p>
            </div>

            <div className="bg-[#FBF9F5] rounded-2xl border border-stone-200 p-4 text-left space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                <span>Current Unlock Progress</span>
                <span>{completed} / {threshold} quizzes • {logged} / 15 Qs</span>
              </div>
              <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-stone-900 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.round((logged / 15) * 100))}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold transition-colors shadow-xs"
              >
                <span>Browse ARDShala Chapters</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-sm font-bold transition-colors"
              >
                ← Back to Liveshala
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Reusable Completed / Past-Day Quiz Review Renderer
  const renderQuizReview = (targetQuiz: DailyQuizData, isPastReview: boolean) => {
    const computedScore =
      targetQuiz.status === 'completed'
        ? targetQuiz.score ?? targetQuiz.questions.filter((q) => q.isCorrect === true).length
        : targetQuiz.questions.filter((q) => q.isCorrect === true).length
    const totalQs = targetQuiz.totalQuestions || targetQuiz.questions.length || 20
    const accuracy = totalQs > 0 ? Math.round((computedScore / totalQs) * 100) : 0

    const chapterStats = new Map<string, { total: number; correct: number }>()
    for (const q of targetQuiz.questions) {
      const ch = q.chapterName || 'General'
      const cur = chapterStats.get(ch) || { total: 0, correct: 0 }
      cur.total++
      if (q.isCorrect) cur.correct++
      chapterStats.set(ch, cur)
    }

    const filteredReview = targetQuiz.questions.filter((q) => {
      if (reviewFilter === 'INCORRECT') return q.isCorrect !== true
      if (reviewFilter === 'FLAGGED') return q.isFlagged
      return true
    })

    return (
      <div className="min-h-screen bg-[#FBF9F5] flex flex-col font-sans text-stone-900 pb-16">
        {renderHeader()}

        <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
          {isPastReview && (
            <button
              type="button"
              onClick={() => setPastQuiz(null)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white border border-stone-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to Streaks &amp; History</span>
            </button>
          )}

          {/* Score Hero Card */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>
                      {targetQuiz.status === 'completed' ? 'Daily Retention Complete' : 'Partial / Past Attempt'} • {targetQuiz.periodKey}
                    </span>
                  </div>
                  {!isPastReview && streakStats && streakStats.currentStreak > 0 && (
                    <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                      <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{streakStats.currentStreak}-Day Streak!</span>
                    </div>
                  )}
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-stone-900">
                  {computedScore} / {totalQs} Correct ({accuracy}%)
                </h1>
                <p className="text-sm text-stone-600">
                  {isPastReview
                    ? `Archived review from ${formatFriendlyDate(targetQuiz.periodKey, periodKey)}.`
                    : 'Any missed questions have been queued in The Forge, and redeemed mistakes advanced their retention interval.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
                <a
                  href="/"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold transition-colors shadow-xs"
                >
                  ← Back to Liveshala
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setPastQuiz(null)
                    setActiveTab('HISTORY')
                  }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-sm font-bold transition-colors cursor-pointer"
                >
                  <History className="w-4 h-4" />
                  <span>View History</span>
                </button>
              </div>
            </div>

            {/* Chapter Breakdown Pills */}
            <div className="mt-6 pt-6 border-t border-stone-200">
              <h3 className="text-xs font-black text-stone-500 uppercase tracking-wider mb-3">
                Chapter Performance Breakdown
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from(chapterStats.entries()).map(([chName, stat]) => {
                  const pct = Math.round((stat.correct / stat.total) * 100)
                  return (
                    <div
                      key={chName}
                      className="rounded-xl border border-stone-200 bg-[#FBF9F5] p-3.5 flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-stone-900 truncate">{chName}</div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          {stat.correct} / {stat.total} correct
                        </div>
                      </div>
                      <span
                        className={`text-xs font-black px-2 py-1 rounded-lg ${
                          pct >= 75
                            ? 'bg-emerald-100 text-emerald-800'
                            : pct >= 40
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {pct}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Detailed Question Review */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-black text-stone-900">Question-by-Question Review</h2>
              <div className="flex items-center gap-1.5 bg-white border border-stone-200 p-1 rounded-xl">
                {(
                  [
                    { key: 'ALL', label: `All (${targetQuiz.questions.length})` },
                    {
                      key: 'INCORRECT',
                      label: `Missed (${targetQuiz.questions.filter((q) => q.isCorrect !== true).length})`,
                    },
                    {
                      key: 'FLAGGED',
                      label: `Flagged (${targetQuiz.questions.filter((q) => q.isFlagged).length})`,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setReviewFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      reviewFilter === tab.key
                        ? 'bg-stone-900 text-white'
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredReview.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-sm text-stone-500">
                No questions match this filter.
              </div>
            ) : (
              filteredReview.map((q) => {
                const badge = getBucketBadge(q.sourceBucket)
                const qOpts = [
                  { key: 'A', val: q.optionA },
                  { key: 'B', val: q.optionB },
                  { key: 'C', val: q.optionC },
                  { key: 'D', val: q.optionD },
                  ...(q.optionE ? [{ key: 'E', val: q.optionE }] : []),
                ].filter((o) => o.val && o.val !== 'undefined')

                return (
                  <div
                    key={q.dailyQuestionId}
                    className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-2xs space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-stone-500">
                          Q{q.orderIndex + 1}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                          {q.chapterName}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>

                      {q.isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                          <XCircle className="w-3.5 h-3.5" /> {q.selectedOption ? 'Incorrect' : 'Unanswered'}
                        </span>
                      )}
                    </div>

                    <p className="text-sm sm:text-base font-bold text-stone-900 leading-relaxed">
                      {sanitizeQuestionText(q.questionText)}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {qOpts.map((opt) => {
                        const isAns = opt.key === q.correctAnswer
                        const isPicked = opt.key === q.selectedOption
                        let cls = 'border-stone-200 bg-[#FBF9F5] text-stone-700'
                        if (isAns) cls = 'border-emerald-400 bg-emerald-50 text-emerald-950 font-semibold'
                        else if (isPicked) cls = 'border-rose-300 bg-rose-50 text-rose-900'

                        return (
                          <div
                            key={opt.key}
                            className={`text-xs sm:text-sm px-3 py-2 rounded-xl border flex items-start gap-2 ${cls}`}
                          >
                            <span className="font-black shrink-0">{opt.key}.</span>
                            <span>{sanitizeQuestionText(opt.val)}</span>
                          </div>
                        )
                      })}
                    </div>

                    {q.explanation && (
                      <div className="bg-[#FBF9F5] border border-stone-200 rounded-xl p-4 text-xs sm:text-sm text-stone-700 leading-relaxed">
                        <div className="font-black text-[10px] uppercase tracking-wider text-stone-500 mb-1">
                          Explanation
                        </div>
                        <FormattedExplanation text={q.explanation} />
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    )
  }

  // 2.5 History & Streaks Tab View
  if (activeTab === 'HISTORY') {
    if (pastQuiz) {
      return renderQuizReview(pastQuiz, true)
    }

    return (
      <div className="min-h-screen bg-[#FBF9F5] flex flex-col font-sans text-stone-900 pb-16">
        {renderHeader()}

        <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* Mobile Tab Switcher */}
          <div className="flex md:hidden items-center bg-white p-1 rounded-xl border border-stone-200">
            <button
              type="button"
              onClick={() => setActiveTab('TODAY')}
              className="flex-1 py-2 rounded-lg text-xs font-bold text-stone-600 cursor-pointer"
            >
              Today&apos;s Quiz
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('HISTORY')}
              className="flex-1 py-2 rounded-lg text-xs font-bold bg-stone-900 text-white cursor-pointer"
            >
              History &amp; Streaks
            </button>
          </div>

          {/* 4 Streak & Performance Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-500 mb-1.5">
                <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Current Streak</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-stone-900">
                {streakStats?.currentStreak ?? 0} <span className="text-sm font-bold text-stone-500">days</span>
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                {streakStats?.todayCompleted
                  ? 'Today completed!'
                  : unlocked
                  ? 'Finish today to extend!'
                  : 'Complete 1 quiz to start'}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-500 mb-1.5">
                <Award className="w-4 h-4 text-indigo-600" />
                <span>Longest Streak</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-stone-900">
                {streakStats?.longestStreak ?? 0} <span className="text-sm font-bold text-stone-500">days</span>
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                {streakStats?.totalCompleted ?? 0} quizzes finished
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-500 mb-1.5">
                <Target className="w-4 h-4 text-emerald-600" />
                <span>Avg Accuracy</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-stone-900">
                {streakStats?.averageAccuracy ?? 0}%
              </div>
              <p className="text-[11px] text-stone-500 mt-1">Across completed dailies</p>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-500 mb-1.5">
                <BarChart3 className="w-4 h-4 text-rose-600" />
                <span>Best Score</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-stone-900">
                {streakStats?.bestScore !== null && streakStats?.bestScore !== undefined
                  ? `${streakStats.bestScore}/20`
                  : '—'}
              </div>
              <p className="text-[11px] text-stone-500 mt-1">Personal daily high</p>
            </div>
          </div>

          {/* 14-Day Activity Calendar */}
          {activityCalendar.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-stone-900">Last 14 Days Consistency (IST)</h2>
                <div className="flex items-center gap-3 text-[11px] text-stone-500 font-semibold">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Done
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> Partial
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-stone-200 inline-block" /> Missed
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-7 sm:grid-cols-14 gap-2">
                {activityCalendar.map((day) => {
                  const dayNum = day.periodKey.slice(8, 10)
                  let boxCls = 'bg-stone-100 border-stone-200 text-stone-500'
                  if (day.status === 'completed') {
                    boxCls = 'bg-emerald-500 border-emerald-600 text-white'
                  } else if (day.status === 'in_progress') {
                    boxCls = 'bg-amber-400 border-amber-500 text-amber-950'
                  }

                  return (
                    <div
                      key={day.periodKey}
                      title={`${day.periodKey}${day.score !== null ? `: ${day.score}/${day.totalQuestions}` : ''}`}
                      className={`h-11 rounded-xl border flex flex-col items-center justify-center text-[11px] font-bold ${boxCls} ${
                        day.isToday ? 'ring-2 ring-stone-900 ring-offset-1' : ''
                      }`}
                    >
                      <span>{dayNum}</span>
                      {day.score !== null && (
                        <span className="text-[9px] opacity-90">{day.score}/{day.totalQuestions}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Full Attempt History Timeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-stone-900">
                Daily Quiz Attempt Archive ({historyList.length})
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab('TODAY')}
                className="text-xs font-bold text-stone-700 hover:text-stone-900 bg-white border border-stone-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Go to Today&apos;s Quiz →
              </button>
            </div>

            {loadingPast && (
              <div className="bg-white rounded-2xl border border-stone-200 p-6 flex items-center justify-center gap-2 text-sm text-stone-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading archived quiz review...</span>
              </div>
            )}

            {historyList.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-3">
                <p className="text-sm font-semibold text-stone-600">
                  No daily retention quizzes recorded yet.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('TODAY')}
                  className="px-5 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-bold cursor-pointer"
                >
                  Start Today&apos;s 20Q Quiz
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {historyList.map((entry) => {
                  const isTodayEntry = entry.periodKey === periodKey
                  const isCompleted = entry.status === 'completed'
                  const pct =
                    isCompleted && entry.score !== null && entry.totalQuestions > 0
                      ? Math.round((entry.score / entry.totalQuestions) * 100)
                      : null

                  return (
                    <div
                      key={entry.id}
                      className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black text-stone-900">
                            {formatFriendlyDate(entry.periodKey, periodKey)}
                          </span>
                          <span className="text-[11px] font-semibold text-stone-400">
                            ({entry.periodKey})
                          </span>
                          {isCompleted ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Completed
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                              {entry.answeredCount}/{entry.totalQuestions} answered
                            </span>
                          )}
                        </div>

                        {entry.focusChapters.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {entry.focusChapters.map((ch) => (
                              <span
                                key={ch}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FBF9F5] text-stone-600 border border-stone-200"
                              >
                                {ch}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                        {isCompleted && entry.score !== null ? (
                          <div className="text-right">
                            <div className="text-base font-black text-stone-900">
                              {entry.score} / {entry.totalQuestions}
                            </div>
                            <div className="text-[11px] font-bold text-emerald-700">{pct}% accuracy</div>
                          </div>
                        ) : (
                          <div className="text-right">
                            <div className="text-xs font-bold text-stone-500">
                              {entry.answeredCount} / {entry.totalQuestions} saved
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenPastQuiz(entry.periodKey)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                            isTodayEntry && !isCompleted
                              ? 'bg-stone-900 hover:bg-stone-800 text-white'
                              : 'bg-stone-100 hover:bg-stone-200 text-stone-800'
                          }`}
                        >
                          {isTodayEntry && !isCompleted ? 'Resume →' : 'Review →'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 3. Completed State (Score + Chapter Breakdown + Detailed Review)
  if (quiz && quiz.status === 'completed') {
    return renderQuizReview(quiz, false)
  }

  // 4. Active Quiz Runner (pending / in_progress)
  if (!quiz || !currentQ) return null

  const isAnswered = currentQ.selectedOption !== null
  const bucketBadge = getBucketBadge(currentQ.sourceBucket)

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col font-sans text-stone-900 pb-28">
      {renderHeader()}

      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 space-y-5">
        {/* Focus Chapters & Question Number Strip */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-600">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>Today&apos;s Focus:</span>
              </span>
              {quiz.focusChapters.map((ch) => (
                <span
                  key={ch}
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-800 border border-stone-200"
                >
                  {ch}
                </span>
              ))}
            </div>

            <div className="text-xs font-bold text-stone-600">
              Score: <span className="text-emerald-700">{currentCorrectCount}</span> / {answeredCount} answered
            </div>
          </div>

          {/* 20 Question Number Pills */}
          <div className="flex flex-wrap gap-1.5">
            {quiz.questions.map((q, idx) => {
              const active = idx === currentIndex
              let pillCls = 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
              if (q.selectedOption !== null) {
                pillCls = q.isCorrect
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }
              if (active) {
                pillCls = 'bg-stone-900 text-white border-stone-900 shadow-xs'
              }

              return (
                <button
                  key={q.dailyQuestionId}
                  onClick={() => navigateTo(idx)}
                  className={`relative w-8 h-8 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${pillCls}`}
                >
                  {idx + 1}
                  {q.isFlagged && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border border-white" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Voice Tutor Bar (enabled automatically for bank questions with audio) */}
        {currentQ.questionId && (
          <VoiceTutorBar
            isEnabled={voiceTutor.isEnabled}
            onToggleEnabled={voiceTutor.setIsEnabled}
            status={voiceTutor.status}
            voice={voiceTutor.voice}
            onChangeVoice={voiceTutor.setVoice}
            speed={voiceTutor.speed}
            onChangeSpeed={voiceTutor.changeSpeed}
            onActivate={() => voiceTutor.activateAudio(currentQ as any)}
            onReplay={voiceTutor.replayAudio}
            onStop={voiceTutor.stopAudio}
            spokenHinglishScript={isAnswered ? (currentQ.voiceExplanation || null) : null}
          />
        )}

        {/* Two-Column Quiz Body */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Question & Options */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-2xs">
              {/* Metadata Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-stone-900 text-white">
                    Q{currentIndex + 1} of {quiz.totalQuestions}
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                    {currentQ.chapterName}
                  </span>
                  {currentQ.topic && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-[#FBF9F5] text-stone-600 border border-stone-200">
                      {currentQ.topic}
                    </span>
                  )}
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${bucketBadge.cls}`}>
                    {bucketBadge.label}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleToggleFlag}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                    currentQ.isFlagged
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <Flag className={`w-3.5 h-3.5 ${currentQ.isFlagged ? 'fill-amber-500 text-amber-500' : ''}`} />
                  <span>{currentQ.isFlagged ? 'Flagged' : 'Flag'}</span>
                </button>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-stone-900 leading-relaxed mb-6">
                {sanitizeQuestionText(currentQ.questionText)}
              </h2>

              <div className="space-y-3">
                {options.map((opt) => {
                  let btnCls =
                    'w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-center group '

                  if (!isAnswered) {
                    btnCls += 'border-stone-200 hover:border-stone-400 hover:bg-stone-50 cursor-pointer'
                  } else {
                    if (opt.key === currentQ.correctAnswer) {
                      btnCls += 'border-emerald-500 bg-emerald-50/70 text-emerald-950'
                    } else if (opt.key === currentQ.selectedOption) {
                      btnCls += 'border-rose-400 bg-rose-50/70 text-rose-950'
                    } else {
                      btnCls += 'border-stone-100 bg-stone-50/60 opacity-60'
                    }
                  }

                  return (
                    <button
                      key={opt.key}
                      type="button"
                      disabled={isAnswered || savingAnswer}
                      onClick={() => handleSelectOption(opt.key)}
                      className={btnCls}
                    >
                      <div className="flex items-center gap-3.5 w-full">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                            !isAnswered
                              ? 'bg-stone-100 text-stone-600 group-hover:bg-stone-900 group-hover:text-white'
                              : opt.key === currentQ.correctAnswer
                              ? 'bg-emerald-600 text-white'
                              : opt.key === currentQ.selectedOption
                              ? 'bg-rose-500 text-white'
                              : 'bg-stone-200 text-stone-500'
                          }`}
                        >
                          {opt.key}
                        </div>
                        <span className="font-medium text-[15px] leading-snug flex-1">
                          {sanitizeQuestionText(opt.value)}
                        </span>

                        {isAnswered && opt.key === currentQ.correctAnswer && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        )}
                        {isAnswered &&
                          opt.key === currentQ.selectedOption &&
                          opt.key !== currentQ.correctAnswer && (
                            <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                          )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right: Explanations & Concept Tags */}
          <div className="w-full lg:w-[390px] shrink-0">
            {isAnswered ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs sticky top-24 space-y-5">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-2 h-6 rounded-full ${
                      currentQ.isCorrect ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                  <h3 className="text-lg font-black text-stone-900">
                    {currentQ.isCorrect ? 'Correct!' : 'Incorrect'}
                  </h3>
                </div>

                <p className="text-sm text-stone-600 leading-relaxed">
                  {currentQ.isCorrect
                    ? currentQ.sourceBucket === 'RECENT_WRONG' || currentQ.sourceBucket === 'OLDER_WRONG' || currentQ.sourceBucket === 'AI_REFRAMED'
                      ? 'Great recall! This past mistake has advanced in your Retention Forge schedule.'
                      : 'Spot on! Answer saved.'
                    : `The correct answer is Option ${currentQ.correctAnswer}. Added to your Retention Forge for tomorrow.`}
                </p>

                {currentQ.explanation && (
                  <div className="bg-[#FBF9F5] rounded-xl p-4 border border-stone-200">
                    <h4 className="text-[11px] font-black text-stone-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" /> Rationale
                    </h4>
                    <div className="text-[13px] text-stone-700 leading-relaxed">
                      <FormattedExplanation text={currentQ.explanation} />
                    </div>
                  </div>
                )}

                {options.map((opt) => {
                  if (
                    opt.explanation &&
                    (opt.key === currentQ.selectedOption || opt.key === currentQ.correctAnswer)
                  ) {
                    return (
                      <div key={opt.key} className="pt-3 border-t border-stone-100">
                        <h4 className="text-[11px] font-black text-stone-500 uppercase tracking-widest mb-1">
                          Option {opt.key} Notes
                        </h4>
                        <p className="text-[13px] text-stone-600 leading-relaxed">{opt.explanation}</p>
                      </div>
                    )
                  }
                  return null
                })}

                {currentQ.concepts && currentQ.concepts.length > 0 && (
                  <div className="pt-3 border-t border-stone-100">
                    <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">
                      Related Concepts
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {currentQ.concepts.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setActiveConceptSlug(c.slug)}
                          className="text-xs font-bold px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 transition-colors cursor-pointer"
                        >
                          {c.term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden lg:flex bg-white/60 border border-stone-200 border-dashed rounded-2xl p-8 min-h-[280px] items-center justify-center text-center">
                <div className="space-y-2">
                  <div className="w-11 h-11 bg-white border border-stone-200 rounded-full flex items-center justify-center mx-auto shadow-2xs">
                    <HelpCircle className="w-5 h-5 text-stone-400" />
                  </div>
                  <p className="text-sm font-semibold text-stone-500">
                    Select an option to auto-save &amp; view rationale
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-4 sm:px-6 py-3.5 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => navigateTo(currentIndex - 1)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs sm:text-sm font-bold text-stone-700 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-2.5">
            {currentIndex < quiz.questions.length - 1 && (
              <button
                type="button"
                onClick={() => navigateTo(currentIndex + 1)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-xs"
              >
                <span>Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {(currentIndex === quiz.questions.length - 1 || answeredCount === quiz.totalQuestions) && (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitQuiz}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-xs"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Finishing...</span>
                  </>
                ) : (
                  <>
                    <Trophy className="w-4 h-4" />
                    <span>Complete Daily Quiz</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Concept Dossier Modal */}
      <ConceptDossierModal
        slug={activeConceptSlug}
        onClose={() => setActiveConceptSlug(null)}
        onSelectRelatedTerm={(termSlug) => setActiveConceptSlug(termSlug)}
      />
    </div>
  )
}
