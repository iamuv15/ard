'use client'

import React, { useState } from 'react'
import { Sparkles, Loader2, ChevronUp } from 'lucide-react'

interface SimplifyExplanationButtonProps {
  questionId: number
  initialSimpleExplanation?: string | null
  className?: string
}

function renderFormatted(text: string) {
  // Simple formatter for **bold** and linebreaks
  return text.split('\n').map((paragraph, pIdx) => (
    <p key={pIdx} className={pIdx > 0 ? 'mt-1.5' : ''}>
      {paragraph.split(/(\*\*.*?\*\*)/g).map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={idx} className="font-bold text-amber-900 dark:text-amber-200">
              {part.slice(2, -2)}
            </strong>
          )
        }
        return part
      })}
    </p>
  ))
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
    <div className={`mt-3 ${className}`}>
      {/* Trigger Button - Minimalist and subtle so it doesn't distract quick revision */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleToggle}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors py-1 px-2 rounded-md hover:bg-amber-50 dark:hover:bg-amber-950/40"
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
          ) : (
            <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500/30" />
          )}
          <span>
            {isOpen ? 'Hide simpler explanation' : simpleExplanation ? 'View simpler explanation' : 'Explain in simpler terms'}
          </span>
        </button>

        {isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-0.5"
          >
            <span>Collapse</span>
            <ChevronUp className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Expanded Intuitive Analogy Box */}
      {isOpen && simpleExplanation && (
        <div className="mt-2 p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 animate-in fade-in slide-in-from-top-1 duration-200 text-xs text-amber-900 dark:text-amber-100 leading-relaxed">
          <div className="flex items-center gap-1.5 font-black text-[10px] uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-1.5">
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>Intuitive Breakdown</span>
          </div>
          <div>{renderFormatted(simpleExplanation)}</div>
        </div>
      )}
    </div>
  )
}
