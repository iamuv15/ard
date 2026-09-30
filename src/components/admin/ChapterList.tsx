'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Edit, Loader2, Save, X, ChevronDown, ChevronRight, FileQuestion, Combine, Check } from 'lucide-react'
import Link from 'next/link'

type Quiz = {
  id: number
  name: string
  cohort: string
  _count: {
    questions: number
  }
}

type Chapter = {
  id: number
  name: string
  cohort: string
  quizzes: Quiz[]
}

export function ChapterList({ initialChapters }: { initialChapters: Chapter[] }) {
  const [chapters, setChapters] = useState(initialChapters)
  const [deletingChapterId, setDeletingChapterId] = useState<number | null>(null)
  const [togglingCohortId, setTogglingCohortId] = useState<number | null>(null)
  const [expandedChapters, setExpandedChapters] = useState<Record<number, boolean>>({})
  
  // Quiz state
  const [togglingQuizCohortId, setTogglingQuizCohortId] = useState<number | null>(null)
  const [deletingQuizId, setDeletingQuizId] = useState<number | null>(null)
  const [editingQuizId, setEditingQuizId] = useState<number | null>(null)
  const [editQuizName, setEditQuizName] = useState('')
  const [savingQuizId, setSavingQuizId] = useState<number | null>(null)
  
  // Merge state
  const [mergingQuizId, setMergingQuizId] = useState<number | null>(null)
  const [mergeTargetQuizId, setMergeTargetQuizId] = useState<number | null>(null)
  const [isSavingMerge, setIsSavingMerge] = useState(false)

  const [isChapterDeleteModalOpen, setIsChapterDeleteModalOpen] = useState(false)
  const [chapterToDelete, setChapterToDelete] = useState<{id: number, name: string} | null>(null)
  
  const [isQuizDeleteModalOpen, setIsQuizDeleteModalOpen] = useState(false)
  const [quizToDelete, setQuizToDelete] = useState<{chapterId: number, id: number, name: string} | null>(null)

  const router = useRouter()

  const toggleChapter = (id: number) => {
    setExpandedChapters(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleChapterCohort = async (chapter: Chapter) => {
    setTogglingCohortId(chapter.id)
    try {
      const newCohort = chapter.cohort === 'ALPHA' ? 'BETA' : 'ALPHA'
      const res = await fetch(`/api/chapters/${chapter.id}/cohort`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cohort: newCohort })
      })
      if (res.ok) {
        setChapters(chapters.map(c => c.id === chapter.id ? { ...c, cohort: newCohort } : c))
        router.refresh()
      } else {
        alert('Failed to update cohort')
      }
    } catch (error) {
      alert('An error occurred')
    } finally {
      setTogglingCohortId(null)
    }
  }

  const toggleQuizCohort = async (chapterId: number, quiz: Quiz) => {
    setTogglingQuizCohortId(quiz.id)
    try {
      const newCohort = quiz.cohort === 'ALPHA' ? 'BETA' : 'ALPHA'
      const res = await fetch(`/api/quizzes/${quiz.id}/cohort`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cohort: newCohort })
      })
      if (res.ok) {
        setChapters(chapters.map(c => {
          if (c.id === chapterId) {
            return { ...c, quizzes: c.quizzes.map(q => q.id === quiz.id ? { ...q, cohort: newCohort } : q) }
          }
          return c
        }))
        router.refresh()
      } else {
        alert('Failed to update cohort')
      }
    } catch (error) {
      alert('An error occurred')
    } finally {
      setTogglingQuizCohortId(null)
    }
  }

  const confirmDeleteChapter = async () => {
    if (!chapterToDelete) return
    setDeletingChapterId(chapterToDelete.id)
    setIsChapterDeleteModalOpen(false)
    
    try {
      const res = await fetch(`/api/chapters/${chapterToDelete.id}`, { method: 'DELETE' })
      if (res.ok) {
        setChapters(chapters.filter(c => c.id !== chapterToDelete.id))
        router.refresh()
      } else {
        alert('Failed to delete chapter')
      }
    } catch (error) {
      alert('An error occurred')
    } finally {
      setDeletingChapterId(null)
      setChapterToDelete(null)
    }
  }

  const confirmDeleteQuiz = async () => {
    if (!quizToDelete) return
    setDeletingQuizId(quizToDelete.id)
    setIsQuizDeleteModalOpen(false)

    try {
      const res = await fetch(`/api/quizzes/${quizToDelete.id}`, { method: 'DELETE' })
      if (res.ok) {
        setChapters(chapters.map(c => {
          if (c.id === quizToDelete.chapterId) {
            return { ...c, quizzes: c.quizzes.filter(q => q.id !== quizToDelete.id) }
          }
          return c
        }))
        router.refresh()
      } else {
        alert('Failed to delete quiz')
      }
    } catch (error) {
      alert('An error occurred')
    } finally {
      setDeletingQuizId(null)
      setQuizToDelete(null)
    }
  }

  const handleEditQuiz = (quiz: Quiz) => {
    setEditingQuizId(quiz.id)
    setEditQuizName(quiz.name)
  }

  const handleSaveQuiz = async (chapterId: number, quizId: number) => {
    if (!editQuizName.trim()) return
    setSavingQuizId(quizId)
    
    try {
      const res = await fetch(`/api/quizzes/${quizId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editQuizName.trim() })
      })
      if (res.ok) {
        const data = await res.json()
        setChapters(chapters.map(c => {
          if (c.id === chapterId) {
            return { ...c, quizzes: c.quizzes.map(q => q.id === quizId ? { ...q, name: data.quiz.name } : q) }
          }
          return c
        }))
        setEditingQuizId(null)
        router.refresh()
      } else {
        alert('Failed to update quiz')
      }
    } catch (error) {
      alert('An error occurred')
    } finally {
      setSavingQuizId(null)
    }
  }

  const handleMergeQuiz = async (chapterId: number, sourceQuizId: number) => {
    if (!mergeTargetQuizId) return
    setIsSavingMerge(true)
    
    try {
      const res = await fetch(`/api/quizzes/${sourceQuizId}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetQuizId: mergeTargetQuizId })
      })
      if (res.ok) {
        const chapter = chapters.find(c => c.id === chapterId)
        const sourceQuiz = chapter?.quizzes.find(q => q.id === sourceQuizId)
        const numQuestions = sourceQuiz?._count.questions || 0

        setChapters(chapters.map(c => {
          if (c.id === chapterId) {
            const newQuizzes = c.quizzes
              .filter(q => q.id !== sourceQuizId)
              .map(q => q.id === mergeTargetQuizId ? { ...q, _count: { questions: q._count.questions + numQuestions } } : q)
            return { ...c, quizzes: newQuizzes }
          }
          return c
        }))
        setMergingQuizId(null)
        setMergeTargetQuizId(null)
        router.refresh()
      } else {
        alert('Failed to merge quiz')
      }
    } catch (error) {
      alert('An error occurred')
    } finally {
      setIsSavingMerge(false)
    }
  }

  if (chapters.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No chapters found. Create a chapter to get started.
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {chapters.map((chapter) => (
          <div key={chapter.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                <button onClick={() => toggleChapter(chapter.id)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors">
                  {expandedChapters[chapter.id] ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 dark:text-white cursor-pointer select-none" onClick={() => toggleChapter(chapter.id)}>{chapter.name}</h3>
                    <button 
                      onClick={() => toggleChapterCohort(chapter)}
                      disabled={togglingCohortId === chapter.id}
                      className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                        (chapter.cohort || 'BETA') === 'ALPHA' 
                          ? 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800' 
                          : 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                      }`}
                    >
                      {togglingCohortId === chapter.id ? '...' : (chapter.cohort || 'BETA')}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{chapter.quizzes.length} Quizzes</p>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setChapterToDelete({ id: chapter.id, name: chapter.name })
                  setIsChapterDeleteModalOpen(true)
                }}
                disabled={deletingChapterId === chapter.id}
                className="flex items-center justify-center w-8 h-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                title="Delete Chapter"
              >
                {deletingChapterId === chapter.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>

            {expandedChapters[chapter.id] && (
              <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 space-y-3">
                {chapter.quizzes.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No quizzes uploaded yet.</p>
                ) : (
                  chapter.quizzes.map(quiz => {
                    const isEditing = editingQuizId === quiz.id
                    const isSaving = savingQuizId === quiz.id
                    const isDeleting = deletingQuizId === quiz.id

                    return (
                      <div key={quiz.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-750">
                        <div className="flex items-center gap-3 flex-1 mr-4">
                          <FileQuestion className="w-5 h-5 text-blue-500" />
                          {isEditing ? (
                            <input
                              type="text"
                              value={editQuizName}
                              onChange={(e) => setEditQuizName(e.target.value)}
                              className="flex-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              autoFocus
                            />
                          ) : (
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900 dark:text-white">{quiz.name}</p>
                                <button 
                                  onClick={() => toggleQuizCohort(chapter.id, quiz)}
                                  disabled={togglingQuizCohortId === quiz.id}
                                  className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                                    (quiz.cohort || 'BETA') === 'ALPHA' 
                                      ? 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800' 
                                      : 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                                  }`}
                                >
                                  {togglingQuizCohortId === quiz.id ? '...' : (quiz.cohort || 'BETA')}
                                </button>
                              </div>
                              <p className="text-xs text-gray-500">{quiz._count.questions} questions</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveQuiz(chapter.id, quiz.id)}
                                disabled={isSaving}
                                className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors disabled:opacity-50"
                              >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => setEditingQuizId(null)}
                                disabled={isSaving}
                                className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : mergingQuizId === quiz.id ? (
                            <div className="flex items-center gap-1 sm:gap-2">
                              <select
                                value={mergeTargetQuizId || ''}
                                onChange={(e) => setMergeTargetQuizId(parseInt(e.target.value, 10))}
                                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white max-w-[120px] sm:max-w-[200px] md:max-w-[250px] truncate"
                              >
                                <option value="" disabled>Merge into...</option>
                                {chapter.quizzes.filter(q => q.id !== quiz.id).map(q => (
                                  <option key={q.id} value={q.id}>{q.name} ({q._count.questions} qs)</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleMergeQuiz(chapter.id, quiz.id)}
                                disabled={isSavingMerge || !mergeTargetQuizId}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50"
                                title="Confirm Merge"
                              >
                                {isSavingMerge ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => {
                                  setMergingQuizId(null)
                                  setMergeTargetQuizId(null)
                                }}
                                disabled={isSavingMerge}
                                className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <Link
                                href={`/admin/quiz/${quiz.id}`}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg text-xs font-medium transition-colors"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                Questions
                              </Link>
                              <button
                                onClick={() => handleEditQuiz(quiz)}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                title="Rename Quiz"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {chapter.quizzes.length > 1 && (
                                <button
                                  onClick={() => {
                                    setMergingQuizId(quiz.id)
                                    setMergeTargetQuizId(null)
                                  }}
                                  className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                                  title="Merge with another Quiz"
                                >
                                  <Combine className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setQuizToDelete({ chapterId: chapter.id, id: quiz.id, name: quiz.name })
                                  setIsQuizDeleteModalOpen(true)
                                }}
                                disabled={isDeleting}
                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                                title="Delete Quiz"
                              >
                                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Chapter Delete Modal */}
      {isChapterDeleteModalOpen && chapterToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Chapter?</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                Are you absolutely sure you want to delete the chapter <span className="font-semibold text-gray-900 dark:text-white">"{chapterToDelete.name}"</span>? 
                This action cannot be undone and will permanently delete all quizzes and questions inside it.
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => {
                    setIsChapterDeleteModalOpen(false)
                    setChapterToDelete(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteChapter}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Yes, delete chapter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Delete Modal */}
      {isQuizDeleteModalOpen && quizToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Quiz?</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                Are you sure you want to delete the quiz <span className="font-semibold text-gray-900 dark:text-white">"{quizToDelete.name}"</span>? 
                This action cannot be undone.
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => {
                    setIsQuizDeleteModalOpen(false)
                    setQuizToDelete(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteQuiz}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Yes, delete quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
