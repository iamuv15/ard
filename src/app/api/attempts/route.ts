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
    const { quizId, score, total, questionResults, sourceType } = body

    if (typeof quizId === 'number' && typeof score === 'number' && typeof total === 'number') {
      const quizExists = await prisma.quiz.findUnique({
        where: { id: quizId },
        select: { id: true }
      })
      if (quizExists) {
        await prisma.quizAttempt.create({
          data: {
            userId: session.id,
            quizId,
            score,
            total
          }
        })
      }
    }

    // Optional batch of individual question attempts (used by MockEngineClient)
    if (Array.isArray(questionResults) && questionResults.length > 0) {
      const qIds = questionResults
        .map((r: any) => Number(r?.questionId))
        .filter((id: number) => Number.isFinite(id))

      if (qIds.length > 0) {
        const dbQuestions = await prisma.question.findMany({
          where: { id: { in: qIds } },
          select: { id: true, quiz: { select: { chapterId: true } } }
        })
        const chapterMap = new Map<number, number>()
        for (const q of dbQuestions) {
          if (q.quiz?.chapterId) chapterMap.set(q.id, q.quiz.chapterId)
        }

        const logRows = questionResults
          .map((r: any) => {
            const qId = Number(r?.questionId)
            const cId = chapterMap.get(qId)
            if (!cId) return null
            return {
              userId: session.id,
              questionId: qId,
              chapterId: cId,
              isCorrect: Boolean(r?.isCorrect),
              sourceType: typeof sourceType === 'string' ? sourceType : 'MOCK'
            }
          })
          .filter((row): row is NonNullable<typeof row> => row !== null)

        if (logRows.length > 0) {
          await prisma.questionAttemptLog.createMany({ data: logRows })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving attempts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
