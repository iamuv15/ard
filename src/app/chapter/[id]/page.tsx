import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, BookOpen, FileQuestion } from 'lucide-react'
import prisma from '@/lib/prisma'
import { getUserSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function ChapterPage(props: { params: Promise<{ id: string }> }) {
  const session = await getUserSession()
  if (!session) {
    redirect('/login')
  }

  const params = await props.params;
  const chapterId = parseInt(params.id, 10)
  
  if (isNaN(chapterId)) {
    notFound()
  }

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      _count: {
        select: { concepts: true }
      },
      quizzes: {
        include: {
          _count: {
            select: { questions: true }
          }
        },
        orderBy: { id: 'asc' }
      }
    }
  })

  if (!chapter) {
    notFound()
  }

  const totalQuestions = chapter.quizzes.reduce((acc: number, quiz: any) => acc + quiz._count.questions, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline mb-8 font-medium">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Chapters
        </Link>
        
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                {chapter.name}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">
                {chapter.quizzes.length} Quizzes • {totalQuestions} questions available
              </p>
            </div>
          </div>
        </div>

        {/* Feature Banner: Mind Map & High-Yield Glossary */}
        <Link
          href={`/chapter/${chapter.id}/concepts`}
          className="group block mb-8 p-6 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md hover:shadow-xl hover:scale-[1.01] transition-all"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-white/20 text-white backdrop-blur-sm">
                🧠 New Feature
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Chapter Mind Map & High-Yield Glossary
              </h2>
              <p className="text-sm text-emerald-100 font-medium max-w-xl">
                Master core terminologies, species comparative tables, and exam traps reverse-engineered from {totalQuestions} MCQs.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-emerald-800 font-bold text-sm shadow-sm group-hover:bg-emerald-50 transition-colors whitespace-nowrap">
              <span>Explore Mind Map</span>
              <span>→</span>
            </div>
          </div>
        </Link>
        
        <div className="flex flex-col gap-3">
          {chapter.quizzes.map((quiz: any) => {
            return (
              <Link 
                key={quiz.id} 
                href={`/quiz/${quiz.id}`} 
                className="group flex items-center justify-between p-4 sm:p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:shadow-md rounded-2xl transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                    <FileQuestion className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {quiz.name}
                  </div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap ml-4 bg-gray-100 dark:bg-gray-700/50 px-3 py-1 rounded-full">
                  {quiz._count.questions} Questions
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
