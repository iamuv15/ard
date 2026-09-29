import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import AnalysisClient from '@/components/AnalysisClient'

export default async function AnalysisPage({ params }: { params: Promise<{ quizId: string }> }) {
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
