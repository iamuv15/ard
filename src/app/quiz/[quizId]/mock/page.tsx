import prisma from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { getUserSession } from '@/lib/auth'
import MockEngineClient from '@/components/MockEngineClient'

export const dynamic = 'force-dynamic'

export default async function MockExamPage({ params }: { params: Promise<{ quizId: string }> }) {
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
    <MockEngineClient 
      quizId={quiz.id} 
      quizName={quiz.name} 
      questions={quiz.questions} 
      userName={session?.name || null} 
    />
  )
}
