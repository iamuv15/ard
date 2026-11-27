'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import MockEngineClient from '@/components/MockEngineClient'

type Props = {
  chapterId: number
  chapterName: string
  customKey: string
  userName: string | null
}

export default function CustomMockLoader({ chapterId, chapterName, customKey, userName }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<any[]>([])
  const [quizTitle, setQuizTitle] = useState(`${chapterName} - Custom Timed Exam`)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`custom_quiz_${customKey}`)
      if (!raw) {
        setLoading(false)
        return
      }
      const parsed = JSON.parse(raw)
      if (parsed.title) setQuizTitle(parsed.title)

      fetch('/ard/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: parsed.ids || [],
          chapterId,
          shuffle: parsed.order !== 'chronological',
          order: parsed.order || 'relevance',
          limit: parsed.limit || 'all'
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.questions) {
            setQuestions(data.questions)
          }
          setLoading(false)
        })
        .catch(() => setLoading(false))
    } catch {
      setLoading(false)
    }
  }, [chapterId, customKey])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-gray-500">Assembling your custom timed exam...</p>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-4">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Custom Exam Session Expired or Empty</h2>
        <p className="text-sm text-gray-500 mb-6">Please go back to the dashboard and rebuild your custom quiz.</p>
        <button
          onClick={() => router.push('/')}
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition cursor-pointer"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <MockEngineClient
      quizId={chapterId}
      quizName={quizTitle}
      questions={questions}
      userName={userName}
      customAnalysis={{
        chapterId,
        chapterName,
        storageKey: customKey
      }}
    />
  )
}
