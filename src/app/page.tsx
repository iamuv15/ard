import Link from 'next/link'
import { BrainCircuit, BookOpen, ShieldAlert } from 'lucide-react'
import prisma from '@/lib/prisma'
import { getUserSession } from '@/lib/auth'
import LogOutButton from '@/components/LogOutButton'
import CourseDashboard from '@/components/CourseDashboard'

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
    orderBy: { createdAt: 'asc' }
  })

  let mistakeCount = 0
  if (session) {
    mistakeCount = await prisma.userMistake.count({
      where: { userId: session.id }
    })
  }

  return <CourseDashboard chapters={chapters} mistakeCount={mistakeCount} userName={session?.name || null} />
}
