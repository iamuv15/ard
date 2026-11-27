import prisma from '@/lib/prisma'

export const DAILY_QUIZ_TOTAL = 20
export const DAILY_MISTAKE_CAP = 6
export const STALE_GENERATING_MS = 3 * 60 * 1000 // 3 minutes

let geminiKeyIdx = 0

function getGeminiKeys(): string[] {
  return [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].filter(
    (k): k is string => Boolean(k && k.trim().length > 0)
  )
}

export function getIstPeriodKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function getDaysAgoDate(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

export type EligibilityInfo = {
  unlocked: boolean
  completedSourceQuizzes: number
  unlockThreshold: number
  loggedAnswers: number
  mistakeCount: number
}

export async function getUserDailyEligibility(userId: number): Promise<EligibilityInfo> {
  const [completedQuizzes, loggedAnswers, userMistakes] = await Promise.all([
    prisma.quizAttempt.count({ where: { userId } }),
    prisma.questionAttemptLog.count({
      where: { userId, sourceType: { not: 'DAILY_QUIZ' } },
    }),
    prisma.userMistake.findMany({
      where: { userId },
      select: { createdAt: true },
    }),
  ])

  const mistakeDays = new Set(
    userMistakes.map((m) => getIstPeriodKey(m.createdAt))
  ).size

  const unlocked =
    completedQuizzes >= 1 || loggedAnswers >= 15 || userMistakes.length >= 1
  const completedSourceQuizzes = Math.max(
    completedQuizzes,
    loggedAnswers >= 15 ? 1 : 0,
    mistakeDays
  )

  return {
    unlocked,
    completedSourceQuizzes,
    unlockThreshold: 1,
    loggedAnswers,
    mistakeCount: userMistakes.length,
  }
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

type CandidateQuestion = {
  id: number
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  optionE: string | null
  explanation: string | null
  topic: string | null
  difficulty: string | null
  correctAnswer: string
  chapterId: number
  chapterName: string
}

type PickedSlot = {
  questionId: number | null
  chapterId: number
  chapterName: string
  sourceBucket: 'RECENT_WRONG' | 'RECENT_FRESH' | 'OLDER_WRONG' | 'OLDER_FRESH' | 'AI_REFRAMED'
  snapshotJson?: Record<string, any> | null
}

async function tryReframeRepeatMistakes(
  candidates: { q: CandidateQuestion; chapterId: number; chapterName: string }[]
): Promise<PickedSlot[]> {
  const keys = getGeminiKeys()
  if (keys.length === 0 || candidates.length === 0) return []

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
  const apiKey = keys[geminiKeyIdx % keys.length]
  geminiKeyIdx = (geminiKeyIdx + 1) % keys.length

  const prompt = `You are an expert Agriculture / NABARD ARD Professor.
A student has missed the following question(s) multiple times. Reframe each question into a FRESH scenario or slightly different angle testing the EXACT SAME core concept, keeping the scientific facts 100% accurate.

Original questions:
${JSON.stringify(
    candidates.map((c) => ({
      sourceQuestionId: c.q.id,
      topic: c.q.topic,
      difficulty: c.q.difficulty || 'MEDIUM',
      questionText: c.q.questionText,
      options: {
        A: c.q.optionA,
        B: c.q.optionB,
        C: c.q.optionC,
        D: c.q.optionD,
        ...(c.q.optionE ? { E: c.q.optionE } : {}),
      },
      correctAnswer: c.q.correctAnswer,
      explanation: c.q.explanation,
    })),
    null,
    2
  )}

Return a strict JSON array matching the input length, each item having:
{
  "sourceQuestionId": number,
  "questionText": string,
  "optionA": string,
  "optionB": string,
  "optionC": string,
  "optionD": string,
  "correctAnswer": "A" | "B" | "C" | "D",
  "explanation": string,
  "topic": string,
  "difficulty": "EASY" | "MEDIUM" | "HARD"
}`

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 7000)

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json',
          },
        }),
      }
    )
    clearTimeout(timer)

    if (!res.ok) return []
    const data = await res.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!raw) return []

    let cleaned = raw.trim()
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return []

    const results: PickedSlot[] = []
    for (const item of parsed) {
      const match = candidates.find((c) => c.q.id === Number(item.sourceQuestionId))
      if (!match || !item.questionText || !item.optionA || !item.correctAnswer) continue

      results.push({
        questionId: match.q.id,
        chapterId: match.chapterId,
        chapterName: match.chapterName,
        sourceBucket: 'AI_REFRAMED',
        snapshotJson: {
          questionText: String(item.questionText),
          optionA: String(item.optionA),
          optionB: String(item.optionB),
          optionC: String(item.optionC),
          optionD: String(item.optionD),
          correctAnswer: String(item.correctAnswer).toUpperCase().slice(0, 1),
          explanation: String(item.explanation || match.q.explanation || ''),
          topic: String(item.topic || match.q.topic || match.chapterName),
          difficulty: String(item.difficulty || match.q.difficulty || 'MEDIUM'),
          reframedFromId: match.q.id,
        },
      })
    }
    return results
  } catch {
    return []
  }
}

export async function generateOrFetchDailyQuiz(userId: number) {
  const periodKey = getIstPeriodKey()
  const eligibility = await getUserDailyEligibility(userId)

  if (!eligibility.unlocked) {
    return { unlocked: false as const, eligibility, periodKey, quiz: null }
  }

  // Check if today's quiz already exists
  const existing = await prisma.dailyRetentionQuiz.findUnique({
    where: { userId_periodKey: { userId, periodKey } },
  })

  if (existing) {
    const isStaleGenerating =
      existing.status === 'generating' &&
      Date.now() - existing.generationStartedAt.getTime() > STALE_GENERATING_MS

    if (isStaleGenerating) {
      await prisma.dailyRetentionQuiz.delete({ where: { id: existing.id } })
    } else if (existing.status === 'generating') {
      return { unlocked: true as const, eligibility, periodKey, quiz: existing, generating: true }
    } else {
      const fullQuiz = await loadFullDailyQuiz(existing.id)
      return { unlocked: true as const, eligibility, periodKey, quiz: fullQuiz }
    }
  }

  // Create generation lock row
  let createdHeader: { id: string } | null = null
  try {
    createdHeader = await prisma.dailyRetentionQuiz.create({
      data: {
        userId,
        periodKey,
        status: 'generating',
        generationStartedAt: new Date(),
        totalQuestions: DAILY_QUIZ_TOTAL,
      },
      select: { id: true },
    })
  } catch (err: any) {
    // Handle concurrent creation race cleanly (P2002)
    if (err?.code === 'P2002') {
      const concurrent = await prisma.dailyRetentionQuiz.findUnique({
        where: { userId_periodKey: { userId, periodKey } },
      })
      if (concurrent) {
        const fullQuiz = await loadFullDailyQuiz(concurrent.id)
        return { unlocked: true as const, eligibility, periodKey, quiz: fullQuiz }
      }
    }
    throw err
  }

  try {
    const sevenDaysAgo = getDaysAgoDate(7)
    const fourteenDaysAgo = getDaysAgoDate(14)

    // 1. Gather user activity (Anti-Echo: exclude sourceType === 'DAILY_QUIZ')
    const [
      userRecord,
      attemptLogs,
      quizAttempts,
      userMistakes,
      recentDailyQs,
      allChapters,
    ] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { cohort: true } }),
      prisma.questionAttemptLog.findMany({
        where: { userId, sourceType: { not: 'DAILY_QUIZ' } },
        select: { questionId: true, chapterId: true, isCorrect: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.quizAttempt.findMany({
        where: { userId },
        select: {
          createdAt: true,
          quiz: { select: { chapterId: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.userMistake.findMany({
        where: { userId },
        include: {
          question: {
            include: {
              quiz: { select: { chapterId: true, chapter: { select: { id: true, name: true } } } },
            },
          },
        },
        orderBy: [{ reviewLevel: 'asc' }, { nextReviewAt: 'asc' }],
      }),
      prisma.dailyRetentionQuestion.findMany({
        where: {
          dailyQuiz: {
            userId,
            createdAt: { gte: sevenDaysAgo },
          },
          questionId: { not: null },
        },
        select: { questionId: true },
      }),
      prisma.chapter.findMany({
        select: { id: true, name: true, cohort: true },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
      }),
    ])

    const cohort = userRecord?.cohort || 'BETA'
    const allowedChapters = allChapters.filter((c) => cohort === 'ALPHA' || c.cohort === 'BETA')
    const chapterNameById = new Map<number, string>(allowedChapters.map((c) => [c.id, c.name]))

    // Partition chapters into recent (last 7 days) vs older (> 7 days ago)
    const recentChapterScore = new Map<number, number>()
    const olderChapterScore = new Map<number, number>()

    const addScore = (map: Map<number, number>, chId: number, weight: number) => {
      if (!chapterNameById.has(chId)) return
      map.set(chId, (map.get(chId) || 0) + weight)
    }

    for (const log of attemptLogs) {
      if (log.createdAt >= sevenDaysAgo) addScore(recentChapterScore, log.chapterId, 2)
      else addScore(olderChapterScore, log.chapterId, 1)
    }
    for (const qa of quizAttempts) {
      const chId = qa.quiz?.chapterId
      if (!chId) continue
      if (qa.createdAt >= sevenDaysAgo) addScore(recentChapterScore, chId, 10)
      else addScore(olderChapterScore, chId, 5)
    }
    for (const m of userMistakes) {
      const chId = m.question?.quiz?.chapterId
      if (!chId) continue
      if (m.createdAt >= sevenDaysAgo) addScore(recentChapterScore, chId, 3)
      else addScore(olderChapterScore, chId, 2)
    }

    const recentChapterIds = Array.from(recentChapterScore.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id)
    const recentChapterSet = new Set(recentChapterIds)

    const olderChapterIds = Array.from(olderChapterScore.entries())
      .filter(([id]) => !recentChapterSet.has(id))
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id)

    // Track seen question IDs (last 14 days practice + last 7 days daily quizzes)
    const seenRecentlyIds = new Set<number>()
    const wrongCounts = new Map<number, number>()
    for (const log of attemptLogs) {
      if (log.createdAt >= fourteenDaysAgo) seenRecentlyIds.add(log.questionId)
      if (!log.isCorrect) {
        wrongCounts.set(log.questionId, (wrongCounts.get(log.questionId) || 0) + 1)
      }
    }
    for (const dq of recentDailyQs) {
      if (dq.questionId) seenRecentlyIds.add(dq.questionId)
    }

    // Track already picked question IDs to avoid duplicates within today's 20Q quiz
    const pickedIds = new Set<number>()
    const pickedSlots: PickedSlot[] = []
    let totalMistakesPicked = 0

    // Separate mistakes into recent-chapter mistakes vs older mistakes (prioritize unresolved)
    const sortedMistakes = [...userMistakes].sort((a, b) => {
      if (a.reviewLevel !== b.reviewLevel) return a.reviewLevel - b.reviewLevel
      return a.nextReviewAt.getTime() - b.nextReviewAt.getTime()
    })

    const recentMistakePool: { q: CandidateQuestion; chapterId: number; chapterName: string; repeatCount: number }[] = []
    const olderMistakePool: { q: CandidateQuestion; chapterId: number; chapterName: string; repeatCount: number }[] = []

    for (const m of sortedMistakes) {
      const q = m.question
      const chId = q?.quiz?.chapterId
      const chName = q?.quiz?.chapter?.name
      if (!q || !chId || !chName) continue
      const cand: CandidateQuestion = {
        id: q.id,
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        optionE: q.optionE,
        explanation: q.explanation,
        topic: q.topic,
        difficulty: q.difficulty,
        correctAnswer: q.correctAnswer,
        chapterId: chId,
        chapterName: chName,
      }
      const entry = { q: cand, chapterId: chId, chapterName: chName, repeatCount: wrongCounts.get(q.id) || 1 }
      if (recentChapterSet.has(chId)) recentMistakePool.push(entry)
      else olderMistakePool.push(entry)
    }

    // Identify up to 2 repeat-wrong questions (>= 2 failures) for optional AI reframing
    const repeatMistakesToReframe: { q: CandidateQuestion; chapterId: number; chapterName: string }[] = []

    const pickMistakes = (
      pool: typeof recentMistakePool,
      maxCount: number,
      bucket: 'RECENT_WRONG' | 'OLDER_WRONG'
    ) => {
      let count = 0
      for (const item of pool) {
        if (count >= maxCount || totalMistakesPicked >= DAILY_MISTAKE_CAP || pickedSlots.length >= DAILY_QUIZ_TOTAL) {
          break
        }
        if (pickedIds.has(item.q.id)) continue
        pickedIds.add(item.q.id)
        totalMistakesPicked++
        count++

        if (item.repeatCount >= 2 && repeatMistakesToReframe.length < 2) {
          repeatMistakesToReframe.push({
            q: item.q,
            chapterId: item.chapterId,
            chapterName: item.chapterName,
          })
        } else {
          pickedSlots.push({
            questionId: item.q.id,
            chapterId: item.chapterId,
            chapterName: item.chapterName,
            sourceBucket: bucket,
          })
        }
      }
    }

    // Helper to fetch fresh/unseen (with fallback to seen) questions from a chapter list
    const fetchChapterPool = async (chapterIds: number[], allowSeen: boolean) => {
      if (chapterIds.length === 0) return []
      const rows = await prisma.question.findMany({
        where: {
          quiz: {
            chapterId: { in: chapterIds },
            ...(cohort === 'BETA' ? { cohort: 'BETA' } : {}),
          },
          id: {
            notIn: [
              ...Array.from(pickedIds),
              ...(allowSeen ? [] : Array.from(seenRecentlyIds)),
            ],
          },
        },
        select: {
          id: true,
          quiz: { select: { chapterId: true, chapter: { select: { name: true } } } },
        },
        take: 150,
      })

      // Group by chapterId so we spread selections fairly across chapters
      const byChapter = new Map<number, { id: number; chapterId: number; chapterName: string }[]>()
      for (const r of rows) {
        const chId = r.quiz?.chapterId
        const chName = r.quiz?.chapter?.name
        if (!chId || !chName) continue
        if (!byChapter.has(chId)) byChapter.set(chId, [])
        byChapter.get(chId)!.push({ id: r.id, chapterId: chId, chapterName: chName })
      }
      for (const list of byChapter.values()) shuffleInPlace(list)

      // Round-robin pick across chapters in priority order
      const roundRobin: { id: number; chapterId: number; chapterName: string }[] = []
      let added = true
      while (added) {
        added = false
        for (const chId of chapterIds) {
          const list = byChapter.get(chId)
          if (list && list.length > 0) {
            roundRobin.push(list.pop()!)
            added = true
          }
        }
      }
      return roundRobin
    }

    // Reserve slots for reframed repeat-wrong questions if any
    const reservedReframeSlots = Math.min(2, repeatMistakesToReframe.length)

    // PRIMARY QUOTA: Up to 14 Qs from Last 7 Days chapters
    const primaryTarget = 14
    pickMistakes(recentMistakePool, 4, 'RECENT_WRONG')
    const recentFreshNeeded = Math.max(0, primaryTarget - (pickedSlots.length + reservedReframeSlots))
    if (recentChapterIds.length > 0 && recentFreshNeeded > 0) {
      const freshRecent = await fetchChapterPool(recentChapterIds, false)
      for (const q of freshRecent.slice(0, recentFreshNeeded)) {
        if (pickedSlots.length + reservedReframeSlots >= DAILY_QUIZ_TOTAL) break
        if (pickedIds.has(q.id)) continue
        pickedIds.add(q.id)
        pickedSlots.push({
          questionId: q.id,
          chapterId: q.chapterId,
          chapterName: q.chapterName,
          sourceBucket: 'RECENT_FRESH',
        })
      }
    }

    // SECONDARY QUOTA: Up to 6 Qs (plus any thin-week backfill!) from Older Attempted Chapters
    pickMistakes(olderMistakePool, 2, 'OLDER_WRONG')
    const remainingAfterPrimary = Math.max(0, DAILY_QUIZ_TOTAL - (pickedSlots.length + reservedReframeSlots))
    if (olderChapterIds.length > 0 && remainingAfterPrimary > 0) {
      const freshOlder = await fetchChapterPool(olderChapterIds, false)
      for (const q of freshOlder.slice(0, remainingAfterPrimary)) {
        if (pickedSlots.length + reservedReframeSlots >= DAILY_QUIZ_TOTAL) break
        if (pickedIds.has(q.id)) continue
        pickedIds.add(q.id)
        pickedSlots.push({
          questionId: q.id,
          chapterId: q.chapterId,
          chapterName: q.chapterName,
          sourceBucket: 'OLDER_FRESH',
        })
      }
    }

    // BACKFILL 1: If Secondary was thin (e.g. user has only recent chapters), backfill with more Recent Fresh
    const stillNeeded1 = Math.max(0, DAILY_QUIZ_TOTAL - (pickedSlots.length + reservedReframeSlots))
    if (stillNeeded1 > 0 && recentChapterIds.length > 0) {
      const moreRecent = await fetchChapterPool(recentChapterIds, false)
      for (const q of moreRecent.slice(0, stillNeeded1)) {
        if (pickedSlots.length + reservedReframeSlots >= DAILY_QUIZ_TOTAL) break
        if (pickedIds.has(q.id)) continue
        pickedIds.add(q.id)
        pickedSlots.push({
          questionId: q.id,
          chapterId: q.chapterId,
          chapterName: q.chapterName,
          sourceBucket: 'RECENT_FRESH',
        })
      }
    }

    // BACKFILL 2: If unseen questions in attempted chapters are exhausted, allow least-recently-seen from attempted chapters
    const attemptedChaptersAll = [...recentChapterIds, ...olderChapterIds]
    const stillNeeded2 = Math.max(0, DAILY_QUIZ_TOTAL - (pickedSlots.length + reservedReframeSlots))
    if (stillNeeded2 > 0 && attemptedChaptersAll.length > 0) {
      const seenFallback = await fetchChapterPool(attemptedChaptersAll, true)
      for (const q of seenFallback.slice(0, stillNeeded2)) {
        if (pickedSlots.length + reservedReframeSlots >= DAILY_QUIZ_TOTAL) break
        if (pickedIds.has(q.id)) continue
        pickedIds.add(q.id)
        pickedSlots.push({
          questionId: q.id,
          chapterId: q.chapterId,
          chapterName: q.chapterName,
          sourceBucket: recentChapterSet.has(q.chapterId) ? 'RECENT_FRESH' : 'OLDER_FRESH',
        })
      }
    }

    // BACKFILL 3: If attempted chapters total < 20 questions overall (very small chapter), pull from remaining course chapters
    const stillNeeded3 = Math.max(0, DAILY_QUIZ_TOTAL - (pickedSlots.length + reservedReframeSlots))
    if (stillNeeded3 > 0) {
      const otherChapters = allowedChapters
        .map((c) => c.id)
        .filter((id) => !attemptedChaptersAll.includes(id))
      const courseFallback = await fetchChapterPool(otherChapters, false)
      for (const q of courseFallback.slice(0, stillNeeded3)) {
        if (pickedSlots.length + reservedReframeSlots >= DAILY_QUIZ_TOTAL) break
        if (pickedIds.has(q.id)) continue
        pickedIds.add(q.id)
        pickedSlots.push({
          questionId: q.id,
          chapterId: q.chapterId,
          chapterName: q.chapterName,
          sourceBucket: 'OLDER_FRESH',
        })
      }
    }

    // Optionally AI-reframe repeat mistakes (fallback cleanly to original mistake if AI skips/times out)
    if (repeatMistakesToReframe.length > 0) {
      const reframed = await tryReframeRepeatMistakes(repeatMistakesToReframe)
      const reframedMap = new Map<number, PickedSlot>()
      for (const r of reframed) {
        if (r.questionId) reframedMap.set(r.questionId, r)
      }
      for (const orig of repeatMistakesToReframe) {
        if (pickedSlots.length >= DAILY_QUIZ_TOTAL) break
        const aiSlot = reframedMap.get(orig.q.id)
        if (aiSlot) {
          pickedSlots.push(aiSlot)
        } else {
          pickedSlots.push({
            questionId: orig.q.id,
            chapterId: orig.chapterId,
            chapterName: orig.chapterName,
            sourceBucket: recentChapterSet.has(orig.chapterId) ? 'RECENT_WRONG' : 'OLDER_WRONG',
          })
        }
      }
    }

    // Shuffle final 20 slots cleanly so mistakes and chapters are interspersed
    shuffleInPlace(pickedSlots)

    // Compute top 2-3 focus_chapters from selected questions
    const chapterCounts = new Map<string, number>()
    for (const s of pickedSlots) {
      chapterCounts.set(s.chapterName, (chapterCounts.get(s.chapterName) || 0) + 1)
    }
    const focusChapters = Array.from(chapterCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name)

    // Atomically insert question slots and flip status to 'pending'
    await prisma.$transaction(async (tx) => {
      await tx.dailyRetentionQuestion.createMany({
        data: pickedSlots.map((slot, idx) => ({
          dailyQuizId: createdHeader!.id,
          orderIndex: idx,
          questionId: slot.questionId,
          chapterId: slot.chapterId,
          chapterName: slot.chapterName,
          sourceBucket: slot.sourceBucket,
          snapshotJson: slot.snapshotJson ?? undefined,
        })),
      })

      await tx.dailyRetentionQuiz.update({
        where: { id: createdHeader!.id },
        data: {
          status: 'pending',
          totalQuestions: pickedSlots.length,
          focusChapters,
        },
      })
    })

    const fullQuiz = await loadFullDailyQuiz(createdHeader.id)
    return { unlocked: true as const, eligibility, periodKey, quiz: fullQuiz }
  } catch (err) {
    // Clean up failed/partial 'generating' row so user is never locked out
    if (createdHeader?.id) {
      await prisma.dailyRetentionQuiz
        .delete({ where: { id: createdHeader.id } })
        .catch(() => {})
    }
    throw err
  }
}

export async function loadFullDailyQuiz(dailyQuizId: string) {
  return prisma.dailyRetentionQuiz.findUnique({
    where: { id: dailyQuizId },
    include: {
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: {
          question: {
            include: {
              quiz: { select: { chapterId: true, chapter: { select: { name: true } } } },
              concepts: { select: { id: true, term: true, slug: true, category: true } },
            },
          },
        },
      },
    },
  })
}
