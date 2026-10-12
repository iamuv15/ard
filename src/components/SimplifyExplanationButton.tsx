'use client'

import React, { useState } from 'react'
import { Sparkles, Loader2, ChevronUp } from 'lucide-react'

interface SimplifyExplanationButtonProps {
  questionId: number
  initialSimpleExplanation?: string | null
  className?: string
}

function renderFormatted(text: string) {
  return text.split('\n').map((paragraph, pIdx) => {
    if (!paragraph.trim()) return null
    return (
      <p key={pIdx} className={pIdx > 0 ? 'mt-2' : ''}>
        {paragraph.split(/(\*\*.*?\*\*)/g).map((part, idx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={idx} className="font-bold text-gray-900 dark:text-white">
                {part.slice(2, -2)}
              </strong>
            )
          }
          return part
        })}
      </p>
    )
  })
}

export function SimplifyExplanationButton({
  questionId,
  initialSimpleExplanation,
  className = ''
}: SimplifyExplanationButtonProps) {
  const [simpleExplanation, setSimpleExplanation] = useState<string | null>(initialSimpleExplanation || null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    if (isOpen) {
      setIsOpen(false)
      return
    }

    if (simpleExplanation) {
      setIsOpen(true)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/questions/simplify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId })
      })

      const data = await res.json()
      if (res.ok && data.success && data.simpleExplanation) {
        setSimpleExplanation(data.simpleExplanation)
        setIsOpen(true)
      } else {
        alert(data.error || 'Failed to generate simplified explanation.')
      }
    } catch (err) {
      console.error('Error simplifying explanation:', err)
      alert('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`mt-3.5 pt-3 border-t border-blue-100/80 dark:border-blue-900/40 ${className}`}>
      {/* Trigger Button - Matches clean theme with crystal clear contrast */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleToggle}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 transition-all py-1.5 px-3 rounded-lg bg-white/90 dark:bg-gray-800 border border-blue-200/80 dark:border-blue-800 shadow-2xs hover:bg-blue-50/60"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-blue-600 fill-blue-500/20" />
          )}
          <span>
            {isOpen ? 'Hide simpler explanation' : simpleExplanation ? 'View simpler explanation' : 'Explain in simpler terms'}
          </span>
        </button>

        {isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-[11px] font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 transition-colors"
          >
            <span>Collapse</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Expanded Intuitive Analogy Box - Crisp white background, clean contrast */}
      {isOpen && simpleExplanation && (
        <div className="mt-2.5 p-4 rounded-xl bg-white dark:bg-gray-800 border border-blue-200 dark:border-gray-700 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Intuitive Breakdown</span>
          </div>
          <div className="text-[13px] leading-relaxed text-gray-800 dark:text-gray-200">
            {renderFormatted(simpleExplanation)}
          </div>
        </div>
      )}
    </div>
  )
}
