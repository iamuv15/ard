import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, BookOpen, Network, FileQuestion } from 'lucide-react'
import prisma from '@/lib/prisma'
import { getUserSession } from '@/lib/auth'
import { ChapterMindMapView } from '@/components/concepts/ChapterMindMapView'

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
          imageUrl: true,
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8 text-slate-900 dark:text-slate-100">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={`/chapter/${chapter.id}`}
            className="inline-flex items-center text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {chapter.name} Quizzes
          </Link>

          <Link
            href={`/chapter/${chapter.id}`}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
          >
            <FileQuestion className="w-3.5 h-3.5 text-blue-500" />
            Switch to Quizzes ({chapter.quizzes.length})
          </Link>
        </div>

        {/* Hero Header Banner */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/80 dark:border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              <div className="p-3.5 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-2xl text-white shadow-md shadow-emerald-500/20">
                <Network className="w-8 h-8" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 mb-1.5">
                  Exam Concept Engine
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {chapter.name} • Mind Map & Glossary
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium max-w-2xl">
                  Reverse-engineered directly from {totalQuestions} MCQs. Explore core definitions, comparative species matrices, and high-probability exam traps.
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100 dark:border-slate-800">
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {chapter.concepts.length}
              </div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Curated Capsules
              </div>
            </div>
          </div>
        </div>

        {/* The Interactive Mind Map View */}
        <ChapterMindMapView
          chapterId={chapter.id}
          chapterName={chapter.name}
          mindMapTree={treeData}
          existingConcepts={chapter.concepts}
        />
      </div>
    </div>
  )
}
