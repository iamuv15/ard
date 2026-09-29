import prisma from '@/lib/prisma'
import { getUserSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, PlayCircle, ShieldAlert, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function RedemptionLobby() {
  const session = await getUserSession()
  if (!session) {
    redirect('/login')
  }

  // Fetch all mistakes for this user
  const allMistakes = await prisma.userMistake.findMany({
    where: { 
      userId: session.id,
    },
    include: {
      question: {
        include: {
          quiz: {
            include: {
              chapter: true
            }
          }
        }
      }
    }
  })

  const now = new Date()
  
  // Due mistakes
  const dueMistakes = allMistakes.filter((m: any) => m.nextReviewAt <= now)
  const totalDue = dueMistakes.length

  // Cooldown mistakes
  const cooldownMistakes = allMistakes.filter((m: any) => m.nextReviewAt > now)
  const totalCooldown = cooldownMistakes.length

  // Group by chapter (for due mistakes)
  const dueChapterMistakes: Record<number, { chapter: any, count: number }> = {}
  dueMistakes.forEach((m: any) => {
    const chapter = m.question.quiz.chapter
    const chapterId = chapter.id
    if (!dueChapterMistakes[chapterId]) {
      dueChapterMistakes[chapterId] = { chapter, count: 0 }
    }
    dueChapterMistakes[chapterId].count++
  })
  const dueChapters = Object.values(dueChapterMistakes).sort((a, b) => b.count - a.count)

  // Group by chapter (for cooldown mistakes)
  const cooldownChapterMistakes: Record<number, { chapter: any, count: number }> = {}
  cooldownMistakes.forEach((m: any) => {
    const chapter = m.question.quiz.chapter
    const chapterId = chapter.id
    if (!cooldownChapterMistakes[chapterId]) {
      cooldownChapterMistakes[chapterId] = { chapter, count: 0 }
    }
    cooldownChapterMistakes[chapterId].count++
  })
  const cooldownChapters = Object.values(cooldownChapterMistakes).sort((a, b) => b.count - a.count)

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:underline font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>

        {/* DUE FOR REVIEW HERO */}
        <div className="bg-gradient-to-r from-red-600 to-orange-500 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 opacity-20">
            <ShieldAlert className="w-64 h-64" />
          </div>
          
          <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-black mb-4">Redemption Forge</h1>
            <p className="text-red-100 text-lg max-w-2xl mb-8">
              Every mistake is an opportunity to learn. You have {totalDue} unresolved mistakes ready for spaced-repetition review. 
              Answer them correctly here to clear them out of the queue or push their next review date further.
            </p>
            
            {totalDue > 0 ? (
              <Link
                href="/redemption/quiz"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-red-600 hover:bg-red-50 font-bold rounded-xl transition-colors shadow-lg"
              >
                <PlayCircle className="w-6 h-6" />
                Start Global Redemption ({totalDue} Qs)
              </Link>
            ) : (
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 text-white font-bold rounded-xl border border-white/30 backdrop-blur-sm">
                Review queue is empty! Amazing job.
              </div>
            )}
          </div>
        </div>

        {/* DUE FOR REVIEW CHAPTERS */}
        {dueChapters.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Chapter Breakdown (Due Now)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dueChapters.map(({ chapter, count }) => (
                <div key={chapter.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-lg mb-1">{chapter.name}</h3>
                    <p className="text-red-600 font-medium mb-6">{count} mistakes pending</p>
                  </div>
                  <Link
                    href={`/redemption/quiz?chapterId=${chapter.id}`}
                    className="flex items-center justify-center gap-2 w-full py-2 bg-red-50 hover:bg-red-100 text-red-700 font-medium rounded-lg transition-colors border border-red-100"
                  >
                    <PlayCircle className="w-4 h-4" />
                    Review Chapter
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COOLDOWN SECTION */}
        {totalCooldown > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-2xl font-bold mb-2 text-gray-800 flex items-center gap-2">
              <Clock className="w-6 h-6 text-orange-500" />
              Recent Mistakes (In Cooldown)
            </h2>
            <p className="text-gray-600 mb-6">
              These {totalCooldown} mistakes are currently in their 24-hour spaced repetition cooldown period. 
              You can practice them now, but they will still be asked again once their cooldown expires to ensure long-term retention.
            </p>

            <div className="mb-6">
              <Link
                href="/redemption/quiz?cooldown=true"
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-100 text-orange-700 hover:bg-orange-200 font-bold rounded-xl transition-colors shadow-sm"
              >
                <PlayCircle className="w-6 h-6" />
                Practice All Recent Mistakes
              </Link>
            </div>

            {cooldownChapters.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cooldownChapters.map(({ chapter, count }) => (
                  <div key={chapter.id} className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-lg mb-1">{chapter.name}</h3>
                      <p className="text-orange-600 font-medium mb-6">{count} mistakes in cooldown</p>
                    </div>
                    <Link
                      href={`/redemption/quiz?chapterId=${chapter.id}&cooldown=true`}
                      className="flex items-center justify-center gap-2 w-full py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 font-medium rounded-lg transition-colors border border-orange-200"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Practice Chapter
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
