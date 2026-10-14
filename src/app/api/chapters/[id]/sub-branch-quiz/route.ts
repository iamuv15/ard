import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const chapterId = parseInt(params.id, 10)
    if (isNaN(chapterId)) {
      return NextResponse.json({ error: 'Invalid chapter ID' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const conceptIdsParam = searchParams.get('conceptIds')
    const subCategory = searchParams.get('subCategory')

    let conceptIds: number[] = []
    if (conceptIdsParam) {
      conceptIds = conceptIdsParam
        .split(',')
        .map(id => parseInt(id.trim(), 10))
        .filter(id => !isNaN(id))
    }

    // If subCategory was given but no IDs, fetch concept IDs in this subCategory
    if (conceptIds.length === 0 && subCategory) {
      const conceptsInSub = await prisma.chapterConcept.findMany({
        where: {
          chapterId,
          subCategory: { equals: subCategory, mode: 'insensitive' }
        },
        select: { id: true }
      })
      conceptIds = conceptsInSub.map(c => c.id)
    }

    let questions: any[] = []

    if (conceptIds.length > 0) {
      // Find questions directly tagged with these concepts
      questions = await prisma.question.findMany({
        where: {
          quiz: { chapterId },
          concepts: {
            some: { id: { in: conceptIds } }
          }
        },
        take: 5,
        select: {
          id: true,
          questionText: true,
          optionA: true,
          optionB: true,
          optionC: true,
          optionD: true,
          optionE: true,
          correctAnswer: true,
          explanation: true,
          simpleExplanation: true,
          concepts: {
            select: { id: true, term: true, slug: true }
          }
        }
      })
    }

    // Fallback if no questions are specifically tagged yet
    if (questions.length < 3) {
      const needed = 5 - questions.length
      const existingIds = questions.map(q => q.id)
      const fallbackQuestions = await prisma.question.findMany({
        where: {
          quiz: { chapterId },
          id: { notIn: existingIds }
        },
        take: needed,
        select: {
          id: true,
          questionText: true,
          optionA: true,
          optionB: true,
          optionC: true,
          optionD: true,
          optionE: true,
          correctAnswer: true,
          explanation: true,
          simpleExplanation: true,
          concepts: {
            select: { id: true, term: true, slug: true }
          }
        }
      })
      questions = [...questions, ...fallbackQuestions]
    }

    return NextResponse.json({ questions })
  } catch (error: any) {
    console.error('Error fetching sub-branch quiz:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
