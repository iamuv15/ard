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
    const chapterId = searchParams.get('chapterId')
    const quizId = searchParams.get('quizId')
    const questionIdsParam = searchParams.get('questionIds')
    const conceptIdsParam = searchParams.get('conceptIds')
    const cooldown = searchParams.get('cooldown') === 'true'

    // If conceptIds is specified, retrieve ALL questions for those concepts in the chapter
    if (conceptIdsParam) {
      const cIds = conceptIdsParam.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
      if (cIds.length > 0) {
        const whereCond: any = {
          concepts: {
            some: { id: { in: cIds } }
          }
        }
        if (chapterId) {
          whereCond.quiz = { chapterId: parseInt(chapterId, 10) }
        }
        const questions = await prisma.question.findMany({
          where: whereCond,
          orderBy: { id: 'asc' }
        })
        return NextResponse.json({ questions })
      }
    }

    const whereClause: any = { 
      userId: session.id
    }

    // Only apply time gate if not a targeted quiz/retest drill
    if (!quizId && !questionIdsParam) {
      whereClause.nextReviewAt = cooldown ? { gt: new Date() } : { lte: new Date() }
    }

    if (questionIdsParam) {
      const ids = questionIdsParam.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
      if (ids.length > 0) {
        whereClause.questionId = { in: ids }
      }
    } else if (quizId) {
      whereClause.question = { quizId: parseInt(quizId, 10) }
    } else if (chapterId) {
      whereClause.question = { quiz: { chapterId: parseInt(chapterId, 10) } }
    }

    const mistakes = await prisma.userMistake.findMany({
      where: whereClause,
      include: {
        question: true
      },
      orderBy: { id: 'asc' }
    })

    const questions = mistakes.map((m: any) => m.question)

    return NextResponse.json({ questions })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
