'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Edit, Save, X, Loader2, Volume2, VolumeX, Sparkles, Check, HelpCircle, BookOpen } from 'lucide-react'
import { FormattedExplanation } from '@/components/FormattedExplanation'
import { AdminReEnrichButton } from '@/components/admin/AdminReEnrichButton'
import { sanitizeQuestionText } from '@/lib/sanitizeQuestion'

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
  simpleExplanation?: string | null
  voiceExplanation?: string | null
  voiceScriptVersion?: number | null
  correctAnswer: string
  quizId: number
}

export function QuestionManager({ initialQuestions }: { initialQuestions: Question[] }) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Partial<Question>>({})
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | 'missing-voice' | 'missing-simple'>('all')

  // Audio testing state
  const [audioPlayingId, setAudioPlayingId] = useState<number | null>(null)
  const [audioLoadingId, setAudioLoadingId] = useState<number | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)

  // AI draft generation state
  const [draftingTarget, setDraftingTarget] = useState<{ id: number; target: 'voice' | 'simple' } | null>(null)

  const router = useRouter()

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [questionToDelete, setQuestionToDelete] = useState<number | null>(null)

  const handleEditClick = (q: Question) => {
    handleStopTts()
    setEditingId(q.id)
    setEditForm({ ...q })
  }

  const handleCancelEdit = () => {
    handleStopTts()
    setEditingId(null)
    setEditForm({})
  }

  const handleStopTts = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current = null
    }
    setAudioPlayingId(null)
    setAudioLoadingId(null)
  }

  const handlePlayTts = async (id: number, text: string) => {
    if (audioPlayingId === id) {
      handleStopTts()
      return
    }

    if (!text || text.trim().length === 0) {
      alert('No script text to speak.')
      return
    }

    handleStopTts()
    setAudioLoadingId(id)

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'hi-IN-MadhurNeural' }),
      })

      if (!res.ok) throw new Error('TTS synthesis failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioElementRef.current = audio

      audio.onended = () => {
        setAudioPlayingId(null)
        audioElementRef.current = null
      }
      audio.onerror = () => {
        setAudioPlayingId(null)
        audioElementRef.current = null
      }

      await audio.play()
      setAudioPlayingId(id)
    } catch (e) {
      console.error('Error playing TTS:', e)
      alert('Failed to play TTS audio.')
    } finally {
      setAudioLoadingId(null)
    }
  }

  const handleAiDraft = async (id: number, target: 'voice' | 'simple') => {
    setDraftingTarget({ id, target })
    try {
      const res = await fetch(`/api/admin/questions/${id}/draft-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        if (target === 'voice' && data.voiceExplanation) {
          setEditForm(prev => ({ ...prev, voiceExplanation: data.voiceExplanation }))
        } else if (target === 'simple' && data.simpleExplanation) {
          setEditForm(prev => ({ ...prev, simpleExplanation: data.simpleExplanation }))
        }
      } else {
        alert(data.error || 'Failed to generate AI draft')
      }
    } catch (e) {
      alert('Network error while drafting script')
    } finally {
      setDraftingTarget(null)
    }
  }

  const handleSave = async (id: number) => {
    handleStopTts()
    setLoadingId(id)
    try {
      const res = await fetch(`/api/questions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      if (res.ok) {
        const data = await res.json()
        setQuestions(questions.map(q => q.id === id ? { ...q, ...data.question } : q))
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
    handleStopTts()
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

  const missingVoiceCount = questions.filter(q => !q.voiceExplanation).length
  const missingSimpleCount = questions.filter(q => !q.simpleExplanation).length

  const filteredQuestions = questions.filter(q => {
    if (filter === 'missing-voice') return !q.voiceExplanation
    if (filter === 'missing-simple') return !q.simpleExplanation
    return true
  })

  return (
    <>
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-3">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          All Questions ({questions.length})
        </button>

        <button
          onClick={() => setFilter('missing-voice')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'missing-voice'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950'
          }`}
        >
          <span>🎙️ Missing Voice Script</span>
          <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
            {missingVoiceCount}
          </span>
        </button>

        <button
          onClick={() => setFilter('missing-simple')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'missing-simple'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950'
          }`}
        >
          <span>💡 Missing Easy Explanation</span>
          <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
            {missingSimpleCount}
          </span>
        </button>
      </div>

      <div className="space-y-6">
        {filteredQuestions.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 font-medium text-sm">No questions match this filter!</p>
          </div>
        ) : filteredQuestions.map((q, index) => {
          const isEditing = editingId === q.id
          const isLoading = loadingId === q.id
          const isPlayingThis = audioPlayingId === q.id
          const isLoadingAudioThis = audioLoadingId === q.id

          if (isEditing) {
            return (
              <div key={q.id} className="bg-white dark:bg-gray-800 p-6 lg:p-8 rounded-2xl shadow-md border-2 border-indigo-500 animate-in fade-in duration-200">
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      Editing Question #{q.id}
                    </span>
                    <button onClick={handleCancelEdit} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Question Text</label>
                    <textarea
                      value={editForm.questionText || ''}
                      onChange={e => setEditForm({ ...editForm, questionText: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-transparent text-sm leading-relaxed"
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Option A</label>
                      <input
                        type="text"
                        value={editForm.optionA || ''}
                        onChange={e => setEditForm({ ...editForm, optionA: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Option B</label>
                      <input
                        type="text"
                        value={editForm.optionB || ''}
                        onChange={e => setEditForm({ ...editForm, optionB: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Option C</label>
                      <input
                        type="text"
                        value={editForm.optionC || ''}
                        onChange={e => setEditForm({ ...editForm, optionC: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Option D</label>
                      <input
                        type="text"
                        value={editForm.optionD || ''}
                        onChange={e => setEditForm({ ...editForm, optionD: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Option E (Optional)</label>
                      <input
                        type="text"
                        value={editForm.optionE || ''}
                        onChange={e => setEditForm({ ...editForm, optionE: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Correct Answer</label>
                        <select
                          value={editForm.correctAnswer || 'A'}
                          onChange={e => setEditForm({ ...editForm, correctAnswer: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-transparent font-bold"
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                          <option value="E">E</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Topic</label>
                        <input
                          type="text"
                          value={editForm.topic || ''}
                          onChange={e => setEditForm({ ...editForm, topic: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 🎙️ Dedicated Voice Tutor Script Editor */}
                  <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                            Voice Tutor Script (Edge-TTS Spoken Explanation)
                          </h4>
                        </div>
                        <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 mt-0.5">
                          Spoken in conversational Hinglish. Use Devanagari for grammar and Latin letters for technical terms.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAiDraft(q.id, 'voice')}
                          disabled={draftingTarget?.id === q.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          {draftingTarget?.id === q.id && draftingTarget.target === 'voice' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                          )}
                          <span>Auto-Draft Script with AI</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePlayTts(q.id, editForm.voiceExplanation || '')}
                          disabled={isLoadingAudioThis || !editForm.voiceExplanation}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          {isLoadingAudioThis ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isPlayingThis ? (
                            <VolumeX className="w-3.5 h-3.5 text-red-600" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                          )}
                          <span>{isPlayingThis ? 'Stop' : 'Test with Edge-TTS'}</span>
                        </button>
                      </div>
                    </div>

                    <textarea
                      value={editForm.voiceExplanation || ''}
                      onChange={e => setEditForm({ ...editForm, voiceExplanation: e.target.value })}
                      placeholder="e.g. Is question mein seed drill ka main purpose uniform depth par seed placement ensure karna hai..."
                      className="w-full px-3.5 py-2.5 border border-indigo-200 dark:border-indigo-700 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-sm leading-relaxed"
                      rows={4}
                    />
                  </div>

                  {/* 💡 Dedicated Easy Explanation Editor */}
                  <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                            Easy Explanation (Simplified ELI5 Breakdown)
                          </h4>
                        </div>
                        <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                          Plain-language explanation displayed when students click &quot;Simplify Explanation&quot;.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAiDraft(q.id, 'simple')}
                        disabled={draftingTarget?.id === q.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                      >
                        {draftingTarget?.id === q.id && draftingTarget.target === 'simple' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                        )}
                        <span>Auto-Draft Easy Explanation</span>
                      </button>
                    </div>

                    <textarea
                      value={editForm.simpleExplanation || ''}
                      onChange={e => setEditForm({ ...editForm, simpleExplanation: e.target.value })}
                      placeholder="e.g. Think of a seed drill like an automated precision planter..."
                      className="w-full px-3.5 py-2.5 border border-emerald-200 dark:border-emerald-700 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-900 text-sm leading-relaxed"
                      rows={3}
                    />
                  </div>

                  {/* Overall Detailed Technical Explanation */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Detailed Technical Explanation (Markdown)
                    </label>
                    <textarea
                      value={editForm.explanation || ''}
                      onChange={e => setEditForm({ ...editForm, explanation: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 bg-transparent text-sm leading-relaxed font-mono"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={handleCancelEdit}
                      disabled={isLoading}
                      className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSave(q.id)}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Question
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
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">
                    {sanitizeQuestionText(q.questionText)}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {q.topic && (
                    <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-bold rounded">
                      {q.topic}
                    </span>
                  )}

                  {/* Badges for Voice Script and Easy Explanation */}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    q.voiceExplanation
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                      : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                  }`}>
                    <Volume2 className="w-3 h-3" />
                    <span>{q.voiceExplanation ? '🎙️ Voice Ready' : '⚠️ Missing Voice Script'}</span>
                  </span>

                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    q.simpleExplanation
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                  }`}>
                    <BookOpen className="w-3 h-3" />
                    <span>{q.simpleExplanation ? '💡 Easy Ready' : '⚠️ Missing Easy'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-4">
                  <div className={`p-2 rounded-xl border ${q.correctAnswer === 'A' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300 font-bold' : 'border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}>
                    <span className="mr-2">A:</span> {sanitizeQuestionText(q.optionA)}
                  </div>
                  <div className={`p-2 rounded-xl border ${q.correctAnswer === 'B' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300 font-bold' : 'border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}>
                    <span className="mr-2">B:</span> {sanitizeQuestionText(q.optionB)}
                  </div>
                  <div className={`p-2 rounded-xl border ${q.correctAnswer === 'C' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300 font-bold' : 'border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}>
                    <span className="mr-2">C:</span> {sanitizeQuestionText(q.optionC)}
                  </div>
                  <div className={`p-2 rounded-xl border ${q.correctAnswer === 'D' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300 font-bold' : 'border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}>
                    <span className="mr-2">D:</span> {sanitizeQuestionText(q.optionD)}
                  </div>
                  {q.optionE && (
                    <div className={`p-2 rounded-xl border ${q.correctAnswer === 'E' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300 font-bold' : 'border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}>
                      <span className="mr-2">E:</span> {sanitizeQuestionText(q.optionE)}
                    </div>
                  )}
                </div>

                {/* Spoken Voice Script Card Preview */}
                {q.voiceExplanation && (
                  <div className="mt-3 p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-xs font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                          Voice Tutor Script (Edge-TTS)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePlayTts(q.id, q.voiceExplanation!)}
                        disabled={isLoadingAudioThis}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-800 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      >
                        {isLoadingAudioThis ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isPlayingThis ? (
                          <VolumeX className="w-3 h-3 text-red-600" />
                        ) : (
                          <Volume2 className="w-3 h-3 text-indigo-600" />
                        )}
                        <span>{isPlayingThis ? 'Stop' : 'Listen'}</span>
                      </button>
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-sans">
                      {q.voiceExplanation}
                    </p>
                  </div>
                )}

                {/* Easy Explanation Preview */}
                {q.simpleExplanation && (
                  <div className="mt-2.5 p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-xs font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                        Easy Explanation (ELI5)
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-sans">
                      {q.simpleExplanation}
                    </p>
                  </div>
                )}

                {/* Overall Explanation */}
                {q.explanation && (
                  <div className="mt-2.5 p-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-sm border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-900 dark:text-white text-xs uppercase flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-blue-600" /> Detailed Explanation
                      </span>
                      <AdminReEnrichButton
                        questionId={q.id}
                        onEnriched={(newExp) => {
                          setQuestions(questions.map(item => item.id === q.id ? { ...item, explanation: newExp } : item))
                        }}
                      />
                    </div>
                    <FormattedExplanation text={q.explanation} />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => handleEditClick(q)}
                  disabled={isLoading}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                  title="Edit Question & Explanations"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDeleteClick(q.id)}
                  disabled={isLoading}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Question?</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed text-sm">
                Are you sure you want to delete this question? This action cannot be undone.
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false)
                    setQuestionToDelete(null)
                  }}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer shadow-sm"
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
