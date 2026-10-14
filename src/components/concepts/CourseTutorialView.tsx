'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  BookOpen,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  CheckCircle2,
  HelpCircle,
  ImageIcon,
  Play,
  Search,
  Sparkles,
  ArrowRight,
  Menu,
  X,
  Layers,
  Award,
  ExternalLink,
  RotateCcw
} from 'lucide-react'
import { ConceptDossierModal } from './ConceptDossierModal'
import { FormattedExplanation } from '@/components/FormattedExplanation'

export interface ConceptSummary {
  id: number
  term: string
  slug: string
  category: string
  subCategory?: string | null
  definition?: string | null
  examTraps?: string | null
  imageUrl?: string | null
  thumbnailUrl?: string | null
  imageCaption?: string | null
  videoUrl?: string | null
  _count?: { questions: number }
}

interface MindMapCategory {
  name: string
  description?: string
  subCategories: {
    name: string
    keywords: string[]
  }[]
}

interface CourseTutorialViewProps {
  chapterId: number
  chapterName: string
  categories: MindMapCategory[]
  allConcepts: ConceptSummary[]
  initialSubCategory?: string | null
  onSwitchToMindMap: () => void
}

interface CheckpointQuestion {
  id: number
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  optionE?: string | null
  correctAnswer: string
  explanation?: string | null
  simpleExplanation?: string | null
  concepts?: { id: number; term: string; slug: string }[]
}

export function CourseTutorialView({
  chapterId,
  chapterName,
  categories,
  allConcepts,
  initialSubCategory,
  onSwitchToMindMap
}: CourseTutorialViewProps) {
  // Concept lookup map
  const conceptMap = useMemo(() => {
    const map = new Map<string, ConceptSummary>()
    allConcepts.forEach(c => {
      map.set(c.term.toLowerCase().trim(), c)
    })
    return map
  }, [allConcepts])

  // Flattened modules (Sub-Branches)
  const modules = useMemo(() => {
    const list: {
      index: number
      branchName: string
      subCategoryName: string
      keywords: string[]
      concepts: ConceptSummary[]
      totalQuestions: number
    }[] = []

    let idx = 0
    categories.forEach(cat => {
      cat.subCategories.forEach(sub => {
        const subConcepts: ConceptSummary[] = []
        let totalQ = 0

        sub.keywords.forEach(kw => {
          const c = conceptMap.get(kw.toLowerCase().trim())
          if (c) {
            subConcepts.push(c)
            totalQ += c._count?.questions || 0
          } else {
            // Placeholder capsule if not yet generated
            subConcepts.push({
              id: -(idx * 100 + subConcepts.length),
              term: kw,
              slug: kw.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-'),
              category: cat.name,
              subCategory: sub.name,
              definition: `Core technical concept for ${sub.name}.`,
              _count: { questions: 0 }
            })
          }
        })

        list.push({
          index: idx,
          branchName: cat.name,
          subCategoryName: sub.name,
          keywords: sub.keywords,
          concepts: subConcepts,
          totalQuestions: totalQ
        })
        idx++
      })
    })

    return list
  }, [categories, conceptMap])

  // Find initial module index
  const initialIdx = useMemo(() => {
    if (!initialSubCategory) return 0
    const found = modules.findIndex(
      m => m.subCategoryName.toLowerCase().trim() === initialSubCategory.toLowerCase().trim()
    )
    return found !== -1 ? found : 0
  }, [modules, initialSubCategory])

  const [activeModuleIdx, setActiveModuleIdx] = useState(initialIdx)
  const [activeTab, setActiveTab] = useState<'matrix' | 'cards' | 'checkpoint'>('matrix')
  const [activeCardIdx, setActiveCardIdx] = useState(0)
  const [matrixFilter, setMatrixFilter] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeModalSlug, setActiveModalSlug] = useState<string | null>(null)

  // Checkpoint Quiz State
  const [quizQuestions, setQuizQuestions] = useState<CheckpointQuestion[]>([])
  const [quizLoading, setQuizLoading] = useState(false)
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({})
  const [expandedAnswers, setExpandedAnswers] = useState<Record<number, boolean>>({})

  const currentModule = modules[activeModuleIdx] || modules[0]

  // Reset card index & quiz state when module changes
  useEffect(() => {
    setActiveCardIdx(0)
    setMatrixFilter('')
    setUserAnswers({})
    setExpandedAnswers({})
    setQuizQuestions([])
  }, [activeModuleIdx])

  // Fetch Checkpoint Questions when Checkpoint tab is opened
  useEffect(() => {
    if (activeTab === 'checkpoint' && currentModule && quizQuestions.length === 0) {
      setQuizLoading(true)
      const realConceptIds = currentModule.concepts
        .filter(c => c.id > 0)
        .map(c => c.id)
        .join(',')

      const url = `/api/chapters/${chapterId}/sub-branch-quiz?conceptIds=${realConceptIds}&subCategory=${encodeURIComponent(currentModule.subCategoryName)}`
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (data.questions) {
            setQuizQuestions(data.questions)
          }
        })
        .catch(err => console.error('Failed to load sub-branch quiz', err))
        .finally(() => setQuizLoading(false))
    }
  }, [activeTab, currentModule, chapterId, quizQuestions.length])

  // Keyboard navigation for Flashcards
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (activeModalSlug) return
      if (activeTab === 'cards') {
        if (e.key === 'ArrowRight' && activeCardIdx < currentModule.concepts.length - 1) {
          setActiveCardIdx(prev => prev + 1)
        } else if (e.key === 'ArrowLeft' && activeCardIdx > 0) {
          setActiveCardIdx(prev => prev - 1)
        }
      }
    },
    [activeModalSlug, activeTab, activeCardIdx, currentModule?.concepts.length]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const activeCardConcept = currentModule?.concepts[activeCardIdx]

  // Filtered concepts in the Comparative Matrix
  const filteredMatrixConcepts = useMemo(() => {
    if (!currentModule) return []
    if (!matrixFilter.trim()) return currentModule.concepts
    const q = matrixFilter.toLowerCase().trim()
    return currentModule.concepts.filter(
      c =>
        c.term.toLowerCase().includes(q) ||
        c.definition?.toLowerCase().includes(q) ||
        c.examTraps?.toLowerCase().includes(q)
    )
  }, [currentModule, matrixFilter])

  const handleSelectOption = (questionId: number, option: string) => {
    if (userAnswers[questionId]) return // Already answered
    setUserAnswers(prev => ({ ...prev, [questionId]: option }))
    setExpandedAnswers(prev => ({ ...prev, [questionId]: true }))
  }

  const quizScore = useMemo(() => {
    let correct = 0
    quizQuestions.forEach(q => {
      if (userAnswers[q.id] === q.correctAnswer) correct++
    })
    return correct
  }, [quizQuestions, userAnswers])

  const handleNextModule = () => {
    if (activeModuleIdx < modules.length - 1) {
      setActiveModuleIdx(prev => prev + 1)
      window.scrollTo({ top: 120, behavior: 'smooth' })
    }
  }

  const handlePrevModule = () => {
    if (activeModuleIdx > 0) {
      setActiveModuleIdx(prev => prev - 1)
      window.scrollTo({ top: 120, behavior: 'smooth' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Mode Toggle */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                Interactive Tutorial Course
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                Module {activeModuleIdx + 1} of {modules.length}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {currentModule?.subCategoryName}
            </h2>
          </div>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <Menu className="w-4 h-4" />
            Curriculum
          </button>

          <button
            onClick={onSwitchToMindMap}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-100 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4 text-emerald-500" />
            <span>Switch to Bird&apos;s-Eye Mind Map</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Curriculum Sidebar + Right Active Lesson Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Curriculum Sidebar (Desktop & Mobile Drawer) */}
        <div
          className={`lg:col-span-4 xl:col-span-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs space-y-4 ${
            sidebarOpen ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 px-2">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Course Curriculum
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {modules.length} Bite-Sized Modules
              </p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-[640px] overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
            {modules.map((m, idx) => {
              const isActive = idx === activeModuleIdx
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveModuleIdx(idx)
                    setSidebarOpen(false)
                  }}
                  className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer flex items-start gap-3 ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-950/60 dark:to-teal-950/40 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 font-bold shadow-2xs'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-medium border border-transparent'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5 ${
                      isActive
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate font-bold leading-tight">
                      {m.subCategoryName}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {m.branchName}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px]">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {m.concepts.length} terms
                      </span>
                      {m.totalQuestions > 0 && (
                        <span className="text-slate-400">
                          • {m.totalQuestions} MCQs
                        </span>
                      )}
                    </div>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-emerald-500 shrink-0 self-center" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right Active Lesson Player Area */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Module Controls & Tab Switcher */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  {currentModule?.branchName}
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {currentModule?.subCategoryName}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Covering {currentModule?.concepts.length} essential exam entities and terminology.
                </p>
              </div>

              {/* View Mode Tabs within Lesson */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl self-start sm:self-auto">
                <button
                  onClick={() => setActiveTab('matrix')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'matrix'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>📊 Cheat Sheet Matrix</span>
                </button>
                <button
                  onClick={() => setActiveTab('cards')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'cards'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>📇 Step-by-Step Cards</span>
                </button>
                <button
                  onClick={() => setActiveTab('checkpoint')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'checkpoint'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>🎯 Recall Quiz</span>
                </button>
              </div>
            </div>

            {/* TAB 1: COMPARATIVE CHEAT SHEET MATRIX (Option 4) */}
            {activeTab === 'matrix' && (
              <div className="space-y-4">
                {/* Search within matrix */}
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={matrixFilter}
                      onChange={e => setMatrixFilter(e.target.value)}
                      placeholder={`Filter ${currentModule?.concepts.length} terms in this topic...`}
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Showing {filteredMatrixConcepts.length} of {currentModule?.concepts.length}
                  </span>
                </div>

                {/* Matrix Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-black uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4 w-1/4">Entity / Keyword</th>
                          <th className="py-3 px-4 w-1/2">Core Exam Concept (1-Liner)</th>
                          <th className="py-3 px-4 w-1/4">High-Yield Exam Trap</th>
                          <th className="py-3 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                        {filteredMatrixConcepts.map((concept, cIdx) => (
                          <tr
                            key={cIdx}
                            onClick={() => setActiveModalSlug(concept.slug)}
                            className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer group"
                          >
                            {/* Term & Thumbnail */}
                            <td className="py-3 px-4 align-top">
                              <div className="flex items-start gap-2.5">
                                {concept.imageUrl ? (
                                  <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={concept.thumbnailUrl || concept.imageUrl}
                                      alt={concept.term}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-lg shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-[10px] font-bold">
                                    {cIdx + 1}
                                  </div>
                                )}
                                <div>
                                  <span className="font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                    {concept.term}
                                  </span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {concept.imageUrl && (
                                      <span title="Authentic photo available" className="text-[10px]">
                                        🖼️
                                      </span>
                                    )}
                                    {concept.videoUrl && (
                                      <span title="Clinical demo video available" className="text-[10px]">
                                        ▶️
                                      </span>
                                    )}
                                    {(concept._count?.questions ?? 0) > 0 && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                                        {concept._count?.questions} MCQs
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 1-Line Definition */}
                            <td className="py-3 px-4 text-slate-700 dark:text-slate-300 leading-relaxed align-top">
                              {concept.definition || 'Key technical concept for examination.'}
                            </td>

                            {/* Exam Trap */}
                            <td className="py-3 px-4 align-top">
                              {concept.examTraps ? (
                                <span className="inline-block p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[11px] font-semibold border border-amber-200/60 dark:border-amber-800/40">
                                  ⚠️ {concept.examTraps.length > 90 ? concept.examTraps.substring(0, 90) + '...' : concept.examTraps}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Direct fact recall</span>
                              )}
                            </td>

                            {/* Action Button */}
                            <td className="py-3 px-3 text-right align-top">
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  setActiveModalSlug(concept.slug)
                                }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-emerald-600 group-hover:text-white transition-all cursor-pointer whitespace-nowrap"
                              >
                                Dossier
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: STEP-BY-STEP FLASHCARDS (Option 3) */}
            {activeTab === 'cards' && activeCardConcept && (
              <div className="space-y-6">
                {/* Progress bar inside card */}
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>
                    Concept {activeCardIdx + 1} of {currentModule.concepts.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-medium">Use ← and → arrow keys</span>
                  </div>
                </div>

                {/* The Flash Card */}
                <div className="p-6 rounded-3xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-5">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                        {currentModule.subCategoryName}
                      </span>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {activeCardConcept.term}
                      </h2>
                    </div>

                    <button
                      onClick={() => setActiveModalSlug(activeCardConcept.slug)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                    >
                      <span>Full Exam Dossier</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Visual Image if available */}
                  {activeCardConcept.imageUrl && (
                    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-72 bg-slate-100 flex items-center justify-center relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={activeCardConcept.imageUrl}
                        alt={activeCardConcept.term}
                        className="w-full h-full object-cover max-h-72"
                      />
                      <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-xs flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        {activeCardConcept.imageCaption || activeCardConcept.term}
                      </div>
                    </div>
                  )}

                  {/* Core 1-Line Definition Callout */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-800/50 shadow-2xs">
                    <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 block mb-1">
                      Core Definition / Essential Takeaway
                    </span>
                    <p className="text-base font-bold text-slate-900 dark:text-white leading-relaxed">
                      {activeCardConcept.definition || 'Key examination concept.'}
                    </p>
                  </div>

                  {/* High Yield Exam Trap */}
                  {activeCardConcept.examTraps && (
                    <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                      <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 block mb-1">
                        ⚠️ High-Probability Exam Trap & Differentiator
                      </span>
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                        {activeCardConcept.examTraps}
                      </p>
                    </div>
                  )}

                  {/* Video demo link if available */}
                  {activeCardConcept.videoUrl && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-red-50/80 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40 text-xs">
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold">
                        <Play className="w-4 h-4 fill-current" />
                        <span>Clinical / Practical Video Demo Available</span>
                      </div>
                      <a
                        href={activeCardConcept.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-red-600 hover:underline flex items-center gap-1"
                      >
                        Watch on YouTube <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Card Navigation Controls */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    disabled={activeCardIdx === 0}
                    onClick={() => setActiveCardIdx(prev => prev - 1)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer shadow-2xs"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous Concept
                  </button>

                  <span className="text-xs font-bold text-slate-500">
                    {activeCardIdx + 1} / {currentModule.concepts.length}
                  </span>

                  <button
                    disabled={activeCardIdx === currentModule.concepts.length - 1}
                    onClick={() => setActiveCardIdx(prev => prev + 1)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-700 cursor-pointer shadow-2xs"
                  >
                    Next Concept
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: CHECKPOINT QUIZ (Option 3 Recall Test) */}
            {activeTab === 'checkpoint' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-500" />
                      Mini Recall Checkpoint: {currentModule.subCategoryName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Real previous exam questions reverse-mined for these concepts.
                    </p>
                  </div>
                  {quizQuestions.length > 0 && Object.keys(userAnswers).length > 0 && (
                    <div className="px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black text-xs">
                      Score: {quizScore} / {quizQuestions.length}
                    </div>
                  )}
                </div>

                {quizLoading ? (
                  <div className="py-16 text-center text-slate-400 space-y-2">
                    <Sparkles className="w-6 h-6 animate-pulse mx-auto text-emerald-500" />
                    <p className="text-xs font-semibold">Loading authentic exam checkpoint...</p>
                  </div>
                ) : quizQuestions.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-6">
                    <HelpCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-bold text-sm">No specific MCQs mined for this module yet.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Proceed to the next module or review the cheat sheet matrix above.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {quizQuestions.map((q, qIdx) => {
                      const selected = userAnswers[q.id]
                      const isAnswered = Boolean(selected)
                      const isCorrect = selected === q.correctAnswer

                      return (
                        <div
                          key={q.id}
                          className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4"
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                              {qIdx + 1}
                            </span>
                            <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                              {q.questionText}
                            </p>
                          </div>

                          {/* Options */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-8">
                            {(['A', 'B', 'C', 'D', 'E'] as const).map(optKey => {
                              const optText = (q as any)[`option${optKey}`]
                              if (!optText) return null

                              let btnStyle =
                                'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500'

                              if (isAnswered) {
                                if (optKey === q.correctAnswer) {
                                  btnStyle =
                                    'bg-emerald-500 text-white border-emerald-600 font-bold shadow-xs'
                                } else if (selected === optKey) {
                                  btnStyle =
                                    'bg-rose-500 text-white border-rose-600 font-bold shadow-xs'
                                } else {
                                  btnStyle = 'opacity-50 border-slate-200 dark:border-slate-800'
                                }
                              }

                              return (
                                <button
                                  key={optKey}
                                  disabled={isAnswered}
                                  onClick={() => handleSelectOption(q.id, optKey)}
                                  className={`p-3 rounded-xl border text-left text-xs font-medium transition-all flex items-start gap-2.5 cursor-pointer ${btnStyle}`}
                                >
                                  <span className="font-black text-[11px] uppercase shrink-0">
                                    {optKey}.
                                  </span>
                                  <span className="flex-1">{optText}</span>
                                </button>
                              )
                            })}
                          </div>

                          {/* Explanation */}
                          {isAnswered && (
                            <div
                              className={`p-4 rounded-xl border text-xs ml-8 space-y-1.5 ${
                                isCorrect
                                  ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                  : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 font-black uppercase text-[10px]">
                                {isCorrect ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Correct!</span>
                                  </>
                                ) : (
                                  <span>Incorrect (Correct answer: {q.correctAnswer})</span>
                                )}
                              </div>
                              <p className="leading-relaxed font-medium">
                                {q.simpleExplanation || q.explanation || 'Exam reference explanation.'}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Completion Card */}
                    {Object.keys(userAnswers).length === quizQuestions.length && (
                      <div className="p-6 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white text-center space-y-3 shadow-md">
                        <Award className="w-10 h-10 mx-auto text-amber-300" />
                        <h4 className="text-xl font-black">
                          Module {activeModuleIdx + 1} Checkpoint Complete!
                        </h4>
                        <p className="text-xs text-emerald-100 max-w-md mx-auto">
                          You scored {quizScore} out of {quizQuestions.length}. Keep the momentum going!
                        </p>
                        {activeModuleIdx < modules.length - 1 && (
                          <button
                            onClick={handleNextModule}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-emerald-700 font-extrabold text-xs shadow-sm hover:bg-emerald-50 transition-all cursor-pointer"
                          >
                            <span>Next: {modules[activeModuleIdx + 1].subCategoryName}</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Sticky Module Paging Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-4">
            <button
              disabled={activeModuleIdx === 0}
              onClick={handlePrevModule}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous:</span>
              <span className="truncate max-w-[120px]">
                {activeModuleIdx > 0 ? modules[activeModuleIdx - 1].subCategoryName : 'Start'}
              </span>
            </button>

            <div className="text-center">
              <span className="text-xs font-black text-slate-900 dark:text-white">
                Module {activeModuleIdx + 1} of {modules.length}
              </span>
              <div className="w-32 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1 mx-auto">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${((activeModuleIdx + 1) / modules.length) * 100}%` }}
                />
              </div>
            </div>

            <button
              disabled={activeModuleIdx === modules.length - 1}
              onClick={handleNextModule}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-700 cursor-pointer shadow-2xs"
            >
              <span className="truncate max-w-[120px]">
                {activeModuleIdx < modules.length - 1
                  ? modules[activeModuleIdx + 1].subCategoryName
                  : 'End'}
              </span>
              <span className="hidden sm:inline">:Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Dossier for deep dive */}
      <ConceptDossierModal
        slug={activeModalSlug}
        chapterId={chapterId}
        onClose={() => setActiveModalSlug(null)}
        onSelectRelatedTerm={termSlug => setActiveModalSlug(termSlug)}
      />
    </div>
  )
}
