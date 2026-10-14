'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { 
  Search, 
  Sparkles, 
  ChevronRight, 
  GitBranch, 
  Network, 
  ChevronDown,
  BookOpen,
  ArrowRight,
  Info,
  Layers,
  HelpCircle
} from 'lucide-react'
import { ConceptDossierModal } from './ConceptDossierModal'
import { CourseTutorialView, ConceptSummary } from './CourseTutorialView'

interface MindMapEdge {
  from: string
  to: string
  relationType: string
  label?: string
}

interface MindMapCategory {
  name: string
  description?: string
  subCategories: {
    name: string
    keywords: string[]
  }[]
}

interface ChapterMindMapViewProps {
  chapterId: number
  chapterName: string
  mindMapTree: {
    categories: MindMapCategory[]
    crossBranchEdges?: MindMapEdge[]
    allKeywords: string[]
  } | null
  existingConcepts: ConceptSummary[]
}

export function ChapterMindMapView({
  chapterId,
  chapterName,
  mindMapTree,
  existingConcepts
}: ChapterMindMapViewProps) {
  const [viewMode, setViewMode] = useState<'mindmap' | 'tutorial'>('mindmap')
  const [selectedTutorialSubCategory, setSelectedTutorialSubCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [collapsedBranches, setCollapsedBranches] = useState<Record<string, boolean>>({})

  // Tooltip hover state
  const [hoveredConcept, setHoveredConcept] = useState<{
    concept: ConceptSummary
    x: number
    y: number
  } | null>(null)

  // Map of created concept slugs and objects for quick lookup
  const conceptMap = useMemo(() => {
    const map = new Map<string, ConceptSummary>()
    existingConcepts.forEach(c => {
      map.set(c.term.toLowerCase().trim(), c)
    })
    return map
  }, [existingConcepts])

  const toggleBranch = (key: string) => {
    setCollapsedBranches(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Filtered categories based on search or category selection
  const filteredCategories = useMemo(() => {
    if (!mindMapTree?.categories) return []

    return mindMapTree.categories
      .filter(cat => {
        if (selectedCategory && cat.name !== selectedCategory) return false
        return true
      })
      .map(cat => {
        if (!searchQuery.trim()) return cat

        const q = searchQuery.toLowerCase()
        const matchesCategoryName = cat.name.toLowerCase().includes(q)

        const filteredSub = cat.subCategories
          .map(sub => {
            const matchesSubName = sub.name.toLowerCase().includes(q)
            const filteredKeywords = sub.keywords.filter(kw => 
              kw.toLowerCase().includes(q) || matchesCategoryName || matchesSubName
            )
            return {
              ...sub,
              keywords: filteredKeywords
            }
          })
          .filter(sub => sub.keywords.length > 0)

        return {
          ...cat,
          subCategories: filteredSub
        }
      })
      .filter(cat => cat.subCategories.length > 0)
  }, [mindMapTree, selectedCategory, searchQuery])

  const handleKeywordClick = (keyword: string) => {
    setHoveredConcept(null)
    const entry = conceptMap.get(keyword.toLowerCase().trim())
    if (entry) {
      setActiveSlug(entry.slug)
    } else {
      // Slugify fallback
      const fallbackSlug = keyword.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-')
      setActiveSlug(fallbackSlug)
    }
  }

  const handleOpenTutorialSub = (subName: string) => {
    setHoveredConcept(null)
    setSelectedTutorialSubCategory(subName)
    setViewMode('tutorial')
    window.scrollTo({ top: 100, behavior: 'smooth' })
  }

  if (!mindMapTree || !mindMapTree.categories || mindMapTree.categories.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <Network className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Mind Map is Ready to be Generated
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
          The concept taxonomy for &ldquo;{chapterName}&rdquo; can be synthesized from its MCQs. Admins can trigger the initial mind map generation from the dashboard.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 relative">
      {/* View Mode Toggle: Mind Map vs Guided Course Tutorial */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2">
            Study Mode:
          </span>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => {
                setViewMode('mindmap')
                setHoveredConcept(null)
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'mindmap'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Network className="w-4 h-4" />
              <span>🗺️ Mind Map</span>
            </button>
            <button
              onClick={() => {
                setViewMode('tutorial')
                setHoveredConcept(null)
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'tutorial'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>📖 Course Tutorial</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Live
              </span>
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold pr-2">
          {viewMode === 'mindmap'
            ? 'Hover keyword for 1-liner • Click to inspect dossier'
            : 'Step-by-step curriculum • Comparative Matrix & Recall quizzes'}
        </div>
      </div>

      {/* VIEW MODE 1: GUIDED COURSE TUTORIAL (Options 1, 3, & 4) */}
      {viewMode === 'tutorial' && (
        <CourseTutorialView
          chapterId={chapterId}
          chapterName={chapterName}
          categories={mindMapTree.categories}
          allConcepts={existingConcepts}
          initialSubCategory={selectedTutorialSubCategory}
          onSwitchToMindMap={() => setViewMode('mindmap')}
        />
      )}

      {/* VIEW MODE 2: BIRD'S-EYE MIND MAP VIEW */}
      {viewMode === 'mindmap' && (
        <>
          {/* Search and Category Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={`Search across ${mindMapTree.allKeywords?.length || 0} keywords in ${chapterName}...`}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 text-xs font-semibold no-scrollbar">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === null
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All Categories ({mindMapTree.categories.length})
              </button>
              {mindMapTree.categories.map((cat, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                  className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat.name
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Mind Map Tree Hierarchy Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredCategories.map((category, catIdx) => {
              const isCollapsed = collapsedBranches[`cat-${catIdx}`]
              const totalKeywordsInCat = category.subCategories.reduce((acc, sub) => acc + sub.keywords.length, 0)

              return (
                <div 
                  key={catIdx}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col transition-all hover:border-emerald-300 dark:hover:border-emerald-800/80"
                >
                  {/* Category Header */}
                  <div 
                    onClick={() => toggleBranch(`cat-${catIdx}`)}
                    className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                        {catIdx + 1}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                          {category.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {totalKeywordsInCat} keywords • {category.subCategories.length} sub-branches
                        </p>
                      </div>
                    </div>

                    <div className="text-slate-400">
                      {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Subcategories and Keyword Badges */}
                  {!isCollapsed && (
                    <div className="p-5 space-y-5 flex-1">
                      {category.subCategories.map((sub, subIdx) => (
                        <div key={subIdx} className="space-y-2.5">
                          {/* Sub-branch header with Quick Launch to Tutorial */}
                          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 tracking-wide uppercase">
                              <GitBranch className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span className="truncate">{sub.name}</span>
                              <span className="text-slate-300 dark:text-slate-600">•</span>
                              <span className="text-[11px] font-medium lowercase text-slate-400 whitespace-nowrap">
                                {sub.keywords.length} terms
                              </span>
                            </div>

                            <button
                              onClick={() => handleOpenTutorialSub(sub.name)}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-200/70 dark:border-emerald-800/60 transition-all cursor-pointer group shrink-0"
                              title={`Study ${sub.name} in Course Tutorial`}
                            >
                              <span>Study Module</span>
                              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          </div>

                          {/* Keywords Cloud */}
                          <div className="flex flex-wrap gap-2 pt-0.5 pl-2 border-l-2 border-emerald-100 dark:border-emerald-950/80 ml-1.5">
                            {sub.keywords.map((kw, kwIdx) => {
                              const entry = conceptMap.get(kw.toLowerCase().trim())
                              const hasCapsule = Boolean(entry)
                              const qCount = entry?._count?.questions || 0

                              return (
                                <button
                                  key={kwIdx}
                                  onClick={() => handleKeywordClick(kw)}
                                  onMouseEnter={e => {
                                    if (entry && entry.definition) {
                                      const rect = e.currentTarget.getBoundingClientRect()
                                      setHoveredConcept({
                                        concept: entry,
                                        x: rect.left + rect.width / 2,
                                        y: rect.top + window.scrollY
                                      })
                                    }
                                  }}
                                  onMouseLeave={() => setHoveredConcept(null)}
                                  className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                    hasCapsule
                                      ? 'bg-slate-100 hover:bg-emerald-500 hover:text-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:hover:bg-emerald-600 shadow-2xs hover:shadow-sm'
                                      : 'bg-slate-50 hover:bg-slate-200/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400'
                                  }`}
                                >
                                  <span>{kw}</span>
                                  {entry?.imageUrl && (
                                    <span title="Reference image available" className="text-[10px] opacity-80 group-hover:opacity-100">
                                      🖼️
                                    </span>
                                  )}
                                  {entry?.videoUrl && (
                                    <span title="Practical demo video available" className="text-[10px] opacity-80 group-hover:opacity-100">
                                      ▶️
                                    </span>
                                  )}
                                  {qCount > 0 && (
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 group-hover:bg-white group-hover:text-emerald-700 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                                      {qCount}
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Cross-Branch Linked Sibling Relationships */}
          {mindMapTree.crossBranchEdges && mindMapTree.crossBranchEdges.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Crucial Cross-Branch & Adjacent Links for Competitive Exams
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {mindMapTree.crossBranchEdges.map((edge, idx) => (
                  <div 
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleKeywordClick(edge.from)}
                        className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        {edge.from}
                      </button>
                      <span className="text-slate-400">↔</span>
                      <button
                        onClick={() => handleKeywordClick(edge.to)}
                        className="font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                      >
                        {edge.to}
                      </button>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      {edge.relationType}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Floating 1-Line Definition Hover Card (Non-intrusive quick glance) */}
      {hoveredConcept && (
        <div
          style={{
            position: 'absolute',
            left: `${Math.min(Math.max(hoveredConcept.x, 160), (typeof window !== 'undefined' ? window.innerWidth : 800) - 160)}px`,
            top: `${hoveredConcept.y - 12}px`,
            transform: 'translate(-50%, -100%)'
          }}
          className="z-50 w-72 pointer-events-none p-3.5 rounded-2xl bg-slate-900/95 text-white shadow-2xl border border-slate-700/90 backdrop-blur-md space-y-1.5 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between">
            <span className="font-black text-xs text-emerald-400">
              {hoveredConcept.concept.term}
            </span>
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              {hoveredConcept.concept.imageUrl && <span>🖼️</span>}
              {hoveredConcept.concept.videoUrl && <span>▶️</span>}
              {(hoveredConcept.concept._count?.questions ?? 0) > 0 && (
                <span className="text-emerald-400 font-bold">
                  {hoveredConcept.concept._count?.questions} MCQs
                </span>
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-200 leading-snug font-medium">
            {hoveredConcept.concept.definition}
          </p>
          {hoveredConcept.concept.examTraps && (
            <p className="text-[10px] text-amber-300 font-semibold border-t border-slate-800 pt-1">
              ⚠️ {hoveredConcept.concept.examTraps.length > 70
                ? hoveredConcept.concept.examTraps.substring(0, 70) + '...'
                : hoveredConcept.concept.examTraps}
            </p>
          )}
        </div>
      )}

      {/* Slide-over / Modal for Keyword Detail */}
      <ConceptDossierModal
        slug={activeSlug}
        chapterId={chapterId}
        onClose={() => setActiveSlug(null)}
        onSelectRelatedTerm={termSlug => setActiveSlug(termSlug)}
      />
    </div>
  )
}
