import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  ArrowLeft,
  BookOpen,
  FileQuestion,
  Target,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Zap,
  BarChart2,
  GraduationCap,
  Layers,
  ArrowRight
} from 'lucide-react'
import prisma from '@/lib/prisma'
import { getUserSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function ChapterPage(props: { params: Promise<{ id: string }> }) {
  const session = await getUserSession()
  if (!session) {
    redirect('/login')
  }

  const params = await props.params
  const chapterId = parseInt(params.id, 10)

  if (isNaN(chapterId)) {
    notFound()
  }

  const [chapter, userMistakes, userAttempts] = await Promise.all([
    prisma.chapter.findUnique({
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
    }),
    prisma.userMistake.findMany({
      where: {
        userId: session.id,
        question: { quiz: { chapterId } }
      },
      select: {
        id: true,
        nextReviewAt: true
      }
    }),
    prisma.quizAttempt.findMany({
      where: {
        userId: session.id,
        quiz: { chapterId }
      },
      orderBy: { createdAt: 'desc' }
    })
  ])

  if (!chapter) {
    notFound()
  }

  const totalQuestions = chapter.quizzes.reduce((acc: number, quiz: any) => acc + quiz._count.questions, 0)
  const conceptCount = chapter._count.concepts

  const now = new Date()
  const totalMistakes = userMistakes.length
  const dueMistakes = userMistakes.filter((m: any) => m.nextReviewAt <= now).length

  // Build best scores map per quiz
  const bestScores: Record<number, { score: number; total: number; percentage: number }> = {}
  userAttempts.forEach((attempt: any) => {
    const qId = attempt.quizId
    const pct = Math.round((attempt.score / attempt.total) * 100)
    if (!bestScores[qId] || pct > bestScores[qId].percentage) {
      bestScores[qId] = { score: attempt.score, total: attempt.total, percentage: pct }
    }
  })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Chapters</span>
          </Link>
        </div>

        {/* Chapter Header Card */}
        <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Chapter Mission Control</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                {chapter.name}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Choose your pathway: master comprehensive high-yield theory notes first or jump straight into timed MCQ mock exams.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
              <div className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-center">
                <span className="block text-lg font-black text-emerald-600 dark:text-emerald-400">{conceptCount}</span>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Concepts</span>
              </div>
              <div className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-center">
                <span className="block text-lg font-black text-indigo-600 dark:text-indigo-400">{chapter.quizzes.length}</span>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Quizzes</span>
              </div>
              <div className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-center">
                <span className="block text-lg font-black text-slate-900 dark:text-white">{totalQuestions}</span>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Questions</span>
              </div>
            </div>
          </div>
        </div>

        {/* Spaced Repetition / Weak Concepts Banner */}
        {totalMistakes > 0 && (
          <div className="rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-900/40 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-amber-950 dark:text-amber-200">
                    Active Knowledge Gaps in this Chapter
                  </h3>
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                    {totalMistakes} marked
                  </span>
                </div>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                  {dueMistakes > 0
                    ? `You have ${dueMistakes} question${dueMistakes === 1 ? '' : 's'} ready for spaced repetition redemption right now.`
                    : `You have ${totalMistakes} question${totalMistakes === 1 ? '' : 's'} scheduled for spaced repetition review.`}
                </p>
              </div>
            </div>

            <Link
              href={`/redemption/quiz?chapterId=${chapter.id}${dueMistakes === 0 ? '&cooldown=true' : ''}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs hover:shadow transition-all whitespace-nowrap cursor-pointer shrink-0"
            >
              <Zap className="w-4 h-4 fill-current text-amber-200" />
              <span>Review Weak Questions ({dueMistakes > 0 ? dueMistakes : totalMistakes})</span>
            </Link>
          </div>
        )}

        {/* Dual-Pathway Hero Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Pathway 1: Theory & Concept Notes */}
          <div className="group relative rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 text-white p-6 sm:p-8 shadow-md hover:shadow-xl transition-all flex flex-col justify-between overflow-hidden">
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md text-emerald-200">
                  <BookOpen className="w-7 h-7" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-md">
                  Path 1 • Theory First
                </span>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  Master High-Yield Notes & Visual Docs
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
                  Study reverse-engineered concept cards, species comparative matrices, community photo gallery, and exam traps built directly from {totalQuestions} questions.
                </p>
              </div>

              {/* Feature Tags */}
              <div className="pt-2 flex flex-wrap gap-2 text-[11px]">
                <span className="px-2.5 py-1 rounded-lg bg-black/20 text-emerald-100 font-medium">
                  📸 Visual Photo Gallery
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-black/20 text-emerald-100 font-medium">
                  ⚠️ Exam Traps
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-black/20 text-emerald-100 font-medium">
                  🎥 Video Lectures
                </span>
              </div>
            </div>

            <div className="pt-6 relative z-10">
              <Link
                href={`/chapter/${chapter.id}/concepts`}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-white text-emerald-800 font-extrabold text-sm shadow-sm hover:bg-emerald-50 transition-colors cursor-pointer group-hover:scale-[1.01]"
              >
                <span>Launch 3-Column Docs Reader</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Pathway 2: Practice & Mock Tests */}
          <div className="group relative rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-700 to-indigo-800 text-white p-6 sm:p-8 shadow-md hover:shadow-xl transition-all flex flex-col justify-between overflow-hidden">
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md text-indigo-200">
                  <Target className="w-7 h-7" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-md">
                  Path 2 • Test Recall
                </span>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  Practice Quizzes & Timed Examination
                </h2>
                <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed">
                  Test your active recall under examination conditions. Receive instant concept gap analysis, detailed solutions, and automatic mistake logging.
                </p>
              </div>

              {/* Feature Tags */}
              <div className="pt-2 flex flex-wrap gap-2 text-[11px]">
                <span className="px-2.5 py-1 rounded-lg bg-black/20 text-indigo-100 font-medium">
                  ⏱️ Timed Mock Simulator
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-black/20 text-indigo-100 font-medium">
                  📊 Instant Gap Analysis
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-black/20 text-indigo-100 font-medium">
                  🔁 Spaced Redemption
                </span>
              </div>
            </div>

            <div className="pt-6 relative z-10">
              <a
                href="#quiz-modules"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-white text-indigo-800 font-extrabold text-sm shadow-sm hover:bg-indigo-50 transition-colors cursor-pointer group-hover:scale-[1.01]"
              >
                <span>Browse {chapter.quizzes.length} Quiz Modules</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>

        </div>

        {/* Quizzes Section */}
        <div id="quiz-modules" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-500" />
                <span>Chapter Quiz Modules</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select a quiz module to begin timed testing.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {chapter.quizzes.length} modules available
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {chapter.quizzes.map((quiz: any, idx: number) => {
              const attempt = bestScores[quiz.id]

              return (
                <div
                  key={quiz.id}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 hover:border-indigo-500 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                        Quiz #{idx + 1}
                      </span>
                      {attempt ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Best: {attempt.percentage}%</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400">
                          Not attempted
                        </span>
                      )}
                    </div>

                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-snug">
                      {quiz.name}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <FileQuestion className="w-3.5 h-3.5" />
                        <span>{quiz._count.questions} questions</span>
                      </span>
                      <span>•</span>
                      <span>{Math.round(quiz._count.questions * 1)} mins</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <Link
                      href={`/quiz/${quiz.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <Target className="w-3.5 h-3.5" />
                      <span>{attempt ? 'Retake Quiz' : 'Start Mock Test'}</span>
                    </Link>

                    {attempt && (
                      <Link
                        href={`/quiz/${quiz.id}/analysis`}
                        className="inline-flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
                        title="View Last Analysis & Solutions"
                      >
                        <BarChart2 className="w-3.5 h-3.5" />
                        <span>Analysis</span>
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
