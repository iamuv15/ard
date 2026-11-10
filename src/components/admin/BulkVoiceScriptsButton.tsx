'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Volume2, Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface BulkVoiceScriptsButtonProps {
  quizId: number
  totalQuestions: number
  voiceReadyCount: number
  easyReadyCount: number
}

export function BulkVoiceScriptsButton({
  quizId,
  totalQuestions,
  voiceReadyCount,
  easyReadyCount
}: BulkVoiceScriptsButtonProps) {
  const [loading, setLoading] = useState(false)
  const [currentAction, setCurrentAction] = useState<'voice' | 'simple' | null>(null)
  const [progressText, setProgressText] = useState<string | null>(null)
  const [percent, setPercent] = useState<number>(0)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const router = useRouter()

  const handleBulkGenerate = async (target: 'voice' | 'simple') => {
    const label = target === 'voice' ? 'Hinglish Voice Scripts (Edge-TTS)' : 'Easy Explanations'
    const confirmMsg = `Batch generate ${label} for missing questions in this quiz?\n\n• Existing scripts will be preserved.\n• Uses Gemini to draft pedagogical scripts.\n\nClick OK to begin.`
    if (!confirm(confirmMsg)) return

    setLoading(true)
    setCurrentAction(target)
    setSuccessMessage(null)
    setProgressText(`Preparing batch generation...`)
    setPercent(0)

    try {
      let isCompleted = false
      let completedQuestions = target === 'voice' ? voiceReadyCount : easyReadyCount

      while (!isCompleted) {
        const res = await fetch(`/api/admin/quizzes/${quizId}/voice-scripts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchSize: 5, target, overwriteExisting: false })
        })

        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed during batch generation.')
        }

        const remaining = data.remaining ?? 0
        const total = data.total || totalQuestions
        const done = total - remaining
        const pct = Math.min(Math.round((done / (total || 1)) * 100), 100)

        setPercent(pct)
        setProgressText(`Processing batch... ${done}/${total} questions (${pct}%)`)

        if (data.allCompleted || remaining === 0) {
          isCompleted = true
          setProgressText(null)
          setSuccessMessage(`All ${totalQuestions} questions now have ${label}!`)
          router.refresh()
          setTimeout(() => setSuccessMessage(null), 6000)
        }
      }
    } catch (err: any) {
      console.error('Bulk generation error:', err)
      alert(err?.message || 'Error occurred during bulk generation.')
    } finally {
      setLoading(false)
      setCurrentAction(null)
    }
  }

  const voicePercent = Math.round((voiceReadyCount / (totalQuestions || 1)) * 100)
  const easyPercent = Math.round((easyReadyCount / (totalQuestions || 1)) * 100)

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-950 mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Volume2 className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-black text-gray-900 dark:text-white">
              Voice Tutor & Explanations Studio
            </h2>
            <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Edge-TTS Ready
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xl">
            Manage conversational Hinglish speech scripts and simplified student explanations. Edge-TTS plays these scripts with zero-lag predictive caching.
          </p>

          {/* Progress Indicators */}
          <div className="flex flex-wrap items-center gap-4 mt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">🎙️ Voice Scripts:</span>
              <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                voiceReadyCount === totalQuestions ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {voiceReadyCount}/{totalQuestions} ({voicePercent}%)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">💡 Easy Explanations:</span>
              <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                easyReadyCount === totalQuestions ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {easyReadyCount}/{totalQuestions} ({easyPercent}%)
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleBulkGenerate('voice')}
            disabled={loading || voiceReadyCount === totalQuestions}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading && currentAction === 'voice' ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Sparkles className="w-4 h-4 text-yellow-300" />
            )}
            <span>{voiceReadyCount === totalQuestions ? 'All Voice Scripts Generated' : 'Batch Generate Voice Scripts'}</span>
          </button>

          <button
            onClick={() => handleBulkGenerate('simple')}
            disabled={loading || easyReadyCount === totalQuestions}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading && currentAction === 'simple' ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Sparkles className="w-4 h-4 text-emerald-200" />
            )}
            <span>{easyReadyCount === totalQuestions ? 'All Easy Explanations Generated' : 'Batch Generate Easy Explanations'}</span>
          </button>
        </div>
      </div>

      {/* Real-time Progress Bar */}
      {loading && progressText && (
        <div className="mt-4 pt-4 border-t border-indigo-50 dark:border-indigo-900/40">
          <div className="flex justify-between items-center text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1.5">
            <span>{progressText}</span>
            <span>{percent}%</span>
          </div>
          <div className="w-full h-2 bg-indigo-100 dark:bg-indigo-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  )
}
