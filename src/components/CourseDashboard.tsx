'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, Search, BarChart2, ChevronUp, CheckCircle2, Menu, X, Settings, Maximize2, Bookmark, Share2 } from 'lucide-react'
import LogOutButton from '@/components/LogOutButton'

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

type CourseDashboardProps = {
  chapters: Chapter[]
  mistakeCount: number
  bookmarkCount?: number
  userName: string | null
}

export default function CourseDashboard({ chapters, mistakeCount, bookmarkCount = 0, userName }: CourseDashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Find first available quiz as default
  const defaultChapter = chapters.find(c => c.quizzes.length > 0)
  const defaultQuiz = defaultChapter?.quizzes[0]

  const [activeQuizId, setActiveQuizId] = useState<number | null>(defaultQuiz?.id || null)
  const [collapsedChapters, setCollapsedChapters] = useState<Record<number, boolean>>({})

  const activeChapter = chapters.find(c => c.quizzes.some(q => q.id === activeQuizId))
  const activeQuiz = activeChapter?.quizzes.find(q => q.id === activeQuizId)

  const [completedQuizzesList, setCompletedQuizzesList] = useState<number[]>([])

  useEffect(() => {
    // Read from localStorage to find which quizzes are completed
    const completed = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('mock_result_')) {
        const quizId = parseInt(key.replace('mock_result_', ''), 10)
        if (!isNaN(quizId)) completed.push(quizId)
      }
    }
    setCompletedQuizzesList(completed)
  }, [])

  // Calculate total course stats
  const totalQuizzes = chapters.reduce((acc, c) => acc + c.quizzes.length, 0)
  const completedQuizzes = completedQuizzesList.length
  const progressPercent = totalQuizzes > 0 ? Math.round((completedQuizzes / totalQuizzes) * 100) : 0

  return (
    <div className="flex h-screen bg-white text-gray-900 overflow-hidden">

      {/* Mobile Sidebar Toggle */}
      {!sidebarOpen && (
        <button
          className="lg:hidden fixed bottom-6 right-6 z-50 bg-blue-600 text-white p-4 rounded-full shadow-xl"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="w-6 h-6" />
        </button>
      )}

      {/* ─── Sidebar ─── */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-[260px] bg-white border-r border-gray-200 
        flex flex-col transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Top bar in sidebar: < Back | ARD Course */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <button className="text-gray-600 hover:text-black">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-[15px] font-bold text-gray-900">ARD Course</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="lg:hidden text-gray-400 hover:text-gray-900" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
            {userName && (
              <div className="hidden lg:flex w-7 h-7 rounded-full bg-[#444] text-white text-xs font-bold items-center justify-center">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Progress Block */}
        <div className="px-4 pt-5 pb-4 border-b border-gray-200 shrink-0">
          <div className="flex items-end justify-between mb-2">
            <span className="text-2xl font-black text-blue-600 leading-none">{progressPercent}%</span>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm text-gray-500 font-medium">complete</span>
              <button className="text-gray-400 hover:text-gray-600"><BarChart2 className="w-4 h-4" /></button>
              <button className="text-gray-400 hover:text-gray-600"><Search className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-[6px]">
            <div className="bg-blue-500 h-[6px] rounded-full transition-all" style={{ width: `${Math.max(progressPercent, 2)}%` }}></div>
          </div>
        </div>

        {/* Course Section Header */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-semibold">11</span>
            <div>
              <div className="text-sm font-bold text-gray-900 leading-tight">ARD Quiz 2026</div>
              <div className="text-[11px] text-gray-400">{completedQuizzes} of {totalQuizzes} complete</div>
            </div>
          </div>
          <ChevronUp className="w-4 h-4 text-gray-400" />
        </div>

        {/* Quiz List */}
        <div className="flex-1 overflow-y-auto sidebar-scroll px-2 pb-4">
          {chapters.map(chapter => {
            if (chapter.quizzes.length === 0) return null
            return (
              <div key={chapter.id} className="mb-1">
                {/* Only show chapter heading if multiple chapters */}
                {chapters.filter(c => c.quizzes.length > 0).length > 1 && (
                  <div 
                    className="px-2 pt-4 pb-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded"
                    onClick={() => setCollapsedChapters(prev => ({ ...prev, [chapter.id]: !prev[chapter.id] }))}
                  >
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{chapter.name}</span>
                    {collapsedChapters[chapter.id] ? (
                      <ChevronLeft className="w-3.5 h-3.5 text-gray-400 -rotate-90" />
                    ) : (
                      <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </div>
                )}
                {!collapsedChapters[chapter.id] && chapter.quizzes.map(quiz => {
                  const isActive = activeQuizId === quiz.id
                  const isCompleted = completedQuizzesList.includes(quiz.id)
                  
                  return (
                    <button
                      key={quiz.id}
                      onClick={() => {
                        setActiveQuizId(quiz.id)
                        if (window.innerWidth < 1024) setSidebarOpen(false)
                      }}
                      className={`
                        w-full flex items-start gap-2.5 px-2 py-2.5 rounded-lg text-left transition-colors
                        ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}
                      `}
                    >
                      {/* Status circle */}
                      <div className="mt-0.5 shrink-0">
                        {isCompleted ? (
                           <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center bg-green-500">
                             <CheckCircle2 className="w-4 h-4 text-white" />
                           </div>
                        ) : (
                          <div className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center
                            ${isActive ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}
                          `}>
                            {isActive && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                        )}
                      </div>
                      {/* Quiz info */}
                      <div className="flex-1 min-w-0">
                        <div className={`text-[13px] font-semibold leading-snug truncate ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
                          {quiz.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-gray-400">Test</span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white relative">
        {/* Top Header */}
        <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-gray-500" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/bookmarks"
              className="flex items-center gap-1.5 text-[13px] font-bold text-amber-700 bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors shadow-xs"
              title="View & practice questions marked to revise"
            >
              <Bookmark className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>Revision ({bookmarkCount})</span>
            </Link>
            {mistakeCount > 0 && (
              <Link
                href="/redemption"
                className="flex items-center gap-1.5 text-[13px] font-bold text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-red-500"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/><line x1="8" y1="4" x2="8" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="11.5" r="0.8" fill="currentColor"/></svg>
                Forge ({mistakeCount})
              </Link>
            )}
            {userName ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#444] text-white flex items-center justify-center text-sm font-bold">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <LogOutButton />
              </div>
            ) : (
              <div className="flex gap-2">
                <Link href="/login" className="px-4 py-1.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Log In</Link>
                <Link href="/signup" className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">Sign Up</Link>
              </div>
            )}
          </div>
        </header>

        {/* Main Stage */}
        <div className="flex-1 overflow-y-auto">
          {activeQuiz ? (
            <div className="px-8 py-6">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                  Test lesson
                </span>
                <span className="text-gray-300">ARD Quiz 2026 · Lesson {activeQuiz.id} of {totalQuizzes}</span>
              </div>

              {/* Dark Preview Card */}
              <div className="bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] rounded-2xl overflow-hidden relative">
                {/* Inner content */}
                <div className="flex items-center justify-center py-16 px-8 relative">
                  {/* Centered info box */}
                  <div className="bg-[#22223a]/80 backdrop-blur-sm border border-[#333355] rounded-2xl px-10 py-10 text-center max-w-lg w-full">
                    <h1 className="text-3xl font-bold text-white mb-8">{activeQuiz.name}</h1>

                    <div className="flex justify-center gap-12 mb-8">
                      <div>
                        <div className="text-3xl font-bold text-white">{activeQuiz._count.questions}</div>
                        <div className="text-xs text-gray-400 font-medium mt-1">Questions</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-white">{activeQuiz._count.questions}</div>
                        <div className="text-xs text-gray-400 font-medium mt-1">Marks</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-white">
                          {Math.floor(activeQuiz._count.questions / 60) > 0 ? `${Math.floor(activeQuiz._count.questions / 60)}h ` : ''}{activeQuiz._count.questions % 60}m
                        </div>
                        <div className="text-xs text-gray-400 font-medium mt-1">Duration</div>
                      </div>
                    </div>

                    <p className="text-gray-400 text-sm mb-8">Ready when you are.</p>

                    <div className="flex items-center justify-center gap-4">
                      <Link
                        href={`/quiz/${activeQuiz.id}/instructions`}
                        className="px-8 py-2.5 bg-[#0088cc] hover:bg-[#009de6] text-white font-bold rounded-lg transition-colors text-sm"
                      >
                        Take Test
                      </Link>
                      <Link
                        href={`/quiz/${activeQuiz.id}/practice`}
                        className="px-8 py-2.5 bg-[#2a2a3e] hover:bg-[#3a3a4e] text-white font-bold rounded-lg transition-colors border border-[#444466] text-sm"
                      >
                        Practice Mode
                      </Link>
                    </div>
                  </div>

                  {/* Bottom right icons */}
                  <div className="absolute bottom-4 right-4 flex items-center gap-2">
                    <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                      <Settings className="w-4 h-4" />
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Below card: Title row */}
              <div className="flex items-center justify-between mt-6 mb-4">
                <h2 className="text-2xl font-black text-gray-900">{activeQuiz.name}</h2>
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium">
                    <Bookmark className="w-4 h-4" /> Save
                  </button>
                  <button className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium">
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                </div>
              </div>

              {/* Tabs row */}
              <div className="flex items-center gap-6 border-b border-gray-200 text-sm font-medium text-gray-500">
                <button className="pb-3 border-b-2 border-blue-600 text-blue-600 font-bold">Overview</button>
                <Link 
                  href="/bookmarks" 
                  className="pb-3 border-b-2 border-transparent hover:text-amber-700 hover:border-amber-400 flex items-center gap-1.5 transition-colors font-medium"
                >
                  <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                  <span>Bookmarks ({bookmarkCount})</span>
                </Link>
                <button className="pb-3 border-b-2 border-transparent hover:text-gray-900 hover:border-gray-300">Resources</button>
                <button className="pb-3 border-b-2 border-transparent hover:text-gray-900 hover:border-gray-300">Recently added</button>
                <button className="pb-3 border-b-2 border-transparent hover:text-gray-900 hover:border-gray-300">Discussions</button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Search className="w-16 h-16 mb-4 opacity-30" />
              <h2 className="text-xl font-bold text-gray-700">Select a module to begin</h2>
              <p className="text-sm text-gray-400 mt-1">Choose a quiz from the sidebar</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
