'use client'

import Link from 'next/link'
import { Lock, BookOpen, ChevronRight, GraduationCap } from 'lucide-react'

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
  const totalQuizzes = chapters.reduce((sum, ch) => sum + ch.quizzes.length, 0)
  const totalQuestions = chapters.reduce(
    (sum, ch) => sum + ch.quizzes.reduce((qsum, q) => qsum + q._count.questions, 0),
    0
  )

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans">
      {/* ─── Header ─── */}
      <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="font-bold text-base text-gray-900 tracking-tight">ARD Course</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero / Summary ─── */}
      <section className="py-12 px-4 sm:px-6 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto text-center">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-4">
            ARD Examination 2026
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
            Agriculture &amp; Rural Development Test Series
          </h1>
          <p className="text-base text-gray-600 max-w-xl mx-auto mb-6">
            Complete question bank featuring {chapters.length} chapters, {totalQuizzes} quizzes, and {totalQuestions.toLocaleString()} questions. Log in to start attempting tests.
          </p>

          <div className="flex items-center justify-center gap-3">
            <Link
              href="/login"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors inline-flex items-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Log In to Access</span>
            </Link>
            <Link
              href="/signup"
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-sm rounded-lg transition-colors"
            >
              Sign Up with Invite Code
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Curriculum Overview (What is inside) ─── */}
      <main className="flex-1 py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Course Syllabus</h2>
              <p className="text-xs text-gray-500">Sign in to unlock all modules</p>
            </div>
            <span className="text-xs font-medium text-gray-500 bg-gray-200/70 px-2.5 py-1 rounded-full">
              {totalQuizzes} Quizzes Total
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {chapters.map((chapter) => {
              const questionCount = chapter.quizzes.reduce((sum, q) => sum + q._count.questions, 0)

              return (
                <div
                  key={chapter.id}
                  className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-gray-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-base text-gray-900 leading-snug">
                          {chapter.name}
                        </h3>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                        <Lock className="w-3 h-3 text-gray-400" />
                        Locked
                      </span>
                    </div>

                    <div className="text-xs text-gray-500 mb-4 pl-10">
                      {chapter.quizzes.length} {chapter.quizzes.length === 1 ? 'quiz' : 'quizzes'} · {questionCount} questions
                    </div>

                    {/* Compact Quizzes List */}
                    <div className="space-y-1.5 border-t border-gray-100 pt-3">
                      {chapter.quizzes.map((quiz) => (
                        <Link
                          key={quiz.id}
                          href="/login"
                          className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors group"
                        >
                          <span className="truncate pr-2 font-medium">
                            {quiz.name}
                          </span>
                          <span className="text-gray-400 shrink-0 text-[11px]">
                            {quiz._count.questions} Qs
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-400">Requires login</span>
                    <Link
                      href="/login"
                      className="font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                    >
                      <span>Unlock</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>

      {/* ─── Minimal Footer ─── */}
      <footer className="border-t border-gray-200 bg-white py-6 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div>&copy; {new Date().getFullYear()} ARD Course. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-gray-800 transition-colors">Log In</Link>
            <Link href="/signup" className="hover:text-gray-800 transition-colors">Sign Up</Link>
            <Link href="/admin/login" className="hover:text-gray-800 transition-colors">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
