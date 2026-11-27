import prisma from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { getUserSession } from '@/lib/auth'
import MockEngineClient from '@/components/MockEngineClient'
import CustomMockLoader from '@/components/CustomMockLoader'

export const dynamic = 'force-dynamic'

export default async function ChapterMockExamPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await getUserSession()
  if (!session) {
    redirect('/login')
  }

  const params = await props.params
  const searchParams = await props.searchParams
  const chapterId = parseInt(params.id, 10)
  if (isNaN(chapterId)) notFound()

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { id: true, name: true }
  })

  if (!chapter) notFound()

  const customKey = typeof searchParams.customKey === 'string' ? searchParams.customKey : null
  if (customKey) {
    return (
      <CustomMockLoader
        chapterId={chapter.id}
        chapterName={chapter.name}
        customKey={customKey}
        userName={session?.name || null}
      />
    )
  }

  const difficultyParam = typeof searchParams.difficulty === 'string' ? searchParams.difficulty.toUpperCase() : null
  const limitParam = typeof searchParams.limit === 'string' ? searchParams.limit : null
  const orderParam = typeof searchParams.order === 'string' ? searchParams.order : 'shuffle'

  const whereClause: any = { quiz: { chapterId } }
  if (difficultyParam && ['EASY', 'MEDIUM', 'HARD'].includes(difficultyParam)) {
    whereClause.difficulty = difficultyParam
  }

  let examQuestions = await prisma.question.findMany({
    where: whereClause,
    orderBy: [{ quiz: { order: 'asc' } }, { id: 'asc' }]
  })

  if (examQuestions.length === 0) {
    notFound()
  }

  if (orderParam !== 'chronological') {
    const shuffled = [...examQuestions]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    examQuestions = shuffled
  }

  if (limitParam !== 'all') {
    const parsedLimit = limitParam ? parseInt(limitParam, 10) : 50
    const cap = !isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50
    examQuestions = examQuestions.slice(0, Math.min(cap, examQuestions.length))
  }

  const difficultyLabel = difficultyParam
    ? `Level: ${difficultyParam.charAt(0) + difficultyParam.slice(1).toLowerCase()}`
    : 'All Topics'
  const storageKey = `ch_${chapter.id}_${difficultyParam || 'all'}_${Date.now()}`

  return (
    <MockEngineClient
      quizId={chapter.id}
      quizName={`${chapter.name} - Timed Exam (${difficultyLabel})`}
      questions={examQuestions}
      userName={session?.name || null}
      customAnalysis={{
        chapterId: chapter.id,
        chapterName: chapter.name,
        storageKey
      }}
    />
  )
}
