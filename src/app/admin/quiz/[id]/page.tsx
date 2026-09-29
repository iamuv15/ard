import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import prisma from '@/lib/prisma'
import { QuestionManager } from '@/components/admin/QuestionManager'
import LogOutButton from '@/components/LogOutButton'

export default async function AdminQuizPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const quizId = parseInt(params.id, 10)
  
  if (isNaN(quizId)) {
    notFound()
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      chapter: true,
      questions: {
        orderBy: { id: 'asc' }
      }
    }
  })

  if (!quiz) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Link href="/admin" className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <LogOutButton />
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Manage Questions: {quiz.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Chapter: {quiz.chapter.name} | {quiz.questions.length} questions in this quiz
          </p>
        </div>

        <QuestionManager initialQuestions={quiz.questions} />
      </div>
    </div>
  )
}
