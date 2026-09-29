import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserSession } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { quizId, score, total } = await request.json()

    if (typeof quizId !== 'number' || typeof score !== 'number' || typeof total !== 'number') {
      return NextResponse.json({ error: 'Invalid data types' }, { status: 400 })
    }

    await prisma.quizAttempt.create({
      data: {
        userId: session.id,
        quizId,
        score,
        total
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
