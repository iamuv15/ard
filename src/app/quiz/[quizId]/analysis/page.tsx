import prisma from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { getUserSession } from '@/lib/auth'
import AnalysisClient from '@/components/AnalysisClient'

export const dynamic = 'force-dynamic'

export default async function AnalysisPage({ params }: { params: Promise<{ quizId: string }> }) {
  const session = await getUserSession()
  if (!session) {
    redirect('/login')
  }

  const { quizId } = await params
  const quiz = await prisma.quiz.findUnique({
    where: { id: parseInt(quizId, 10) },
    include: { questions: true }
  })

  if (!quiz) notFound()

  return (
    <AnalysisClient 
      quizId={quiz.id} 
      quizName={quiz.name} 
      questions={quiz.questions} 
    />
  )
}
