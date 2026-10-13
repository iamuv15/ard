import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'

async function checkAdminAuth() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('admin_session')
  return sessionCookie && (sessionCookie.value === 'true' || sessionCookie.value === 'authenticated')
}

export async function GET() {
  try {
    const isAdmin = await checkAdminAuth()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const chapters = await prisma.chapter.findMany({
      include: {
        mindMap: true,
        _count: {
          select: { concepts: true }
        },
        quizzes: {
          include: {
            _count: { select: { questions: true } }
          }
        }
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }]
    })

    const formatted = chapters.map(ch => {
      const totalQuestions = ch.quizzes.reduce((acc, q) => acc + q._count.questions, 0)
      const treeData: any = ch.mindMap?.treeData || null
      const categoriesCount = treeData?.categories?.length || 0
      const keywordsCount = ch.mindMap?.rawKeywords?.length || 0

      return {
        id: ch.id,
        name: ch.name,
        cohort: ch.cohort,
        totalQuestions,
        mindMap: ch.mindMap ? {
          id: ch.mindMap.id,
          lastSyncAt: ch.mindMap.lastSyncAt,
          keywordsCount,
          categoriesCount,
          syllabusAudit: treeData?.syllabusAudit || null
        } : null,
        conceptsCount: ch._count.concepts
      }
    })

    return NextResponse.json({ chapters: formatted })
  } catch (error: any) {
    console.error('Error fetching admin mindmaps overview:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
