import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserSession } from '@/lib/auth'

const QUESTION_SELECT = {
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

function shuffleQuestions<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export async function GET(request: NextRequest) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please log in to view questions.' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const quizIdParam = searchParams.get('quizId')
    const chapterIdParam = searchParams.get('chapterId')
    const idsParam = searchParams.get('ids')
    const difficultyParam = searchParams.get('difficulty')
    const orderParam = searchParams.get('order')
    const isRandom = searchParams.get('random') === 'true' || searchParams.get('shuffle') === 'true'
    const limitParam = searchParams.get('limit')

    if (!quizIdParam && !chapterIdParam && !idsParam) {
      return NextResponse.json({ error: 'quizId, chapterId, or ids is required' }, { status: 400 })
    }

    const whereClause: any = {}
    if (quizIdParam) {
      whereClause.quizId = parseInt(quizIdParam, 10)
    }
    if (chapterIdParam) {
      whereClause.quiz = { chapterId: parseInt(chapterIdParam, 10) }
    }
    if (difficultyParam && ['EASY', 'MEDIUM', 'HARD'].includes(difficultyParam.toUpperCase())) {
      whereClause.difficulty = difficultyParam.toUpperCase()
    }
    if (idsParam) {
      const parsedIds = idsParam
        .split(',')
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !isNaN(n))
      if (parsedIds.length > 0) {
        whereClause.id = { in: parsedIds }
      }
    }

    let questions = await prisma.question.findMany({
      where: whereClause,
      orderBy: orderParam === 'chronological'
        ? [{ quiz: { order: 'asc' } }, { id: 'asc' }]
        : { id: 'asc' },
      select: QUESTION_SELECT
    })

    if (isRandom && orderParam !== 'chronological') {
      questions = shuffleQuestions(questions)
    }

    if (limitParam && limitParam !== 'all') {
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

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please log in to view questions.' }, { status: 401 })
    }

    const body = await request.json()
    const rawIds = Array.isArray(body?.ids) ? body.ids : []
    const ids = rawIds
      .map((id: unknown) => typeof id === 'number' ? id : parseInt(String(id), 10))
      .filter((id: number) => !isNaN(id))

    const chapterId = body?.chapterId ? parseInt(String(body.chapterId), 10) : null
    const difficulty = typeof body?.difficulty === 'string' && ['EASY', 'MEDIUM', 'HARD'].includes(body.difficulty.toUpperCase())
      ? body.difficulty.toUpperCase()
      : null
    const shuffle = body?.shuffle === true
    const order = body?.order === 'chronological' ? 'chronological' : 'relevance'
    const limit = body?.limit && body.limit !== 'all' ? parseInt(String(body.limit), 10) : null

    if (ids.length === 0 && !chapterId) {
      return NextResponse.json({ error: 'ids or chapterId is required' }, { status: 400 })
    }

    const whereClause: any = {}
    if (ids.length > 0) {
      whereClause.id = { in: ids }
    }
    if (chapterId && !isNaN(chapterId)) {
      whereClause.quiz = { chapterId }
    }
    if (difficulty) {
      whereClause.difficulty = difficulty
    }

    let questions = await prisma.question.findMany({
      where: whereClause,
      orderBy: [{ quiz: { order: 'asc' } }, { id: 'asc' }],
      select: QUESTION_SELECT
    })

    if (ids.length > 0 && order === 'relevance' && !shuffle) {
      const rankMap = new Map<number, number>()
      ids.forEach((id: number, idx: number) => rankMap.set(id, idx))
      questions.sort((a, b) => (rankMap.get(a.id) ?? 999999) - (rankMap.get(b.id) ?? 999999))
    } else if (shuffle) {
      questions = shuffleQuestions(questions)
    }

    if (limit && !isNaN(limit) && limit > 0) {
      questions = questions.slice(0, limit)
    }

    return NextResponse.json({ success: true, questions })
  } catch (error) {
    console.error('Error fetching custom questions:', error)
    return NextResponse.json({ error: 'Failed to fetch custom questions' }, { status: 500 })
  }
}
