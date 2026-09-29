'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  ChevronLeft, 
  Bookmark, 
  PlayCircle, 
  Trash2, 
  Search, 
  CheckCircle2, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  BookOpen,
  ArrowRight
} from 'lucide-react'

type BookmarkItem = {
  id: number
  questionId: number
  createdAt: Date | string
  question: {
    id: number
    questionText: string
    optionA: string
    optionB: string
    optionC: string
    optionD: string
    optionE?: string | null
    correctAnswer: string
    explanation?: string | null
    topic?: string | null
    quiz: {
      id: number
      name: string
      chapter: {
        id: number
        name: string
      }
    }
  }
}

type Props = {
  initialBookmarks: BookmarkItem[]
  userName: string | null
}

export default function BookmarksClient({ initialBookmarks, userName }: Props) {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(initialBookmarks)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChapter, setSelectedChapter] = useState<string>('all')
  const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({})
  const [removingId, setRemovingId] = useState<number | null>(null)

  // Unique chapters
  const chaptersMap = new Map<number, string>()
  bookmarks.forEach(b => {
    const ch = b.question?.quiz?.chapter
    if (ch) chaptersMap.set(ch.id, ch.name)
  })
  const chapterList = Array.from(chaptersMap.entries()).map(([id, name]) => ({ id, name }))

  // Filtered bookmarks
  const filteredBookmarks = bookmarks.filter(b => {
    const q = b.question
    if (!q) return false
    
    // Chapter filter
    if (selectedChapter !== 'all' && q.quiz?.chapter?.id.toString() !== selectedChapter) {
      return false
    }

    // Search query
    if (searchQuery.trim()) {
      const qText = q.questionText.toLowerCase()
      const quizName = q.quiz?.name.toLowerCase() || ''
      const chName = q.quiz?.chapter?.name.toLowerCase() || ''
      const search = searchQuery.toLowerCase()
      return qText.includes(search) || quizName.includes(search) || chName.includes(search)
    }

    return true
  })

  const toggleExpand = (qId: number) => {
    setExpandedIds(prev => ({ ...prev, [qId]: !prev[qId] }))
  }

  const handleRemove = async (questionId: number) => {
    setRemovingId(questionId)
    // Optimistic removal
    setBookmarks(prev => prev.filter(b => b.questionId !== questionId))

    try {
      await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId })
      })
    } catch (e) {
      console.error('Failed to remove bookmark', e)
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      {/* Top Header */}
      <header className="h-14 bg-white border-b border-gray-200 sticky top-0 z-20 flex items-center justify-between px-6 shadow-xs">
        <Link 
          href="/" 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-semibold transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full flex items-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            {bookmarks.length} {bookmarks.length === 1 ? 'Question' : 'Questions'} Marked
          </span>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-6 py-10 md:py-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-white/20 text-white backdrop-blur-xs">
                Exam Preparation
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
              <Bookmark className="w-8 h-8 fill-white/90 text-white" />
              <span>Revision Hub</span>
            </h1>
            <p className="text-amber-100 text-sm md:text-base max-w-xl font-medium">
              Review questions you marked as important or likely to appear in the exam. Practice them directly to strengthen your recall.
            </p>
          </div>

          {bookmarks.length > 0 && (
            <div className="shrink-0 flex flex-col sm:flex-row gap-3">
              <Link
                href="/bookmarks/practice"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-amber-700 hover:bg-amber-50 font-bold text-sm rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95"
              >
                <PlayCircle className="w-5 h-5 text-amber-600" />
                <span>Practice All ({bookmarks.length} Qs)</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-8 space-y-6">
        {/* Search & Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search marked questions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-gray-800 placeholder-gray-400"
            />
          </div>

          {/* Chapter Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedChapter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                selectedChapter === 'all'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Chapters ({bookmarks.length})
            </button>
            {chapterList.map(ch => {
              const count = bookmarks.filter(b => b.question?.quiz?.chapter?.id === ch.id).length
              return (
                <button
                  key={ch.id}
                  onClick={() => setSelectedChapter(ch.id.toString())}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                    selectedChapter === ch.id.toString()
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {ch.name} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* Content list */}
        {filteredBookmarks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs">
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4 text-amber-600">
              <Bookmark className="w-8 h-8" />
            </div>
            {bookmarks.length === 0 ? (
              <>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Questions Marked for Revision</h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
                  While taking Mock Tests or doing Practice sets, click the <span className="font-semibold text-amber-700">Mark to Revise</span> button on questions you want to revisit before the exam.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-xl transition-all shadow-sm"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Explore Quizzes & Practice</span>
                </Link>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Matching Questions</h3>
                <p className="text-gray-500 text-sm mb-4">
                  No marked questions match your filter or search query.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedChapter('all')
                  }}
                  className="text-amber-700 hover:underline text-xs font-bold"
                >
                  Clear all filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookmarks.map((item, index) => {
              const q = item.question
              const isExpanded = !!expandedIds[q.id]
              const isRemoving = removingId === q.id
              const options = [
                { k: 'A', v: q.optionA },
                { k: 'B', v: q.optionB },
                { k: 'C', v: q.optionC },
                { k: 'D', v: q.optionD },
                ...(q.optionE ? [{ k: 'E', v: q.optionE }] : [])
              ].filter(opt => opt.v && opt.v !== 'undefined')

              return (
                <div 
                  key={item.id}
                  className={`bg-white rounded-xl border border-gray-200 transition-all hover:border-gray-300 shadow-xs overflow-hidden ${
                    isRemoving ? 'opacity-40 pointer-events-none' : ''
                  }`}
                >
                  <div className="p-5 md:p-6">
                    {/* Header info */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          {q.quiz?.chapter?.name || 'Chapter'}
                        </span>
                        <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {q.quiz?.name || 'Quiz'}
                        </span>
                        {q.topic && (
                          <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            {q.topic}
                          </span>
                        )}
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={() => handleRemove(q.id)}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-red-600 px-2.5 py-1 rounded-md hover:bg-red-50 transition-colors"
                        title="Remove from revision list"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Unmark</span>
                      </button>
                    </div>

                    {/* Question text */}
                    <h3 className="text-base font-semibold text-gray-900 leading-relaxed mb-4">
                      {q.questionText}
                    </h3>

                    {/* Expand/Collapse Button */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <button
                        onClick={() => toggleExpand(q.id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            <span>Hide Answer & Explanation</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            <span>View Answer & Explanation</span>
                          </>
                        )}
                      </button>

                      <span className="text-[11px] text-gray-400">
                        Correct: Option {q.correctAnswer.toUpperCase()}
                      </span>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 animate-in fade-in duration-200">
                        {/* Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {options.map(opt => {
                            const isCorrect = opt.k === q.correctAnswer.toUpperCase()
                            return (
                              <div
                                key={opt.k}
                                className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs ${
                                  isCorrect
                                    ? 'bg-green-50 border-green-300 text-green-900 font-medium'
                                    : 'bg-gray-50/70 border-gray-200 text-gray-700'
                                }`}
                              >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                  isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                                }`}>
                                  {opt.k}
                                </span>
                                <span className="flex-1">{opt.v}</span>
                                {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />}
                              </div>
                            )
                          })}
                        </div>

                        {/* Explanation */}
                        {q.explanation && (
                          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-800 uppercase tracking-wide mb-1.5">
                              <HelpCircle className="w-3.5 h-3.5" />
                              <span>Exam Explanation</span>
                            </div>
                            <p className="text-xs md:text-sm text-blue-900 leading-relaxed font-normal">
                              {q.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
