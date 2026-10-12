'use client'

import React, { useState, useEffect } from 'react'
import { Sparkles, Loader2, Check } from 'lucide-react'

interface AdminReEnrichButtonProps {
  questionId: number
  onEnriched?: (newExplanation: string) => void
}

export function AdminReEnrichButton({ questionId, onEnriched }: AdminReEnrichButtonProps) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Check if the current viewer is an admin
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.isAdmin) {
          setIsAdmin(true)
        }
      })
      .catch(() => {})
  }, [])

  if (!isAdmin) return null

  const handleReEnrich = async () => {
    if (!confirm('Reformat this question explanation with AI tables & styling now?')) {
      return
    }

    setLoading(true)
    setSuccess(false)

    try {
      const res = await fetch(`/api/admin/questions/${questionId}/enrich`, {
        method: 'POST'
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setSuccess(true)
        if (onEnriched && data.explanation) {
          onEnriched(data.explanation)
        }
        setTimeout(() => setSuccess(false), 3000)
      } else {
        alert(data.error || 'Failed to reformat explanation.')
      }
    } catch (err) {
      console.error('Error re-enriching question:', err)
      alert('Network error while reformatting.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleReEnrich}
      disabled={loading}
      title="Admin only: Re-format and generate tables for this explanation"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
      ) : success ? (
        <Check className="w-3 h-3 text-green-600" />
      ) : (
        <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
      )}
      <span>{loading ? 'Formatting...' : success ? 'Updated!' : '✨ Re-format (Admin)'}</span>
    </button>
  )
}
