import { notFound, redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getUserSession } from '@/lib/auth'
import { TailwindDocsReader } from '@/components/concepts/TailwindDocsReader'

export const dynamic = 'force-dynamic'

export default async function ChapterConceptsPage(props: { params: Promise<{ id: string }> }) {
  const session = await getUserSession()
  if (!session) {
    redirect('/login')
  }

  const params = await props.params
  const chapterId = parseInt(params.id, 10)

  if (isNaN(chapterId)) {
    notFound()
  }

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      mindMap: true,
      concepts: {
        where: { isPublished: true },
        select: {
          id: true,
          term: true,
          slug: true,
          category: true,
          subCategory: true,
          definition: true,
          examTraps: true,
          imageUrl: true,
          thumbnailUrl: true,
          imageCaption: true,
          videoUrl: true,
          _count: {
            select: { questions: true }
          }
        },
        orderBy: [{ category: 'asc' }, { term: 'asc' }]
      },
      quizzes: {
        select: {
          id: true,
          _count: { select: { questions: true } }
        }
      }
    }
  })

  if (!chapter) {
    notFound()
  }

  const totalQuestions = chapter.quizzes.reduce((acc, q) => acc + q._count.questions, 0)
  const treeData: any = chapter.mindMap?.treeData || null
  const categories = treeData?.categories || []

  return (
    <TailwindDocsReader
      chapterId={chapter.id}
      chapterName={chapter.name}
      categories={categories}
      allConcepts={chapter.concepts}
      totalQuestions={totalQuestions}
    />
  )
}
