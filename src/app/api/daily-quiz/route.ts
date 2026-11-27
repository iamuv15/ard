import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserSession } from '@/lib/auth'
import { generateOrFetchDailyQuiz, loadFullDailyQuiz } from '@/lib/dailyQuizEngine'

function serializeDailyQuiz(quiz: Awaited<ReturnType<typeof loadFullDailyQuiz>>) {
  if (!quiz) return null

  return {
    id: quiz.id,
    periodKey: quiz.periodKey,
    status: quiz.status,
    focusChapters: quiz.focusChapters,
    totalQuestions: quiz.totalQuestions,
    currentIndex: quiz.currentIndex,
    score: quiz.score,
    completedAt: quiz.completedAt,
    questions: quiz.questions.map((dq) => {
      const snap = dq.snapshotJson as Record<string, any> | null
      const q = dq.question

      return {
        dailyQuestionId: dq.id,
        orderIndex: dq.orderIndex,
        questionId: dq.questionId,
        chapterId: dq.chapterId || q?.quiz?.chapterId || null,
        chapterName: dq.chapterName || q?.quiz?.chapter?.name || 'General ARD',
        sourceBucket: dq.sourceBucket,
        selectedOption: dq.selectedOption,
        isCorrect: dq.isCorrect,
        isFlagged: dq.isFlagged,
        answeredAt: dq.answeredAt,
        // Question content (prefer reframed snapshotJson when present, else bank question)
        questionText: snap?.questionText || q?.questionText || '',
        optionA: snap?.optionA || q?.optionA || '',
        optionB: snap?.optionB || q?.optionB || '',
        optionC: snap?.optionC || q?.optionC || '',
        optionD: snap?.optionD || q?.optionD || '',
        optionE: snap ? (snap.optionE ?? null) : (q?.optionE ?? null),
        explanationA: snap ? null : (q?.explanationA ?? null),
        explanationB: snap ? null : (q?.explanationB ?? null),
        explanationC: snap ? null : (q?.explanationC ?? null),
        explanationD: snap ? null : (q?.explanationD ?? null),
        explanationE: snap ? null : (q?.explanationE ?? null),
        correctAnswer: (snap?.correctAnswer || q?.correctAnswer || 'A').toUpperCase(),
        explanation: snap?.explanation || q?.explanation || null,
        simpleExplanation: snap ? null : (q?.simpleExplanation ?? null),
        topic: snap?.topic || q?.topic || null,
        difficulty: snap?.difficulty || q?.difficulty || null,
        voiceQuestion: snap ? null : (q?.voiceQuestion ?? null),
        voiceOptions: snap ? null : (q?.voiceOptions ?? null),
        voiceExplanation: snap ? null : (q?.voiceExplanation ?? null),
        concepts: q?.concepts || [],
        isReframed: dq.sourceBucket === 'AI_REFRAMED',
      }
    }),
  }
}

export async function GET() {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await generateOrFetchDailyQuiz(session.id)

    if (!result.unlocked) {
      return NextResponse.json({
        unlocked: false,
        periodKey: result.periodKey,
        eligibility: result.eligibility,
        quiz: null,
      })
    }

    if ('generating' in result && result.generating) {
      return NextResponse.json({
        unlocked: true,
        periodKey: result.periodKey,
        eligibility: result.eligibility,
        generating: true,
        quiz: null,
      })
    }

    return NextResponse.json({
      unlocked: true,
      periodKey: result.periodKey,
      eligibility: result.eligibility,
      quiz: serializeDailyQuiz(result.quiz as any),
    })
  } catch (error) {
    console.error('GET /api/daily-quiz error:', error)
    return NextResponse.json({ error: 'Failed to load daily quiz' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { dailyQuizId, dailyQuestionId, selectedOption, isFlagged, currentIndex } = body

    if (!dailyQuizId) {
      return NextResponse.json({ error: 'dailyQuizId is required' }, { status: 400 })
    }

    const quiz = await prisma.dailyRetentionQuiz.findUnique({
      where: { id: String(dailyQuizId) },
    })

    if (!quiz || quiz.userId !== session.id) {
      return NextResponse.json({ error: 'Daily quiz not found' }, { status: 404 })
    }

    let updatedQuestion: {
      id: number
      selectedOption: string | null
      isCorrect: boolean | null
      isFlagged: boolean
    } | null = null

    if (dailyQuestionId && quiz.status !== 'completed') {
      const dq = await prisma.dailyRetentionQuestion.findUnique({
        where: { id: Number(dailyQuestionId) },
        include: {
          question: {
            select: {
              id: true,
              correctAnswer: true,
              quiz: { select: { chapterId: true } },
            },
          },
        },
      })

      if (!dq || dq.dailyQuizId !== quiz.id) {
        return NextResponse.json({ error: 'Daily question not found' }, { status: 404 })
      }

      const dataToUpdate: any = {}
      if (typeof isFlagged === 'boolean') {
        dataToUpdate.isFlagged = isFlagged
      }

      const isFirstTimeAnswering =
        typeof selectedOption === 'string' &&
        selectedOption.trim().length > 0 &&
        dq.selectedOption === null

      if (typeof selectedOption === 'string' && selectedOption.trim().length > 0 && dq.selectedOption === null) {
        const snap = dq.snapshotJson as Record<string, any> | null
        const correctKey = String(
          snap?.correctAnswer || dq.question?.correctAnswer || 'A'
        )
          .toUpperCase()
          .trim()
        const normalizedChoice = selectedOption.toUpperCase().trim()
        const isCorrect = normalizedChoice === correctKey

        dataToUpdate.selectedOption = normalizedChoice
        dataToUpdate.isCorrect = isCorrect
        dataToUpdate.answeredAt = new Date()

        // Log QuestionAttemptLog & sync UserMistake on first answer
        if (isFirstTimeAnswering && dq.questionId) {
          const chId = dq.chapterId || dq.question?.quiz?.chapterId
          if (chId) {
            await prisma.questionAttemptLog.create({
              data: {
                userId: session.id,
                questionId: dq.questionId,
                chapterId: chId,
                isCorrect,
                sourceType: 'DAILY_QUIZ',
              },
            })
          }

          if (!isCorrect) {
            const nextReview = new Date()
            nextReview.setHours(nextReview.getHours() + 24)
            await prisma.userMistake.upsert({
              where: {
                userId_questionId: {
                  userId: session.id,
                  questionId: dq.questionId,
                },
              },
              update: { reviewLevel: 0, nextReviewAt: nextReview },
              create: {
                userId: session.id,
                questionId: dq.questionId,
                reviewLevel: 0,
                nextReviewAt: nextReview,
              },
            })
          } else {
            const existingMistake = await prisma.userMistake.findUnique({
              where: {
                userId_questionId: {
                  userId: session.id,
                  questionId: dq.questionId,
                },
              },
            })
            if (existingMistake) {
              const newLevel = existingMistake.reviewLevel + 1
              let daysToAdd = 3
              if (newLevel === 2) daysToAdd = 7
              else if (newLevel === 3) daysToAdd = 14
              else if (newLevel >= 4) daysToAdd = 30
              const nextReview = new Date()
              nextReview.setDate(nextReview.getDate() + daysToAdd)

              await prisma.userMistake.update({
                where: {
                  userId_questionId: {
                    userId: session.id,
                    questionId: dq.questionId,
                  },
                },
                data: {
                  reviewLevel: newLevel,
                  nextReviewAt: nextReview,
                },
              })
            }
          }
        }
      }

      if (Object.keys(dataToUpdate).length > 0) {
        const resQ = await prisma.dailyRetentionQuestion.update({
          where: { id: dq.id },
          data: dataToUpdate,
          select: { id: true, selectedOption: true, isCorrect: true, isFlagged: true },
        })
        updatedQuestion = resQ
      }
    }

    // Update quiz status (pending -> in_progress) and currentIndex
    const quizUpdateData: any = {}
    if (typeof currentIndex === 'number' && currentIndex >= 0 && currentIndex < quiz.totalQuestions) {
      quizUpdateData.currentIndex = currentIndex
    }
    if (quiz.status === 'pending' && updatedQuestion?.selectedOption) {
      quizUpdateData.status = 'in_progress'
    }

    let nextStatus = quiz.status
    if (Object.keys(quizUpdateData).length > 0) {
      const updatedQuiz = await prisma.dailyRetentionQuiz.update({
        where: { id: quiz.id },
        data: quizUpdateData,
        select: { status: true },
      })
      nextStatus = updatedQuiz.status
    }

    return NextResponse.json({
      success: true,
      status: nextStatus,
      updatedQuestion,
    })
  } catch (error) {
    console.error('PATCH /api/daily-quiz error:', error)
    return NextResponse.json({ error: 'Failed to save answer' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const dailyQuizId = body?.dailyQuizId
    if (!dailyQuizId) {
      return NextResponse.json({ error: 'dailyQuizId is required' }, { status: 400 })
    }

    const quiz = await prisma.dailyRetentionQuiz.findUnique({
      where: { id: String(dailyQuizId) },
      include: { questions: true },
    })

    if (!quiz || quiz.userId !== session.id) {
      return NextResponse.json({ error: 'Daily quiz not found' }, { status: 404 })
    }

    if (quiz.status === 'completed') {
      const full = await loadFullDailyQuiz(quiz.id)
      return NextResponse.json({ success: true, quiz: serializeDailyQuiz(full) })
    }

    const score = quiz.questions.filter((q) => q.isCorrect === true).length

    await prisma.dailyRetentionQuiz.update({
      where: { id: quiz.id },
      data: {
        status: 'completed',
        score,
        completedAt: new Date(),
      },
    })

    const full = await loadFullDailyQuiz(quiz.id)
    return NextResponse.json({
      success: true,
      quiz: serializeDailyQuiz(full),
    })
  } catch (error) {
    console.error('POST /api/daily-quiz error:', error)
    return NextResponse.json({ error: 'Failed to complete daily quiz' }, { status: 500 })
  }
}
