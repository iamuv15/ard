import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const quizIdParam = searchParams.get('quizId')
    
    if (!quizIdParam) {
       return NextResponse.json({ error: 'quizId is required' }, { status: 400 })
    }

    const quizId = parseInt(quizIdParam, 10)

    const questions = await prisma.question.findMany({
      where: { quizId },
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
        explanation: true,
        correctAnswer: true, 
      }
    })

    return NextResponse.json({ success: true, questions })
  } catch (error) {
    console.error('Error fetching questions:', error)
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
  }
}
