import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('admin_session')

    if (!sessionCookie || sessionCookie.value !== 'true') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const questionId = parseInt(params.id, 10)
    if (isNaN(questionId)) {
      return NextResponse.json({ error: 'Invalid question ID' }, { status: 400 })
    }

    await prisma.question.delete({
      where: { id: questionId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting question:', error)
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 })
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('admin_session')

    if (!sessionCookie || sessionCookie.value !== 'true') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const questionId = parseInt(params.id, 10)
    if (isNaN(questionId)) {
      return NextResponse.json({ error: 'Invalid question ID' }, { status: 400 })
    }

    const body = await request.json()
    const { 
      questionText, optionA, optionB, optionC, optionD, optionE, correctAnswer,
      explanationA, explanationB, explanationC, explanationD, explanationE,
      topic, explanation
    } = body

    if (!questionText || !optionA || !optionB || !correctAnswer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: {
        questionText,
        optionA,
        optionB,
        optionC: optionC || '',
        optionD: optionD || '',
        optionE: optionE || null,
        explanationA: explanationA || null,
        explanationB: explanationB || null,
        explanationC: explanationC || null,
        explanationD: explanationD || null,
        explanationE: explanationE || null,
        topic: topic || null,
        explanation: explanation || null,
        correctAnswer: correctAnswer.toUpperCase()
      }
    })

    return NextResponse.json({ success: true, question: updatedQuestion })
  } catch (error) {
    console.error('Error updating question:', error)
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 })
  }
}
