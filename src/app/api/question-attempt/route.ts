import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserSession } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const questionId = Number(body?.questionId)
    const isCorrect = Boolean(body?.isCorrect)
    const sourceType = typeof body?.sourceType === 'string' ? body.sourceType : 'PRACTICE'

    if (!Number.isFinite(questionId)) {
      return NextResponse.json({ error: 'Valid questionId is required' }, { status: 400 })
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, quiz: { select: { chapterId: true } } }
    })

    if (!question?.quiz?.chapterId) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    await prisma.questionAttemptLog.create({
      data: {
        userId: session.id,
        questionId: question.id,
        chapterId: question.quiz.chapterId,
        isCorrect,
        sourceType
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error recording question attempt:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
