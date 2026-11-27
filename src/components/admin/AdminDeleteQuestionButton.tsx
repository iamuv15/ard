'use client'

import React, { useState, useEffect } from 'react'
import { Trash2, Loader2 } from 'lucide-react'

interface AdminDeleteQuestionButtonProps {
  questionId: number
  questionSnippet?: string
  onDeleted?: (deletedId: number) => void
}

export function AdminDeleteQuestionButton({ questionId, questionSnippet, onDeleted }: AdminDeleteQuestionButtonProps) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if current user is an admin
    fetch('/ard/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.isAdmin) {
          setIsAdmin(true)
        }
      })
      .catch(() => {})
  }, [])

  if (!isAdmin) return null

  const handleDelete = async () => {
    const snippet = questionSnippet ? `\n\n"${questionSnippet.slice(0, 80)}..."` : ''
    const confirmed = window.confirm(
      `⚠️ ADMIN ACTION: Permanently remove Question #${questionId} from the entire website?${snippet}\n\nThis will remove it from all quizzes, bookmarks, reports, and student history.`
    )
    if (!confirmed) return

    setLoading(true)
    try {
      const res = await fetch(`/ard/api/questions/${questionId}`, {
        method: 'DELETE'
      })
      const data = await res.json()

      if (res.ok && data.success) {
        if (onDeleted) {
          onDeleted(questionId)
        }
      } else {
        alert(data.error || 'Failed to remove question.')
      }
    } catch (err) {
      console.error('Error deleting question:', err)
      alert('Network error while attempting to delete question.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      title="Admin only: Permanently remove this question from the website"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
      ) : (
        <Trash2 className="w-3.5 h-3.5 text-red-600" />
      )}
      <span>{loading ? 'Removing...' : '🗑️ Remove (Admin)'}</span>
    </button>
  )
}
