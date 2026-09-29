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
    const cooldown = searchParams.get('cooldown') === 'true'

    const whereClause: any = { 
      userId: session.id,
      nextReviewAt: cooldown ? { gt: new Date() } : { lte: new Date() }
    }
    if (chapterId) {
      whereClause.question = { quiz: { chapterId: parseInt(chapterId, 10) } }
    }

    const mistakes = await prisma.userMistake.findMany({
      where: whereClause,
      include: {
        question: true
      },
      orderBy: { id: 'asc' }
    })

    const questions = mistakes.map(m => m.question)

    return NextResponse.json({ questions })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
