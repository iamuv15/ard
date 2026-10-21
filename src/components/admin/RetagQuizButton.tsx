'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tag, Loader2, CheckCircle2, Sparkles, Zap, ChevronDown, X } from 'lucide-react'

interface RetagQuizButtonProps {
  quizId: number
  totalQuestions: number
  compact?: boolean
}

export function RetagQuizButton({ quizId, totalQuestions, compact = false }: RetagQuizButtonProps) {
  const [loading, setLoading] = useState(false)
  const [progressText, setProgressText] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()

  // 1. Semantic AI Retagging (Gemini with negative word boundary constraints)
  const handleAiRetag = async () => {
    setMenuOpen(false)
    const confirmed = confirm(
      `Re-link all ${totalQuestions} questions using AI Semantic Classification?\n\n` +
      `• Explanations are preserved 100% untouched\n` +
      `• Examines question stem & answers against the chapter's concept taxonomy\n` +
      `• Strict negative constraints (eradicates false tags like "Full Cream Milk")\n\n` +
      `Click OK to begin.`
    )
    if (!confirmed) return

    setLoading(true)
    setSuccessMessage(null)
    setProgressText('Starting AI retag...')

    try {
      let isCompleted = false
      let offset = 0
      const batchSize = 10

      while (!isCompleted) {
        const res = await fetch(`/api/admin/quizzes/${quizId}/enrich`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'tag_only',
            offset,
            batchSize
          })
        })

        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed during concept retagging.')
        }

        offset += data.enrichedInChunk || batchSize
        const total = data.total || totalQuestions
        const percent = Math.min(Math.round((offset / (total || 1)) * 100), 100)

        if (data.allCompleted || offset >= total) {
          isCompleted = true
          setProgressText(null)
          setSuccessMessage(`All ${total} MCQs accurately re-linked with keywords!`)
          router.refresh()
          setTimeout(() => setSuccessMessage(null), 6000)
        } else {
          setProgressText(`${Math.min(offset, total)}/${total} (${percent}%)`)
        }
      }
    } catch (err: any) {
      console.error('Error during retag:', err)
      alert(err.message || 'Error occurred while re-linking keywords.')
      setProgressText(null)
    } finally {
      setLoading(false)
    }
  }

  // 2. Instant Regex Sync (Zero AI, fast whole-phrase match)
  const handleQuickSync = async () => {
    setMenuOpen(false)
    setLoading(true)
    setSuccessMessage(null)
    setProgressText('Syncing keywords...')

    try {
      const res = await fetch(`/api/admin/quizzes/${quizId}/retag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'regex_sync' })
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Quick sync failed.')
      }

      setSuccessMessage(`Linked ${data.linkedQuestions || 0} MCQs instantly!`)
      router.refresh()
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err: any) {
      console.error('Error during quick sync:', err)
      alert(err.message || 'Error occurred during quick keyword sync.')
    } finally {
      setLoading(false)
      setProgressText(null)
    }
  }

  return (
    <div className="relative inline-flex items-center gap-1.5">
      {successMessage && (
        <span className={`${compact ? 'text-[11px] px-2 py-1' : 'text-xs px-3 py-1.5'} font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-1.5 animate-in fade-in`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="truncate max-w-[220px]">{successMessage}</span>
        </span>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            if (loading) return
            setMenuOpen(!menuOpen)
          }}
          disabled={loading}
          title="Fix and re-link keywords for this quiz"
          className={compact
            ? "flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 shrink-0 shadow-xs cursor-pointer"
            : "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-sm transition-all hover:shadow active:scale-95 disabled:opacity-50 cursor-pointer"
          }
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-300" />
          ) : (
            <Tag className={compact ? "w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" : "w-3.5 h-3.5 text-emerald-100"} />
          )}
          <span>
            {loading 
              ? (progressText ? progressText : 'Processing...') 
              : (compact ? 'Fix Links' : 'Re-link Keywords')}
          </span>
          {!loading && <ChevronDown className="w-3 h-3 opacity-70" />}
        </button>

        {/* Dropdown Options */}
        {menuOpen && (
          <div className="absolute right-0 mt-1.5 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1.5 z-50 text-left space-y-1 animate-in fade-in zoom-in-95">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span>Choose Re-linking Method</span>
              <button onClick={() => setMenuOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Option 1: AI Semantic Retag */}
            <button
              type="button"
              onClick={handleAiRetag}
              className="w-full text-left p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-800 dark:text-slate-200 transition-colors flex items-start gap-2.5 group cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                  AI Semantic Retag (Gemini)
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                  Deeply analyzes question concepts with negative word constraints. Preserves explanations.
                </div>
              </div>
            </button>

            {/* Option 2: Quick Regex Sync */}
            <button
              type="button"
              onClick={handleQuickSync}
              className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors flex items-start gap-2.5 group cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">
                  Quick Regex Match (Instant)
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                  Instant whole-word match on stems & options. Zero API calls, 100% free.
                </div>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
