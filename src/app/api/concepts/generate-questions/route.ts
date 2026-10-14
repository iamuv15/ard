import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserSession } from '@/lib/auth'
import { callGemini } from '@/lib/terminologyEngine'

export async function POST(request: Request) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      conceptId,
      conceptIds,
      conceptSlug,
      conceptSlugs,
      chapterId,
      quizId,
      count = 5
    } = body

    const targetCount = Math.min(Math.max(parseInt(count, 10) || 5, 3), 10)

    // Build concepts query
    const idList: number[] = []
    if (Array.isArray(conceptIds)) idList.push(...conceptIds.map(n => parseInt(n, 10)).filter(n => !isNaN(n)))
    else if (conceptId) {
      const id = parseInt(conceptId, 10)
      if (!isNaN(id)) idList.push(id)
    }

    const slugList: string[] = []
    if (Array.isArray(conceptSlugs)) slugList.push(...conceptSlugs.filter(Boolean))
    else if (conceptSlug) slugList.push(conceptSlug)

    const where: any = {}
    if (idList.length > 0) where.id = { in: idList }
    else if (slugList.length > 0) where.slug = { in: slugList }
    else if (chapterId) where.chapterId = parseInt(chapterId, 10)
    else {
      return NextResponse.json({ error: 'No concepts specified' }, { status: 400 })
    }

    const concepts = await prisma.chapterConcept.findMany({
      where,
      include: {
        chapter: {
          include: {
            quizzes: {
              take: 1,
              orderBy: { id: 'asc' }
            }
          }
        }
      },
      take: 5
    })

    if (concepts.length === 0) {
      return NextResponse.json({ error: 'No matching concepts found' }, { status: 404 })
    }

    // Determine target quiz to link questions
    let targetQuizId: number | null = null
    if (quizId) {
      const q = await prisma.quiz.findUnique({ where: { id: parseInt(quizId, 10) } })
      if (q) targetQuizId = q.id
    }
    if (!targetQuizId) {
      targetQuizId = concepts[0]?.chapter?.quizzes[0]?.id || null
    }

    if (!targetQuizId) {
      return NextResponse.json({ error: 'No active quiz available in this chapter to attach questions' }, { status: 400 })
    }

    // Prepare context for Gemini 3.5 Flash Lite
    const conceptsSummary = concepts.map((c, i) => `
[Concept ${i + 1}]
- Term: ${c.term} (slug: ${c.slug})
- Category: ${c.category} ${c.subCategory ? `> ${c.subCategory}` : ''}
- Definition: ${c.definition}
- Content / Metrics:
${c.content}
${c.examTraps ? `- High-Yield Exam Traps:\n${c.examTraps}` : ''}
`).join('\n---\n')

    const systemPrompt = `You are a senior agricultural and veterinary examination creator (NABARD ARD, ICAR JRF/SRF, State PSCs).
Generate high-yield, realistic, multiple-choice exam questions directly targeting the high-yield facts, metrics, and exam traps documented in the provided concepts.

STRICT REQUIREMENTS:
1. Generate exactly ${targetCount} questions distributed among the provided concepts.
2. Formulate 4 clear options: optionA, optionB, optionC, optionD.
3. Target real exam confusion (e.g., horn shape differences between breeds, lactation lengths, nutrient percentages, diagnostic signs).
4. Exactly one correct answer as an uppercase letter: 'A', 'B', 'C', or 'D'.
5. Include a comprehensive explanation covering why the correct option is right and the exam traps behind incorrect choices.
6. Return ONLY a valid JSON array of objects without markdown formatting or commentary.

JSON Schema format:
[
  {
    "questionText": "...",
    "optionA": "...",
    "optionB": "...",
    "optionC": "...",
    "optionD": "...",
    "correctAnswer": "A",
    "explanation": "...",
    "conceptSlug": "slug-of-the-concept"
  }
]`

    const userPrompt = `Generate ${targetCount} exam trap questions for these concepts:\n\n${conceptsSummary}`

    const rawResult: any = await callGemini({
      systemPrompt,
      userPrompt,
      modelOverride: 'gemini-3.5-flash-lite',
      allowThinking: false,
      temperature: 0.3
    })

    const generatedArray = Array.isArray(rawResult)
      ? rawResult
      : (Array.isArray(rawResult?.questions) ? rawResult.questions : null)

    if (!generatedArray || generatedArray.length === 0) {
      return NextResponse.json({ error: 'AI did not return valid questions. Please try again.' }, { status: 502 })
    }

    // Save generated questions to the database permanently
    const createdQuestions: any[] = []
    for (const item of generatedArray) {
      if (!item.questionText || !item.optionA || !item.optionB || !item.correctAnswer) continue

      const normAnswer = item.correctAnswer.toString().trim().toUpperCase().charAt(0)
      if (!['A', 'B', 'C', 'D'].includes(normAnswer)) continue

      const matchedConcept = concepts.find(c =>
        (item.conceptSlug && c.slug.toLowerCase() === item.conceptSlug.toLowerCase()) ||
        c.term.toLowerCase().includes(item.conceptSlug?.toLowerCase() || '')
      ) || concepts[0]

      const newQ = await prisma.question.create({
        data: {
          quizId: targetQuizId,
          questionText: item.questionText.trim(),
          optionA: item.optionA.trim(),
          optionB: item.optionB.trim(),
          optionC: item.optionC ? item.optionC.trim() : 'None of the above',
          optionD: item.optionD ? item.optionD.trim() : 'All of the above',
          correctAnswer: normAnswer,
          explanation: item.explanation ? item.explanation.trim() : `Exam-trap practice question for ${matchedConcept.term}`,
          topic: matchedConcept.term,
          isEnriched: true,
          concepts: {
            connect: [{ id: matchedConcept.id }]
          }
        },
        include: {
          concepts: {
            select: {
              id: true,
              slug: true,
              term: true
            }
          }
        }
      })

      createdQuestions.push(newQ)
    }

    return NextResponse.json({
      success: true,
      count: createdQuestions.length,
      questions: createdQuestions,
      questionIds: createdQuestions.map(q => q.id),
      message: `Generated and permanently saved ${createdQuestions.length} AI questions to database.`
    })
  } catch (error: any) {
    console.error('Failed to generate AI questions:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to generate AI questions' },
      { status: 500 }
    )
  }
}
