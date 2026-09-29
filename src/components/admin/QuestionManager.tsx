'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Edit, Save, X, Loader2 } from 'lucide-react'

type Question = {
  id: number
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
  topic: string | null
  explanation: string | null
  correctAnswer: string
  quizId: number
}

export function QuestionManager({ initialQuestions }: { initialQuestions: Question[] }) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Partial<Question>>({})
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const router = useRouter()

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [questionToDelete, setQuestionToDelete] = useState<number | null>(null)

  const handleEditClick = (q: Question) => {
    setEditingId(q.id)
    setEditForm({ ...q })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const handleSave = async (id: number) => {
    setLoadingId(id)
    try {
      const res = await fetch(`/api/questions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      if (res.ok) {
        const data = await res.json()
        setQuestions(questions.map(q => q.id === id ? data.question : q))
        setEditingId(null)
        router.refresh()
      } else {
        alert('Failed to update question')
      }
    } catch (error) {
      alert('An error occurred while saving')
    } finally {
      setLoadingId(null)
    }
  }

  const handleDeleteClick = (id: number) => {
    setQuestionToDelete(id)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!questionToDelete) return

    setLoadingId(questionToDelete)
    setIsDeleteModalOpen(false)
    try {
      const res = await fetch(`/api/questions/${questionToDelete}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setQuestions(questions.filter(q => q.id !== questionToDelete))
        router.refresh()
      } else {
        alert('Failed to delete question')
      }
    } catch (error) {
      alert('An error occurred while deleting')
    } finally {
      setLoadingId(null)
      setQuestionToDelete(null)
    }
  }

  return (
    <>
      <div className="space-y-6">
        {questions.map((q, index) => {
          const isEditing = editingId === q.id
          const isLoading = loadingId === q.id

          if (isEditing) {
            return (
              <div key={q.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-blue-500">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Question Text</label>
                    <textarea
                      value={editForm.questionText || ''}
                      onChange={e => setEditForm({ ...editForm, questionText: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-transparent"
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Option A</label>
                      <input
                        type="text"
                        value={editForm.optionA || ''}
                        onChange={e => setEditForm({ ...editForm, optionA: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Explanation A</label>
                      <input
                        type="text"
                        value={editForm.explanationA || ''}
                        onChange={e => setEditForm({ ...editForm, explanationA: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Option B</label>
                      <input
                        type="text"
                        value={editForm.optionB || ''}
                        onChange={e => setEditForm({ ...editForm, optionB: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Explanation B</label>
                      <input
                        type="text"
                        value={editForm.explanationB || ''}
                        onChange={e => setEditForm({ ...editForm, explanationB: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Option C</label>
                      <input
                        type="text"
                        value={editForm.optionC || ''}
                        onChange={e => setEditForm({ ...editForm, optionC: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Explanation C</label>
                      <input
                        type="text"
                        value={editForm.explanationC || ''}
                        onChange={e => setEditForm({ ...editForm, explanationC: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Option D</label>
                      <input
                        type="text"
                        value={editForm.optionD || ''}
                        onChange={e => setEditForm({ ...editForm, optionD: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Explanation D</label>
                      <input
                        type="text"
                        value={editForm.explanationD || ''}
                        onChange={e => setEditForm({ ...editForm, explanationD: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Option E (Optional)</label>
                      <input
                        type="text"
                        value={editForm.optionE || ''}
                        onChange={e => setEditForm({ ...editForm, optionE: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Explanation E</label>
                      <input
                        type="text"
                        value={editForm.explanationE || ''}
                        onChange={e => setEditForm({ ...editForm, explanationE: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correct Answer (A, B, C, D, E)</label>
                      <select
                        value={editForm.correctAnswer || ''}
                        onChange={e => setEditForm({ ...editForm, correctAnswer: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-transparent"
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                        <option value="E">E</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topic</label>
                      <input
                        type="text"
                        value={editForm.topic || ''}
                        onChange={e => setEditForm({ ...editForm, topic: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Overall Explanation</label>
                    <textarea
                      value={editForm.explanation || ''}
                      onChange={e => setEditForm({ ...editForm, explanation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-transparent"
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={handleCancelEdit}
                      disabled={isLoading}
                      className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSave(q.id)}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )
          }

          return (
            <div key={q.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex gap-4">
              <div className="text-gray-400 font-bold shrink-0">{index + 1}.</div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{q.questionText}</h3>
                {q.topic && <span className="inline-block px-2 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded mb-4">{q.topic}</span>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-4">
                  <div className={`p-2 rounded border ${q.correctAnswer === 'A' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300' : 'border-gray-100 dark:border-gray-700'}`}>
                    <span className="font-bold mr-2">A:</span> {q.optionA}
                  </div>
                  <div className={`p-2 rounded border ${q.correctAnswer === 'B' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300' : 'border-gray-100 dark:border-gray-700'}`}>
                    <span className="font-bold mr-2">B:</span> {q.optionB}
                  </div>
                  <div className={`p-2 rounded border ${q.correctAnswer === 'C' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300' : 'border-gray-100 dark:border-gray-700'}`}>
                    <span className="font-bold mr-2">C:</span> {q.optionC}
                  </div>
                  <div className={`p-2 rounded border ${q.correctAnswer === 'D' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300' : 'border-gray-100 dark:border-gray-700'}`}>
                    <span className="font-bold mr-2">D:</span> {q.optionD}
                  </div>
                  {q.optionE && (
                    <div className={`p-2 rounded border ${q.correctAnswer === 'E' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300' : 'border-gray-100 dark:border-gray-700'}`}>
                      <span className="font-bold mr-2">E:</span> {q.optionE}
                    </div>
                  )}
                </div>
                {q.explanation && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                    <span className="font-bold">Explanation:</span> {q.explanation}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => handleEditClick(q)}
                  disabled={isLoading}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                  title="Edit Question"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDeleteClick(q.id)}
                  disabled={isLoading}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete Question"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Question?</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                Are you sure you want to delete this question? This action cannot be undone.
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false)
                    setQuestionToDelete(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Yes, delete question
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
