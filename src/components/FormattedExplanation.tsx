'use client'

import React from 'react'

interface FormattedExplanationProps {
  text: string
  className?: string
}

export function FormattedExplanation({ text, className = '' }: FormattedExplanationProps) {
  if (!text) return null

  // Clean any leftover [cite: xx] citation tags from raw text
  const cleanedText = text.replace(/\[cite:\s*\d+\]/gi, '').trim()

  return (
    <div className={className}>
      {cleanedText.split('\n').map((paragraph, pIdx) => {
        if (!paragraph.trim()) return null
        return (
          <p key={pIdx} className={pIdx > 0 ? 'mt-2' : ''}>
            {paragraph.split(/(\*\*.*?\*\*)/g).map((part, idx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={idx} className="font-semibold text-gray-900 dark:text-gray-100">
                    {part.slice(2, -2)}
                  </strong>
                )
              }
              return part
            })}
          </p>
        )
      })}
    </div>
  )
}
