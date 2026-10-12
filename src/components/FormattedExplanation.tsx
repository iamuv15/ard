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
  let cleanedText = text.replace(/\[cite:\s*\d+\]/gi, '').trim()

  return (
    <div className={`prose-sm max-w-none text-gray-800 dark:text-gray-200 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 shadow-xs">
              <table className="w-full text-left text-xs md:text-sm border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-100/80 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2 font-bold text-gray-900 dark:text-gray-100 border-r last:border-r-0 border-gray-200 dark:border-gray-700">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2 border-t border-gray-100 dark:border-gray-800 border-r last:border-r-0 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
              {children}
            </td>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-gray-900 dark:text-white">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-800 dark:text-gray-200 font-serif">
              {children}
            </em>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside ml-4 space-y-1 my-2">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-4 space-y-1 my-2">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-amber-500 bg-amber-50/70 dark:bg-amber-950/20 px-3.5 py-2 rounded-r-lg my-2.5 text-xs md:text-sm text-amber-900 dark:text-amber-200 font-medium">
              {children}
            </blockquote>
          ),
          h3: ({ children }) => (
            <h3 className="font-bold text-sm md:text-base text-gray-900 dark:text-white mt-3.5 mb-1.5 flex items-center gap-1.5">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="font-bold text-xs md:text-sm text-gray-900 dark:text-white mt-2 mb-1">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="my-1.5 leading-relaxed">
              {children}
            </p>
          ),
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-xs text-purple-600 dark:text-purple-400">
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
