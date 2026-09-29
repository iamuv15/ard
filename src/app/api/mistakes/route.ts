import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserSession } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { questionId } = await request.json()

    const nextReview = new Date();
    nextReview.setHours(nextReview.getHours() + 24);

    await prisma.userMistake.upsert({
      where: {
        userId_questionId: {
          userId: session.id,
          questionId
        }
      },
      update: {
        reviewLevel: 0,
        nextReviewAt: nextReview
      },
      create: {
        userId: session.id,
        questionId,
        reviewLevel: 0,
        nextReviewAt: nextReview
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { questionId } = await request.json()

    // Find current mistake
    const mistake = await prisma.userMistake.findUnique({
      where: {
        userId_questionId: {
          userId: session.id,
          questionId
        }
      }
    })

    if (!mistake) {
      return NextResponse.json({ error: 'Mistake not found' }, { status: 404 })
    }

    const newLevel = mistake.reviewLevel + 1;
    let daysToAdd = 1; // Default fallback
    if (newLevel === 1) daysToAdd = 3;
    else if (newLevel === 2) daysToAdd = 7;
    else if (newLevel === 3) daysToAdd = 14;
    else if (newLevel >= 4) daysToAdd = 30;

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + daysToAdd);

    await prisma.userMistake.update({
      where: {
        userId_questionId: {
          userId: session.id,
          questionId
        }
      },
      data: {
        reviewLevel: newLevel,
        nextReviewAt: nextReview
      }
    })

    return NextResponse.json({ success: true, newLevel, nextReviewAt: nextReview })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
