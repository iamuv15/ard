'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import AnalysisClient from '@/components/AnalysisClient'

function ChapterAnalysisContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const key = searchParams.get('key')
  const chapterId = parseInt(params.id as string, 10)

  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<any[]>([])
  const [meta, setMeta] = useState<{ quizName: string; chapterName: string } | null>(null)

  useEffect(() => {
    if (!key) {
      setLoading(false)
      return
    }
    try {
      const raw = localStorage.getItem(`chapter_mock_result_${key}`)
      if (!raw) {
        setLoading(false)
        return
      }
      const parsed = JSON.parse(raw)
      setMeta({
        quizName: parsed.quizName || 'Custom Mock Exam',
        chapterName: parsed.chapterName || 'Chapter'
      })

      fetch('/ard/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: parsed.questionIds || [],
          chapterId: !isNaN(chapterId) ? chapterId : undefined,
          shuffle: false,
          order: 'relevance'
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
  }, [key, chapterId])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-gray-500">Generating your test analysis...</p>
      </div>
    )
  }

  if (!key || !meta || questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center p-4">
        <p className="text-lg font-medium text-gray-600">No analysis data found for this session.</p>
        <Link href="/" className="text-blue-600 hover:underline mt-4 text-sm font-bold">
          Return to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <AnalysisClient
      quizId={chapterId}
      quizName={meta.quizName}
      chapterId={chapterId}
      chapterName={meta.chapterName}
      questions={questions}
      customStorageKey={key}
    />
  )
}

export default function ChapterAnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <ChapterAnalysisContent />
    </Suspense>
  )
}
