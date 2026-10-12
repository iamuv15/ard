'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react'

interface EnrichQuizButtonProps {
  quizId: number
  totalQuestions: number
  compact?: boolean
}

export function EnrichQuizButton({ quizId, totalQuestions, compact = false }: EnrichQuizButtonProps) {
  const [loading, setLoading] = useState(false)
  const [progressText, setProgressText] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const router = useRouter()

  const handleEnrich = async () => {
    const shouldReset = confirm(
      `Format and enhance explanations for this quiz?\n\n` +
      `• Zero information loss (retains all facts and details)\n` +
      `• Auto-generates Markdown Tables for comparisons\n` +
      `• Bolds key terms, italicizes scientific names, and cleans scraping tags\n\n` +
      `Click OK to continue (already enriched questions are skipped automatically).`
    )
    if (!shouldReset) return

    setLoading(true)
    setSuccessMessage(null)
    setProgressText('Starting AI enrichment...')

    try {
      let isCompleted = false
      let currentDone = 0
      let total = totalQuestions

      while (!isCompleted) {
        const res = await fetch(`/api/admin/quizzes/${quizId}/enrich`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchSize: 6 })
        })

        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed during batch enrichment.')
        }

        total = data.total || totalQuestions
        const remaining = data.remaining ?? 0
        currentDone = Math.max(total - remaining, currentDone + (data.enrichedInChunk || 0))
        const percent = Math.min(Math.round((currentDone / (total || 1)) * 100), 100)

        if (data.allCompleted || remaining === 0) {
          isCompleted = true
          setProgressText(null)
          setSuccessMessage(`All ${total} explanations formatted with tables & structure!`)
          router.refresh()
          setTimeout(() => setSuccessMessage(null), 6000)
        } else {
          setProgressText(`${currentDone}/${total} (${percent}%)`)
        }
      }
    } catch (err: any) {
      console.error('Error enriching quiz:', err)
      alert(err.message || 'Network error while enriching quiz.')
      setProgressText(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {successMessage && (
        <span className={`${compact ? 'text-[11px] px-2 py-1' : 'text-xs px-3 py-1.5'} font-semibold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-1.5 animate-in fade-in`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
          <span className="truncate max-w-[240px]">{successMessage}</span>
        </span>
      )}

      <button
        type="button"
        onClick={handleEnrich}
        disabled={loading}
        title={`AI format explanations with tables and styling for all ${totalQuestions} questions`}
        className={compact
          ? "flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 shrink-0 shadow-xs"
          : "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-sm transition-all hover:shadow active:scale-95 disabled:opacity-50"
        }
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600 dark:text-purple-300" />
        ) : (
          <Sparkles className={compact ? "w-3.5 h-3.5 text-purple-600 dark:text-purple-400" : "w-3.5 h-3.5 text-yellow-300 fill-yellow-300/30"} />
        )}
        <span>
          {loading 
            ? (progressText ? `Formatting ${progressText}` : 'Processing...') 
            : (compact ? 'AI Enrich' : 'AI Enrich All Explanations')}
        </span>
      </button>
    </div>
  )
}
