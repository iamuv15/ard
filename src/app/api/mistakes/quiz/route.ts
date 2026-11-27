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
    const retention = searchParams.get('retention') === 'true'

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

    const includeAll = searchParams.get('all') === 'true'
    const now = new Date()

    if (!quizId && !questionIdsParam) {
      if (includeAll) {
        // Chapter Forge drill: include unresolved mistakes (reviewLevel === 0) OR due retention reviews
        whereClause.OR = [
          { reviewLevel: 0 },
          { nextReviewAt: { lte: now } }
        ]
      } else if (cooldown) {
        // Only recent failures (reviewLevel === 0) waiting out 24h cooldown
        whereClause.reviewLevel = 0
        whereClause.nextReviewAt = { gt: now }
      } else if (retention) {
        // Only redeemed questions (reviewLevel >= 1) scheduled for future retention checks
        whereClause.reviewLevel = { gte: 1 }
        whereClause.nextReviewAt = { gt: now }
      } else {
        // Default Redemption queue: anything due for review right now
        whereClause.nextReviewAt = { lte: now }
      }
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
