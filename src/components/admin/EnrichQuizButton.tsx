'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react'

interface EnrichQuizButtonProps {
  quizId: number
  totalQuestions: number
}

export function EnrichQuizButton({ quizId, totalQuestions }: EnrichQuizButtonProps) {
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const router = useRouter()

  const handleEnrich = async () => {
    if (!confirm(`Do you want Gemini AI to clean and enrich all ${totalQuestions} explanations for this quiz?\n\nThis will strip [cite: xx] tags, bold key concepts, and make explanations engaging.`)) {
      return
    }

    setLoading(true)
    setSuccessMessage(null)
    try {
      const res = await fetch(`/api/admin/quizzes/${quizId}/enrich`, {
        method: 'POST'
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setSuccessMessage(data.message || `Enriched ${data.enrichedCount} explanations!`)
        router.refresh()
        setTimeout(() => setSuccessMessage(null), 5000)
      } else {
        alert(data.error || 'Failed to enrich quiz explanations.')
      }
    } catch (err) {
      console.error('Error enriching quiz:', err)
      alert('Network error while enriching quiz.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {successMessage && (
        <span className="text-xs font-semibold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-in fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          <span>{successMessage}</span>
        </span>
      )}

      <button
        type="button"
        onClick={handleEnrich}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-sm transition-all hover:shadow active:scale-95 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300/30" />
        )}
        <span>{loading ? 'Enriching Explanations...' : 'AI Enrich All Explanations'}</span>
      </button>
    </div>
  )
}
