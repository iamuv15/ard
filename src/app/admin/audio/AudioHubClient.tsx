'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Headphones,
  ArrowLeft,
  Sparkles,
  Zap,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
  Layers,
  ChevronRight,
  Filter,
  Volume2,
  Brain
} from 'lucide-react'

export interface ChapterAudioSummary {
  id: number
  name: string
  cohort: string
  totalQuestions: number
  totalConcepts: number
  coveredConcepts: number
  pendingConcepts: number
  coveragePercent: number
  tracksCount: number
  durationSec: number
  storageBytes: number
}

interface AudioHubClientProps {
  chapters: ChapterAudioSummary[]
  globalStats: {
    totalChapters: number
    totalConcepts: number
    totalCoveredConcepts: number
    totalTracks: number
    totalDurationSec: number
    totalStorageBytes: number
  }
}

export function AudioHubClient({ chapters, globalStats }: AudioHubClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [cohortFilter, setCohortFilter] = useState<'ALL' | 'ALPHA' | 'BETA'>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEEDS_AUDIO' | 'COMPLETED' | 'EMPTY'>('ALL')

  const filteredChapters = chapters.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCohort = cohortFilter === 'ALL' || c.cohort === cohortFilter
    let matchesStatus = true
    if (statusFilter === 'NEEDS_AUDIO') {
      matchesStatus = c.pendingConcepts > 0
    } else if (statusFilter === 'COMPLETED') {
      matchesStatus = c.totalConcepts > 0 && c.pendingConcepts === 0
    } else if (statusFilter === 'EMPTY') {
      matchesStatus = c.totalConcepts === 0
    }
    return matchesSearch && matchesCohort && matchesStatus
  })

  const overallCoverage = globalStats.totalConcepts > 0
    ? Math.round((globalStats.totalCoveredConcepts / globalStats.totalConcepts) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search chapters by name..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Cohort Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            {(['ALL', 'ALPHA', 'BETA'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setCohortFilter(tab)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  cohortFilter === tab
                    ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab === 'ALL' ? 'All Cohorts' : tab}
              </button>
            ))}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'NEEDS_AUDIO', label: 'Needs Audio' },
              { id: 'COMPLETED', label: '100% Ready' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === tab.id
                    ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chapters Grid */}
      {filteredChapters.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <Headphones className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No chapters match your criteria</h3>
          <p className="text-xs text-slate-500">Try clearing the search input or switching filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredChapters.map(chapter => {
            const hasAudio = chapter.tracksCount > 0
            const isCompleted = chapter.totalConcepts > 0 && chapter.pendingConcepts === 0
            const hasNoConcepts = chapter.totalConcepts === 0

            return (
              <div
                key={chapter.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-purple-300 dark:hover:border-purple-800/80 transition-all space-y-4"
              >
                <div>
                  {/* Header badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {chapter.cohort}
                      </span>
                      <span className="text-xs text-slate-400">
                        {chapter.totalQuestions} Questions
                      </span>
                    </div>

                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                        <CheckCircle2 className="w-3 h-3" />
                        100% Audio Covered
                      </span>
                    ) : chapter.pendingConcepts > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                        <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
                        {chapter.pendingConcepts} Pending Concepts
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                        No Concepts Extracted
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    {chapter.name}
                  </h3>

                  {/* Concept Coverage Bar */}
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500 dark:text-slate-400">
                        {chapter.coveredConcepts} / {chapter.totalConcepts} concepts covered
                      </span>
                      <span className={`font-bold ${chapter.coveragePercent === 100 ? 'text-emerald-500' : 'text-purple-600 dark:text-purple-400'}`}>
                        {chapter.coveragePercent}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          chapter.coveragePercent === 100
                            ? 'bg-emerald-500'
                            : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                        }`}
                        style={{ width: `${chapter.coveragePercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Audio Stats */}
                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Headphones className="w-3.5 h-3.5 text-purple-500" />
                      {chapter.tracksCount} Tracks
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      {(chapter.durationSec / 60).toFixed(1)} mins
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
                      {(chapter.storageBytes / (1024 * 1024)).toFixed(1)} MB (Opus)
                    </span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/admin/chapter/${chapter.id}/concepts`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
                      title="View High-Yield Concepts & Mind Map"
                    >
                      <Brain className="w-3 h-3 text-emerald-500" />
                      <span>Concepts</span>
                    </Link>
                  </div>

                  <Link
                    href={`/admin/chapter/${chapter.id}/audio`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all"
                  >
                    <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                    <span>Open Bulk Studio</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
