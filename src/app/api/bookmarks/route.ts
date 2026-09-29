import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserSession } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeQuestions = searchParams.get('includeQuestions') === 'true'
    const chapterId = searchParams.get('chapterId')
    const quizId = searchParams.get('quizId')

    const where: any = { userId: session.id }
    if (quizId) {
      where.question = { quizId: parseInt(quizId, 10) }
    } else if (chapterId) {
      where.question = { quiz: { chapterId: parseInt(chapterId, 10) } }
    }

    const bookmarks = await prisma.userBookmark.findMany({
      where,
      include: includeQuestions
        ? {
            question: {
              include: {
                quiz: {
                  select: { id: true, name: true, chapter: { select: { id: true, name: true } } }
                }
              }
            }
          }
        : undefined,
      orderBy: { createdAt: 'desc' }
    })

    const questionIds = bookmarks.map(b => b.questionId)

    return NextResponse.json({
      success: true,
      count: bookmarks.length,
      questionIds,
      bookmarks
    })
  } catch (error: any) {
    console.error('Error fetching bookmarks:', error)
    return NextResponse.json({ error: 'Failed to fetch bookmarks' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { questionId } = await request.json()
    if (!questionId || typeof questionId !== 'number') {
      return NextResponse.json({ error: 'Valid questionId is required' }, { status: 400 })
    }

    // Check if bookmark already exists
    const existing = await prisma.userBookmark.findUnique({
      where: {
        userId_questionId: {
          userId: session.id,
          questionId
        }
      }
    })

    if (existing) {
      // Toggle off (remove)
      await prisma.userBookmark.delete({
        where: { id: existing.id }
      })
      return NextResponse.json({ success: true, bookmarked: false })
    } else {
      // Toggle on (create)
      await prisma.userBookmark.create({
        data: {
          userId: session.id,
          questionId
        }
      })
      return NextResponse.json({ success: true, bookmarked: true })
    }
  } catch (error: any) {
    console.error('Error toggling bookmark:', error)
    return NextResponse.json({ error: 'Failed to toggle bookmark' }, { status: 500 })
  }
}
