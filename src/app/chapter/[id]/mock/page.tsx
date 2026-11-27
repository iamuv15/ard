import prisma from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { getUserSession } from '@/lib/auth'
import MockEngineClient from '@/components/MockEngineClient'

export const dynamic = 'force-dynamic'

export default async function ChapterMockExamPage(props: { params: Promise<{ id: string }> }) {
  const session = await getUserSession()
  if (!session) {
    redirect('/login')
  }

  const params = await props.params
  const chapterId = parseInt(params.id, 10)
  if (isNaN(chapterId)) notFound()

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { id: true, name: true }
  })

  if (!chapter) notFound()

  const allQuestions = await prisma.question.findMany({
    where: { quiz: { chapterId } }
  })

  if (allQuestions.length === 0) {
    notFound()
  }

  // Fisher-Yates shuffle and take up to 50 questions
  const shuffled = [...allQuestions]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const examQuestions = shuffled.slice(0, Math.min(50, shuffled.length))

  return (
    <MockEngineClient 
      quizId={chapter.id} 
      quizName={`${chapter.name} - Random Mock Exam (All Topics)`} 
      questions={examQuestions} 
      userName={session?.name || null} 
    />
  )
}
