import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('admin_session')

    if (!sessionCookie || sessionCookie.value !== 'true') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sourceQuizId = parseInt(params.id, 10)
    if (isNaN(sourceQuizId)) {
      return NextResponse.json({ error: 'Invalid source quiz ID' }, { status: 400 })
    }

    const body = await request.json()
    const targetQuizId = parseInt(body.targetQuizId, 10)
    if (isNaN(targetQuizId)) {
      return NextResponse.json({ error: 'Invalid target quiz ID' }, { status: 400 })
    }

    if (sourceQuizId === targetQuizId) {
      return NextResponse.json({ error: 'Cannot merge a quiz into itself' }, { status: 400 })
    }

    // Perform atomic transaction: move questions, then delete source quiz
    await prisma.$transaction(async (tx) => {
      await tx.question.updateMany({
        where: { quizId: sourceQuizId },
        data: { quizId: targetQuizId }
      })
      await tx.quiz.delete({
        where: { id: sourceQuizId }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error merging quiz:', error)
    return NextResponse.json({ error: 'Failed to merge quiz' }, { status: 500 })
  }
}
