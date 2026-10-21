'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface FormattedExplanationProps {
  text: string
  className?: string
}

export function FormattedExplanation({ text, className = '' }: FormattedExplanationProps) {
  if (!text) return null

  // Clean any leftover [cite: xx] citation tags from raw text
  const cleanedText = text.replace(/\[cite:\s*\d+\]/gi, '').trim()

  return (
    <div className={`max-w-none text-slate-800 leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="overflow-x-auto my-3.5 rounded-xl border border-slate-250 bg-white shadow-xs">
              <table className="w-full text-left text-xs md:text-sm border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-100/90 text-slate-900 border-b border-slate-200">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2.5 font-bold text-xs uppercase tracking-wider text-slate-900 border-r last:border-r-0 border-slate-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2.5 border-t border-slate-200 border-r last:border-r-0 border-slate-200 text-slate-800 font-medium">
              {children}
            </td>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-slate-950">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-slate-900 font-serif">
              {children}
            </em>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside ml-4 space-y-1.5 my-2.5 text-slate-850">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-4 space-y-1.5 my-2.5 text-slate-850">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed text-slate-800 text-xs md:text-sm">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-amber-500 bg-amber-50/90 px-3.5 py-2.5 rounded-r-xl my-3 text-xs md:text-sm text-amber-950 font-medium shadow-2xs">
              {children}
            </blockquote>
          ),
          h3: ({ children }) => {
            const textContent = React.Children.toArray(children)
              .map(c => (typeof c === 'string' ? c : ''))
              .join('')
            const headingId = textContent
              ? textContent
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/(^-|-$)/g, '')
              : undefined
            return (
              <h3
                id={headingId}
                className="font-black text-sm md:text-base text-slate-900 mt-6 mb-2 flex items-center gap-1.5 tracking-tight border-b border-slate-200/70 pb-1 scroll-mt-24"
              >
                {children}
              </h3>
            )
          },
          h4: ({ children }) => {
            const textContent = React.Children.toArray(children)
              .map(c => (typeof c === 'string' ? c : ''))
              .join('')
            const headingId = textContent
              ? textContent
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/(^-|-$)/g, '')
              : undefined
            return (
              <h4
                id={headingId}
                className="font-bold text-xs md:text-sm text-slate-900 mt-3 mb-1 scroll-mt-24"
              >
                {children}
              </h4>
            )
          },
          p: ({ children }) => (
            <p className="my-2 leading-relaxed text-xs md:text-sm text-slate-800 font-normal">
              {children}
            </p>
          ),
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-xs text-purple-700 font-semibold border border-slate-200">
              {children}
            </code>
          )
        }}
      >
        {cleanedText}
      </ReactMarkdown>
    </div>
  )
}
