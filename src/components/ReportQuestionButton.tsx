'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Flag, Loader2, CheckCircle2, ChevronRight, Send, AlertTriangle } from 'lucide-react'

const REPORT_REASONS = [
  { id: 'WRONG_ANSWER_KEY', label: 'Wrong Answer Key', desc: 'Another option is the correct one' },
  { id: 'MULTIPLE_CORRECT', label: 'Multiple Correct Options', desc: 'More than one option is valid' },
  { id: 'NO_CORRECT', label: 'None of the Options Correct', desc: 'All options are incorrect or missing answer' },
  { id: 'TYPO_IN_QUESTION', label: 'Typo or Factual Error', desc: 'Spelling, phrasing or terminology issue' },
  { id: 'EXPLANATION_ERROR', label: 'Incorrect Explanation', desc: 'Explanation contradicts answer or is wrong' },
  { id: 'OUTDATED_INFO', label: 'Outdated Information', desc: 'Fact or syllabus has changed' },
  { id: 'OTHER', label: 'Other Issue', desc: 'Type your own feedback' },
]

interface ReportQuestionButtonProps {
  questionId: number
  className?: string
  variant?: 'button' | 'icon'
  onReported?: (status: string) => void
}

export function ReportQuestionButton({
  questionId,
  className = '',
  variant = 'button',
  onReported
}: ReportQuestionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [otherNote, setOtherNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [isReported, setIsReported] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [isAutoCorrected, setIsAutoCorrected] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSelectedReason(null)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const submitReport = async (reasonId: string, note?: string) => {
    setLoading(true)
    setFeedbackMessage(null)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          reason: reasonId,
          userNote: note || null
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setIsReported(true)
        if (data.report?.status === 'AUTO_CORRECTED') {
          setIsAutoCorrected(true)
          setFeedbackMessage(`AI verified! Answer auto-corrected to Option ${data.report.suggestedAnswer}.`)
        } else {
          setFeedbackMessage('Report received! Queued for verification.')
        }
        if (onReported) {
          onReported(data.report?.status)
        }
        setTimeout(() => {
          setIsOpen(false)
          setSelectedReason(null)
        }, 1800)
      } else {
        alert(data.error || 'Failed to submit report')
      }
    } catch (err) {
      console.error('Error submitting report:', err)
      alert('Network error while reporting. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReasonClick = (reasonId: string) => {
    if (reasonId === 'OTHER') {
      setSelectedReason('OTHER')
    } else {
      submitReport(reasonId)
    }
  }

  const handleOtherSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!otherNote.trim()) return
    submitReport('OTHER', otherNote.trim())
  }

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          title={isReported ? 'Reported' : 'Mark as incorrect'}
          className={`p-1.5 rounded-lg transition-colors ${
            isReported
              ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
              : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
          }`}
        >
          <Flag className={`w-4 h-4 ${isReported ? 'fill-amber-500' : ''}`} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-xs ${
            isReported
              ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
              : 'bg-white border-gray-200 text-gray-600 hover:border-red-200 hover:text-red-600 hover:bg-red-50/40'
          }`}
        >
          <Flag className={`w-3.5 h-3.5 ${isReported ? 'fill-amber-500 text-amber-600' : 'text-gray-400'}`} />
          <span>{isReported ? (isAutoCorrected ? 'AI Corrected ✨' : 'Reported 🚩') : 'Mark Incorrect'}</span>
        </button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 md:w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-2xl z-50 p-2 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                {selectedReason === 'OTHER' ? 'Describe the Issue' : 'Why is this incorrect?'}
              </span>
            </div>
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />}
          </div>

          {/* Feedback status state */}
          {feedbackMessage ? (
            <div className="p-4 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto" />
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {feedbackMessage}
              </p>
            </div>
          ) : selectedReason === 'OTHER' ? (
            /* "Other" Text Input Form */
            <form onSubmit={handleOtherSubmit} className="p-3 space-y-3">
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Please provide details so Gemini AI and our team can verify accurately:
              </p>
              <textarea
                value={otherNote}
                onChange={(e) => setOtherNote(e.target.value)}
                rows={3}
                placeholder="E.g., Option B contradicts the textbook diagram..."
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100 placeholder-gray-400 resize-none"
                autoFocus
              />
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedReason(null)}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !otherNote.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  <span>Submit</span>
                </button>
              </div>
            </form>
          ) : (
            /* Option List */
            <div className="py-1 max-h-72 overflow-y-auto space-y-0.5">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason.id}
                  type="button"
                  disabled={loading}
                  onClick={() => handleReasonClick(reason.id)}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-blue-50/70 dark:hover:bg-gray-700/60 transition-colors flex items-center justify-between group disabled:opacity-50"
                >
                  <div>
                    <div className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {reason.label}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      {reason.desc}
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
