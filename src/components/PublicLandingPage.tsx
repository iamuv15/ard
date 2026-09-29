'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Lock,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Flame,
  Clock,
  Target,
  BarChart3,
  Award,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  ShieldCheck,
  Zap,
  HelpCircle,
  GraduationCap
} from 'lucide-react'

type Quiz = {
  id: number
  name: string
  _count: { questions: number }
}

type Chapter = {
  id: number
  name: string
  quizzes: Quiz[]
}

type PublicLandingPageProps = {
  chapters: Chapter[]
}

export default function PublicLandingPage({ chapters }: PublicLandingPageProps) {
  const [expandedChapterId, setExpandedChapterId] = useState<number | null>(chapters[0]?.id || null)

  const totalQuizzes = chapters.reduce((sum, ch) => sum + ch.quizzes.length, 0)
  const totalQuestions = chapters.reduce(
    (sum, ch) => sum + ch.quizzes.reduce((qsum, q) => qsum + q._count.questions, 0),
    0
  )

  const chapterIcons: Record<string, string> = {
    'Agriculture Engineering': '🚜',
    'Agriculture Extension': '📢',
    'Agroforestry': '🌲',
    'Animal Husbandry': '🐄',
    'Basics of Agriculture': '🌾',
    'Horticulture': '🍎',
    'Irrigation': '💧',
    'Plant Nutrition': '🧪',
    'Seed': '🌱',
    'Soil': '🏔️',
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* ─── Top Announcement Banner ─── */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 px-4 py-2 text-center text-xs sm:text-sm font-medium text-white shadow-inner flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
        <span>ARD 2026 Examination Portal · 1,585+ Curated Questions across 10 Chapters</span>
        <Link
          href="/login"
          className="ml-2 underline font-bold hover:text-amber-200 transition-colors hidden sm:inline"
        >
          Sign in to practice →
        </Link>
      </div>

      {/* ─── Navigation Header ─── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0b0f19]/80 border-b border-gray-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white block leading-none">
                ARD<span className="text-blue-500">Master</span>
              </span>
              <span className="text-[10px] font-semibold text-gray-400 tracking-wider uppercase">
                Exam Series 2026
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
            <a href="#curriculum" className="hover:text-white transition-colors">
              Curriculum ({chapters.length} Chapters)
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#the-forge" className="hover:text-white transition-colors">
              Mistake Forge
            </a>
            <a href="#preview" className="hover:text-white transition-colors">
              Question Sample
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-gray-200 hover:text-white transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-blue-600/30 transition-all transform hover:-translate-y-0.5"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <section className="relative pt-20 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Glow ambient effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-blue-600/20 via-indigo-500/20 to-purple-600/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span>Member-Only Access Portal</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1] mb-6">
            Complete Agriculture &amp; Rural Development{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
              Exam Test Series
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed mb-10">
            A comprehensive, exam-mode question bank engineered for serious aspirants. Real-time TCS-iON timed mocks,
            instant practice modes with thorough rationales, and automated spaced-repetition mistake redemption.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-xl shadow-blue-600/25 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 text-base"
            >
              <Lock className="w-4 h-4 text-blue-200" />
              <span>Log In to Unlock Quizzes</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-3.5 bg-gray-800/80 hover:bg-gray-800 text-gray-200 hover:text-white font-semibold rounded-xl border border-gray-700/80 transition-all text-base"
            >
              Create Free Account
            </Link>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl">
            <div className="p-2">
              <div className="text-3xl sm:text-4xl font-extrabold text-white mb-1">
                {chapters.length}
              </div>
              <div className="text-xs sm:text-sm font-medium text-gray-400">Comprehensive Chapters</div>
            </div>
            <div className="p-2 border-l border-gray-800">
              <div className="text-3xl sm:text-4xl font-extrabold text-blue-400 mb-1">
                {totalQuizzes}
              </div>
              <div className="text-xs sm:text-sm font-medium text-gray-400">Full Tests &amp; Mocks</div>
            </div>
            <div className="p-2 border-t md:border-t-0 md:border-l border-gray-800">
              <div className="text-3xl sm:text-4xl font-extrabold text-indigo-400 mb-1">
                {totalQuestions.toLocaleString()}
              </div>
              <div className="text-xs sm:text-sm font-medium text-gray-400">Curated Questions</div>
            </div>
            <div className="p-2 border-t md:border-t-0 md:border-l border-gray-800">
              <div className="text-3xl sm:text-4xl font-extrabold text-purple-400 mb-1">100%</div>
              <div className="text-xs sm:text-sm font-medium text-gray-400">Option Explanations</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Curriculum Overview: "Reflecting What Is Inside" ─── */}
      <section id="curriculum" className="py-16 px-4 sm:px-6 lg:px-8 bg-[#0e1322] border-y border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
              Full Course Curriculum
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mt-4 mb-3">
              Explore What&apos;s Waiting Inside
            </h2>
            <p className="text-gray-400 text-sm sm:text-base">
              The entire ARD syllabus is structured into 10 focused modules. Sign in to your account to start
              attempting any test or practice questions with instant feedback.
            </p>
          </div>

          {/* Chapters Accordion / List */}
          <div className="space-y-4">
            {chapters.map((chapter) => {
              const isExpanded = expandedChapterId === chapter.id
              const chapterQuestions = chapter.quizzes.reduce((sum, q) => sum + q._count.questions, 0)
              const icon = chapterIcons[chapter.name] || '📚'

              return (
                <div
                  key={chapter.id}
                  className="bg-gray-900/70 border border-gray-800 rounded-2xl overflow-hidden transition-all duration-200 hover:border-gray-700"
                >
                  {/* Chapter Header */}
                  <div
                    onClick={() => setExpandedChapterId(isExpanded ? null : chapter.id)}
                    className="p-5 sm:p-6 flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-800/80 border border-gray-700/60 flex items-center justify-center text-2xl shrink-0">
                        {icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-lg sm:text-xl font-bold text-white hover:text-blue-400 transition-colors">
                            {chapter.name}
                          </h3>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-400 mt-1">
                          {chapter.quizzes.length} {chapter.quizzes.length === 1 ? 'Quiz' : 'Quizzes'} ·{' '}
                          <span className="text-gray-300 font-semibold">{chapterQuestions} Questions</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-800 text-gray-300 border border-gray-700">
                        <Lock className="w-3 h-3 text-amber-400" />
                        Locked
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Quiz List inside Chapter */}
                  {isExpanded && (
                    <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-gray-800/80 bg-gray-950/40">
                      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                        Tests included in this module
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {chapter.quizzes.map((quiz) => (
                          <div
                            key={quiz.id}
                            className="flex items-center justify-between p-3.5 rounded-xl bg-gray-900/90 border border-gray-800/80 hover:border-blue-500/40 transition-colors group"
                          >
                            <div className="flex items-center gap-3 min-w-0 pr-3">
                              <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 group-hover:text-blue-400 shrink-0">
                                <FileQuestion className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-gray-200 group-hover:text-white truncate">
                                  {quiz.name}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {quiz._count.questions} Multiple Choice Questions
                                </div>
                              </div>
                            </div>

                            <Link
                              href="/login"
                              className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Unlock</span>
                            </Link>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-800/60 flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs text-gray-400">
                          Ready to practice {chapter.name}?
                        </span>
                        <Link
                          href="/login"
                          className="text-xs font-bold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                        >
                          <span>Sign in to unlock all {chapter.quizzes.length} tests</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── Platform Features: "How It Works" ─── */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
              Platform Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mt-4 mb-3">
              Engineered for High-Score Exam Prep
            </h2>
            <p className="text-gray-400 text-sm sm:text-base">
              Everything built into ARD Master is tailored to mirror real competitive exam patterns.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl bg-gradient-to-b from-gray-900/90 to-gray-900/40 border border-gray-800 hover:border-gray-700 transition-all flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">TCS-iON Exam Simulator</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-4 flex-1">
                Attempt tests under real examination constraints: full timer countdown, status palette (Answered,
                Marked for Review, Not Visited), negative marking, and automated submit.
              </p>
              <div className="text-xs font-semibold text-blue-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Simulated exam conditions</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-gradient-to-b from-gray-900/90 to-gray-900/40 border border-gray-800 hover:border-gray-700 transition-all flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Instant Practice Mode</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-4 flex-1">
                Study at your own pace. Receive instant feedback after every question along with comprehensive
                explanations for option A, B, C, D, and E to cement underlying concepts.
              </p>
              <div className="text-xs font-semibold text-indigo-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Exhaustive option rationales</span>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-gradient-to-b from-gray-900/90 to-gray-900/40 border border-gray-800 hover:border-gray-700 transition-all flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6">
                <Flame className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">The Mistake Forge</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-4 flex-1">
                Every wrong answer is automatically routed into your personal Mistake Forge. Spaced repetition prompts
                you to review missed concepts until you achieve complete mastery.
              </p>
              <div className="text-xs font-semibold text-purple-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Spaced repetition algorithm</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Question Sneak Peek (Reflect What's Inside) ─── */}
      <section id="preview" className="py-16 px-4 sm:px-6 lg:px-8 bg-[#0e1322] border-y border-gray-800">
        <div className="max-w-4xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
              Quality Preview
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mt-4 mb-3">
              Sample Question from Our Question Bank
            </h2>
            <p className="text-gray-400 text-sm">
              See the exact formatting and depth of explanations provided across all 1,585 questions.
            </p>
          </div>

          {/* Sample Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full">
                Soil Science &amp; Management · Question #14
              </span>
              <span className="text-xs text-gray-400">Exam Difficulty: Moderate</span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white mb-6 leading-snug">
              In high rainfall regions, what is the primary cause for development of acidic soil conditions?
            </h3>

            {/* Options list */}
            <div className="space-y-2.5 mb-6">
              {[
                { letter: 'A', text: 'Excessive accumulation of sodium and potassium salts' },
                { letter: 'B', text: 'Leaching of basic cations (Ca²⁺, Mg²⁺, K⁺) replaced by H⁺ and Al³⁺' },
                { letter: 'C', text: 'High rate of organic matter oxidation under drought conditions' },
                { letter: 'D', text: 'Deposition of calcium carbonate in upper soil horizons' },
                { letter: 'E', text: 'Improper irrigation with saline groundwater' },
              ].map((opt) => (
                <div
                  key={opt.letter}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-950/60 border border-gray-800 text-gray-300 text-sm"
                >
                  <span className="w-6 h-6 rounded-lg bg-gray-800 text-gray-300 font-bold text-xs flex items-center justify-center shrink-0">
                    {opt.letter}
                  </span>
                  <span>{opt.text}</span>
                </div>
              ))}
            </div>

            {/* Locked Answer & Explanation Overlay */}
            <div className="p-5 rounded-xl bg-gradient-to-r from-blue-950/70 via-indigo-950/70 to-purple-950/70 border border-blue-500/30 text-center relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-300 shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Answer &amp; Deep Rationale Locked</div>
                    <div className="text-xs text-gray-300">
                      Sign in to verify correct answer and view full multi-paragraph explanation.
                    </div>
                  </div>
                </div>

                <Link
                  href="/login"
                  className="px-5 py-2 text-xs sm:text-sm font-bold bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-all shrink-0 shadow"
                >
                  Log In to View
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Bottom Call to Action ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-blue-500/20">
            <Zap className="w-8 h-8" />
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Ready to Begin Your Preparation?
          </h2>
          <p className="text-gray-400 text-base sm:text-lg max-w-xl mx-auto mb-8">
            Access all 25 mock tests, 1,585 questions, and personal mistake tracking immediately by logging into your
            account.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-xl shadow-blue-600/30 transition-all transform hover:-translate-y-0.5 text-base"
            >
              Sign In to Your Dashboard
            </Link>
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-3.5 bg-gray-800 hover:bg-gray-750 text-white font-semibold rounded-xl border border-gray-700 transition-all text-base"
            >
              Create New Account
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="mt-auto border-t border-gray-800 bg-[#070a12] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white text-base">ARD Master</span>
            <span>·</span>
            <span>Comprehensive 2026 Examination Question Bank</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-gray-300 transition-colors">
              Log In
            </Link>
            <Link href="/signup" className="hover:text-gray-300 transition-colors">
              Sign Up
            </Link>
            <Link href="/admin/login" className="hover:text-gray-300 transition-colors">
              Admin Portal
            </Link>
          </div>

          <div>
            &copy; {new Date().getFullYear()} ARD Master. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
