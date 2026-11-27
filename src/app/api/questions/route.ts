import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { getUserSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please log in to view questions.' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const quizIdParam = searchParams.get('quizId')
    const chapterIdParam = searchParams.get('chapterId')
    const isRandom = searchParams.get('random') === 'true' || searchParams.get('shuffle') === 'true'
    const limitParam = searchParams.get('limit')
    
    if (!quizIdParam && !chapterIdParam) {
       return NextResponse.json({ error: 'quizId or chapterId is required' }, { status: 400 })
    }

    const whereClause: any = {}
    if (quizIdParam) {
      whereClause.quizId = parseInt(quizIdParam, 10)
    } else if (chapterIdParam) {
      whereClause.quiz = { chapterId: parseInt(chapterIdParam, 10) }
    }

    let questions = await prisma.question.findMany({
      where: whereClause,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        questionText: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        optionE: true,
        explanationA: true,
        explanationB: true,
        explanationC: true,
        explanationD: true,
        explanationE: true,
        topic: true,
        difficulty: true,
        explanation: true,
        voiceQuestion: true,
        voiceOptions: true,
        voiceExplanation: true,
        correctAnswer: true, 
        concepts: {
          select: {
            id: true,
            term: true,
            slug: true,
            category: true
          }
        }
      }
    })

    if (isRandom) {
      // Fisher-Yates shuffle
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
    }

    if (limitParam) {
      const limit = parseInt(limitParam, 10)
      if (!isNaN(limit) && limit > 0) {
        questions = questions.slice(0, limit)
      }
    }

    return NextResponse.json({ success: true, questions })
  } catch (error) {
    console.error('Error fetching questions:', error)
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
  }
}
