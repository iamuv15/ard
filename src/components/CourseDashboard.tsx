'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Menu, 
  X, 
  Bookmark, 
  BookOpen, 
  Play, 
  Zap, 
  FileText,
  Sparkles,
  Award,
  Layers
} from 'lucide-react'
import LogOutButton from '@/components/LogOutButton'

type Quiz = {
  id: number
  name: string
  _count: { questions: number }
  topic?: string | null
  difficulty?: string | null
}

type Chapter = {
  id: number
  name: string
  quizzes: Quiz[]
  _count?: { concepts?: number }
}

type CourseDashboardProps = {
  chapters: Chapter[]
  mistakeCount: number
  bookmarkCount?: number
  userName: string | null
}

function getChapterIcon(name: string) {
  const lower = name.toLowerCase()
  if (lower.includes('soil')) return '🌱'
  if (lower.includes('animal') || lower.includes('husbandry') || lower.includes('poultry')) return '🐄'
  if (lower.includes('horticulture') || lower.includes('fruit')) return '🍎'
  if (lower.includes('agronomy') || lower.includes('crop')) return '🌾'
  if (lower.includes('irrigation') || lower.includes('water')) return '💧'
  if (lower.includes('engineering') || lower.includes('machinery')) return '🚜'
  if (lower.includes('nutrition') || lower.includes('fertilizer')) return '🧪'
  if (lower.includes('seed')) return '🥜'
  if (lower.includes('extension')) return '📢'
  if (lower.includes('forestry')) return '🌲'
  if (lower.includes('basic')) return '📚'
  return '📝'
}

const TOPIC_METADATA: Record<string, { desc: string; easyDesc: string; medDesc: string; hardDesc: string }> = {
  "Soil Genesis, Rocks & Weathering": {
    desc: "Pedology foundations, rock taxonomy, weathering processes, Dokuchaev soil horizons & catena dynamics.",
    easyDesc: "Definitional recall, founders & basic rock/mineral identification",
    medDesc: "Mineral hardness, weathering rates, standard constants & mineral facts",
    hardDesc: "Bowen's reaction series, obscure mineralogy & multi-statement synthesis"
  },
  "Soil Physical Properties & Texture": {
    desc: "Soil texture, mechanical analysis, textural triangle, bulk & particle density, porosity & soil structure.",
    easyDesc: "Definitions of texture, structure, aeration & density",
    medDesc: "USDA textural separates & standard bulk density values",
    hardDesc: "Stokes' law formulas, porosity calculations & soil physics traps"
  },
  "Soil Water Dynamics & Hydrology": {
    desc: "Soil water potentials, pF curve, movement, measurement tools & moisture constants.",
    easyDesc: "Gravitational, capillary & hygroscopic water definitions",
    medDesc: "pF values, tensiometer ranges & field capacity constants",
    hardDesc: "Moisture content math, Darcy's law equations & hydrology traps"
  },
  "Soil Chemistry, Colloids & Organic Matter": {
    desc: "Clay minerals, ion exchange, CEC, AEC, soil humus & C:N ratio dynamics.",
    easyDesc: "Soil colloids & organic matter definitions",
    medDesc: "CEC values of clay minerals (1:1 vs 2:1 lattice) & standard ratios",
    hardDesc: "Base saturation calculations & complex anion exchange traps"
  },
  "Problematic Soils & Reclamation": {
    desc: "Saline, sodic/alkali, acid soils & chemical amendments like gypsum and lime.",
    easyDesc: "Definitions of saline, sodic & acid soils",
    medDesc: "Benchmark EC, ESP, and pH thresholds for reclamation",
    hardDesc: "Gypsum requirement calculation formulas & acid-sulfate traps"
  },
  "Soil Erosion, Conservation & Watershed": {
    desc: "Water and wind erosion stages, USLE equation & conservation agronomy.",
    easyDesc: "Water erosion stages (splash, sheet, rill, gully)",
    medDesc: "Contour bunding slopes & gully classification limits",
    hardDesc: "Universal Soil Loss Equation (USLE) math & erosion indices"
  },
  "Plant Nutrients, Fertilizers & Manures": {
    desc: "Essential nutrients, deficiency symptoms, chemical fertilizers & organic manures.",
    easyDesc: "Macronutrient vs micronutrient basic classifications",
    medDesc: "Nutrient percentages in Urea, DAP, MOP & organic manures",
    hardDesc: "Fertilizer dose calculation formulas & hidden hunger traps"
  }
}

export default function CourseDashboard({ chapters, mistakeCount, bookmarkCount = 0, userName }: CourseDashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Default to Chapter 16 (Soil) if present, or first available chapter
  const defaultChapter = chapters.find(c => c.name.toLowerCase().includes('soil')) || chapters[0]
  const [activeChapterId, setActiveChapterId] = useState<number>(defaultChapter?.id || chapters[0]?.id || 1)
  const activeChapter = chapters.find(c => c.id === activeChapterId) || defaultChapter || chapters[0]

  const [completedQuizzesList, setCompletedQuizzesList] = useState<number[]>([])

  useEffect(() => {
    // Read from localStorage to find which quizzes are completed
    const completed: number[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('mock_result_')) {
        const quizId = parseInt(key.replace('mock_result_', ''), 10)
        if (!isNaN(quizId)) completed.push(quizId)
      }
    }
    setCompletedQuizzesList(completed)
  }, [])

  // Calculate course stats
  const totalCourseQuizzes = chapters.reduce((acc, c) => acc + c.quizzes.length, 0)
  const totalCourseQuestions = chapters.reduce((acc, c) => acc + c.quizzes.reduce((qAcc, q) => qAcc + q._count.questions, 0), 0)
  const completedCount = completedQuizzesList.length
  const progressPercent = totalCourseQuizzes > 0 ? Math.round((completedCount / totalCourseQuizzes) * 100) : 0

  // Group active chapter quizzes by topic if topic exists
  const hasTopicGrouped = activeChapter ? activeChapter.quizzes.some(q => q.topic) : false

  type TopicGroup = {
    topic: string
    quizzes: Quiz[]
    totalQuestions: number
  }

  const topicGroups: TopicGroup[] = []
  const ungroupedQuizzes: Quiz[] = []

  if (activeChapter) {
    for (const q of activeChapter.quizzes) {
      if (q.topic) {
        let g = topicGroups.find(x => x.topic === q.topic)
        if (!g) {
          g = { topic: q.topic, quizzes: [], totalQuestions: 0 }
          topicGroups.push(g)
        }
        g.quizzes.push(q)
        g.totalQuestions += q._count.questions
      } else {
        ungroupedQuizzes.push(q)
      }
    }

    const diffOrder: Record<string, number> = { EASY: 1, MEDIUM: 2, HARD: 3 }
    for (const g of topicGroups) {
      g.quizzes.sort((a, b) => {
        const oa = diffOrder[a.difficulty || ''] || 99
        const ob = diffOrder[b.difficulty || ''] || 99
        return oa - ob
      })
    }
  }

  const activeChapterTotalQuestions = activeChapter
    ? activeChapter.quizzes.reduce((acc, q) => acc + q._count.questions, 0)
    : 0

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-gray-900 overflow-hidden font-sans">

      {/* Mobile Sidebar Toggle Button */}
      {!sidebarOpen && (
        <button
          className="lg:hidden fixed bottom-6 left-6 z-50 bg-blue-600 text-white p-3.5 rounded-full shadow-2xl flex items-center justify-center cursor-pointer"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* ─── Column 1: Chapter Sidebar (Left) ─── */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-[270px] lg:w-[290px] bg-white border-r border-gray-200 
        flex flex-col transform transition-transform duration-300 ease-in-out shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Top Branding Bar */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-200 shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
              LS
            </div>
            <div>
              <span className="text-[14px] font-black text-gray-900 block leading-tight">LiveShala ARD</span>
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Course Syllabus</span>
            </div>
          </div>
          <button className="lg:hidden text-gray-400 hover:text-gray-900" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Course Progress Header */}
        <div className="px-5 py-4 border-b border-gray-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Overall Progress</span>
            <span className="text-[12px] font-black text-blue-600">{progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-blue-600 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.max(progressPercent, 2)}%` }}
            />
          </div>
          <div className="text-[10px] text-gray-400 mt-1 font-medium flex justify-between">
            <span>{chapters.length} Chapters</span>
            <span>{totalCourseQuestions} Questions</span>
          </div>
        </div>

        {/* Chapters List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <div className="px-2 pb-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Select Chapter
          </div>

          {chapters.map((chapter, cIdx) => {
            const isSelected = activeChapter?.id === chapter.id
            const totalQ = chapter.quizzes.reduce((acc, q) => acc + q._count.questions, 0)
            const icon = getChapterIcon(chapter.name)

            return (
              <button
                key={chapter.id}
                onClick={() => {
                  setActiveChapterId(chapter.id)
                  if (window.innerWidth < 1024) setSidebarOpen(false)
                }}
                className={`
                  w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer group
                  ${isSelected 
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20' 
                    : 'bg-white hover:bg-slate-100/80 text-gray-800 border border-transparent'
                  }
                `}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base shrink-0">{icon}</span>
                  <div className="min-w-0">
                    <div className={`text-[13px] font-bold leading-snug truncate ${isSelected ? 'text-white' : 'text-gray-900 group-hover:text-blue-600'}`}>
                      {chapter.name}
                    </div>
                    <div className={`text-[10px] font-medium leading-none mt-0.5 ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                      {totalQ} Questions • {chapter.quizzes.length} Quizzes
                    </div>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-white translate-x-0.5' : 'text-gray-300 group-hover:text-gray-500'}`} />
              </button>
            )
          })}
        </div>

        {/* User Footer */}
        <div className="p-3 border-t border-gray-200 shrink-0 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-gray-900 truncate">{userName || 'Student'}</div>
              <div className="text-[10px] text-gray-400">NABARD Grade A</div>
            </div>
          </div>
          <LogOutButton />
        </div>
      </aside>

      {/* ─── Column 2: Main Area (Chapter Header & Direct-Action Topic Cards) ─── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">
        {/* Top Global Header Bar */}
        <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 lg:px-8 shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-gray-500" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 font-medium">ARD Syllabus</span>
              <span className="text-gray-300">/</span>
              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                <span>{getChapterIcon(activeChapter.name)}</span>
                <span>{activeChapter.name}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/bookmarks"
              className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors shadow-2xs"
              title="Practice marked questions"
            >
              <Bookmark className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>Revision ({bookmarkCount})</span>
            </Link>
            {mistakeCount > 0 && (
              <Link
                href="/redemption"
                className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200/80 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors shadow-2xs"
                title="Practice mistakes in The Forge"
              >
                <Award className="w-3.5 h-3.5 text-red-500" />
                <span>The Forge ({mistakeCount})</span>
              </Link>
            )}
            <a
              href="https://liveshala.com"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              ← Back to Liveshala
            </a>
          </div>
        </header>

        {/* Scrollable Stage */}
        <div className="flex-1 overflow-y-auto px-6 lg:px-10 py-8">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* ─── Chapter Showcase Header Banner ─── */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 lg:p-8 text-white shadow-sm border border-slate-700/50 relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
                    <span>{getChapterIcon(activeChapter.name)}</span>
                    <span className="uppercase tracking-wider">Chapter Module</span>
                  </div>
                  <h1 className="text-2xl lg:text-4xl font-black text-white tracking-tight">
                    {activeChapter.name}
                  </h1>
                  <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
                    {hasTopicGrouped 
                      ? `${activeChapterTotalQuestions} questions organized into ${topicGroups.length} topics across 3 progressive difficulty levels. Fully unlocked.`
                      : `${activeChapterTotalQuestions} questions across ${activeChapter.quizzes.length} comprehensive practice quizzes.`
                    }
                  </p>
                </div>

                {/* Direct Link to Chapter Theory Docs */}
                <Link
                  href={`/chapter/${activeChapter.id}/concepts`}
                  className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition-all hover:scale-[1.02] shrink-0"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>
                    {activeChapter._count?.concepts 
                      ? `Read ${activeChapter._count.concepts} Concepts & Notes →` 
                      : 'Read Chapter Theory & Notes →'
                    }
                  </span>
                </Link>
              </div>
            </div>

            {/* ─── Section Header ─── */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  <span>Topic Modules & Difficulty Quizzes</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Launch Practice Mode with Voice Tutor or attempt a Timed Exam in just 1 click.
                </p>
              </div>
            </div>

            {/* ─── Direct-Action Topic Cards Grid (Idea 2) ─── */}
            {hasTopicGrouped ? (
              <div className="space-y-6">
                {topicGroups.map((group, tIdx) => {
                  const meta = TOPIC_METADATA[group.topic] || {
                    desc: "Comprehensive question set covering this syllabus topic.",
                    easyDesc: "Core definitions & foundational terminology",
                    medDesc: "Standard facts, ranges & numerical values",
                    hardDesc: "Formulas, calculations & tricky exam traps"
                  }

                  return (
                    <div 
                      key={group.topic}
                      className="bg-white rounded-2xl border border-gray-200/90 shadow-xs hover:border-gray-300 transition-all overflow-hidden"
                    >
                      {/* Topic Card Top Header */}
                      <div className="p-5 lg:p-6 bg-slate-50/60 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-blue-600/10 text-blue-700 text-xs font-black flex items-center justify-center shrink-0">
                              {tIdx + 1}
                            </span>
                            <h3 className="text-base lg:text-lg font-black text-gray-900 leading-tight">
                              {group.topic}
                            </h3>
                          </div>
                          <p className="text-xs text-gray-500 font-medium pl-8.5">
                            {meta.desc}
                          </p>
                        </div>
                        <div className="pl-8.5 sm:pl-0 shrink-0">
                          <span className="inline-block px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-bold text-gray-700 shadow-2xs">
                            {group.totalQuestions} Questions Total
                          </span>
                        </div>
                      </div>

                      {/* 3 Difficulty Level Rows with Direct Action Buttons */}
                      <div className="divide-y divide-gray-100">
                        {group.quizzes.map((quiz) => {
                          const isEasy = quiz.difficulty === 'EASY'
                          const isMed = quiz.difficulty === 'MEDIUM'
                          const isHard = quiz.difficulty === 'HARD'
                          const isCompleted = completedQuizzesList.includes(quiz.id)

                          const levelLabel = isEasy ? 'Level 1: Easy' : isMed ? 'Level 2: Medium' : 'Level 3: Hard'
                          const levelBadgeBg = isEasy 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : isMed 
                            ? 'bg-amber-50 text-amber-800 border-amber-200' 
                            : 'bg-rose-50 text-rose-800 border-rose-200'

                          const levelIcon = isEasy ? '🟢' : isMed ? '🟡' : '🔴'
                          const levelScope = isEasy ? meta.easyDesc : isMed ? meta.medDesc : meta.hardDesc

                          return (
                            <div 
                              key={quiz.id}
                              className="p-4 lg:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors"
                            >
                              {/* Level Identity & Info */}
                              <div className="flex items-start gap-3 min-w-0">
                                <span className="text-base shrink-0 mt-0.5">{levelIcon}</span>
                                <div className="space-y-0.5 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded border ${levelBadgeBg}`}>
                                      {levelLabel}
                                    </span>
                                    <span className="text-xs font-bold text-gray-800">
                                      {quiz._count.questions} Questions ({quiz._count.questions} Marks)
                                    </span>
                                    {isCompleted && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                        <CheckCircle2 className="w-3 h-3 text-green-600" /> Completed
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 font-medium">
                                    {levelScope}
                                  </p>
                                </div>
                              </div>

                              {/* Direct Launch Buttons (Practice & Exam) */}
                              <div className="flex items-center gap-2 pl-7 md:pl-0 shrink-0">
                                <Link
                                  href={`/quiz/${quiz.id}/practice`}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-600 hover:text-white transition-all shadow-2xs group"
                                  title="Practice with instant Edge-TTS voice explanations and bookmarks"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current transition-transform group-hover:scale-110" />
                                  <span>Practice Mode</span>
                                </Link>

                                <Link
                                  href={`/quiz/${quiz.id}/instructions`}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-800 hover:text-white transition-all shadow-2xs"
                                  title="Attempt as timed mock test with negative marking"
                                >
                                  <Zap className="w-3.5 h-3.5" />
                                  <span>Timed Exam</span>
                                </Link>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Fallback for Chapters not yet topic-grouped (e.g. Agri Engineering) */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeChapter.quizzes.map((quiz, qIdx) => {
                  const isCompleted = completedQuizzesList.includes(quiz.id)
                  return (
                    <div 
                      key={quiz.id}
                      className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-5 hover:border-gray-300 transition-all flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Quiz {qIdx + 1}
                          </span>
                          <span className="text-xs font-bold text-gray-600">
                            {quiz._count.questions} Qs
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-gray-900 leading-snug">
                          {quiz.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                        <Link
                          href={`/quiz/${quiz.id}/practice`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-600 hover:text-white transition-all shadow-2xs"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Practice Mode</span>
                        </Link>
                        <Link
                          href={`/quiz/${quiz.id}/instructions`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-800 hover:text-white transition-all shadow-2xs"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Timed Exam</span>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        </div>
      </main>

    </div>
  )
}
