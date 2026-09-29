import prisma from '@/lib/prisma'
import { getUserSession } from '@/lib/auth'
import CourseDashboard from '@/components/CourseDashboard'
import PublicLandingPage from '@/components/PublicLandingPage'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const session = await getUserSession()

  const chapters = await prisma.chapter.findMany({
    include: {
      quizzes: {
        include: {
          _count: {
            select: { questions: true }
          }
        }
      }
    },
    orderBy: { name: 'asc' }
  })

  // If not logged in: Show the rich preview landing page reflecting what's inside
  if (!session) {
    return <PublicLandingPage chapters={chapters} />
  }

  // If logged in: Show the actual course dashboard with full quiz access
  let mistakeCount = 0
  let bookmarkCount = 0
  if (session) {
    const [mCount, bCount] = await Promise.all([
      prisma.userMistake.count({ where: { userId: session.id } }),
      prisma.userBookmark.count({ where: { userId: session.id } })
    ])
    mistakeCount = mCount
    bookmarkCount = bCount
  }

  return (
    <CourseDashboard 
      chapters={chapters} 
      mistakeCount={mistakeCount} 
      bookmarkCount={bookmarkCount} 
      userName={session.name || null} 
    />
  )
}
