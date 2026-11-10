import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { callGemini } from '@/lib/terminologyEngine'

async function checkAdminAuth() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('admin_session')
  return sessionCookie && (sessionCookie.value === 'true' || sessionCookie.value === 'authenticated')
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const isAdmin = await checkAdminAuth()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await props.params
    const quizId = parseInt(params.id, 10)
    if (isNaN(quizId)) {
      return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 })
    }

    let batchSize = 5
    let overwriteExisting = false
    let target = 'voice' // 'voice' | 'simple' | 'both'

    try {
      const body = await request.json()
      if (typeof body.batchSize === 'number') batchSize = Math.max(1, Math.min(body.batchSize, 10))
      if (typeof body.overwriteExisting === 'boolean') overwriteExisting = body.overwriteExisting
      if (body.target) target = body.target
    } catch {}

    const totalQuestions = await prisma.question.count({
      where: { quizId }
    })

    // Find pending questions
    let whereCondition: any = { quizId }
    if (!overwriteExisting) {
      if (target === 'voice') {
        whereCondition = { quizId, voiceExplanation: null }
      } else if (target === 'simple') {
        whereCondition = { quizId, simpleExplanation: null }
      } else {
        whereCondition = {
          quizId,
          OR: [{ voiceExplanation: null }, { simpleExplanation: null }]
        }
      }
    }

    const pendingQuestions = await prisma.question.findMany({
      where: whereCondition,
      take: batchSize,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        questionText: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        optionE: true,
        correctAnswer: true,
        topic: true,
        explanation: true,
        voiceExplanation: true,
        simpleExplanation: true
      }
    })

    if (pendingQuestions.length === 0) {
      return NextResponse.json({
        success: true,
        allCompleted: true,
        remaining: 0,
        total: totalQuestions,
        processedInChunk: 0
      })
    }

    const prompt = `You are an expert Agricultural Engineering & ARD Professor creating voice scripts and easy explanations for competitive exam practice.

STRICT PEDAGOGICAL INSTRUCTIONS:
1. "voiceExplanation": A natural spoken conversational Hinglish explanation for Edge TTS.
   - Teach the core scientific/engineering concept of the question and the correct answer.
   - Explain other terms in options ONLY IF they have distinct, individual technical definitions (e.g. distinguishing plow vs harrow vs cultivator). Do not explain trivial distractors.
   - ABSOLUTE PROHIBITION ON EXAM TALK: Zero exam meta-talk (no "NABARD/AFO ke liye", "exam me pucha jata hai", "exam trap", etc.).
   - SCRIPT FORMAT: Use Devanagari script for Hindi grammar/connectives and standard English Latin letters for technical terms, tools, units, definitions.
   - NO GREETINGS: Do NOT say "Aapka answer sahi hai" or "Pehla question dekhte hain". Jump straight into the concept explanation.
   - PRONUNCIATION SAFETY: If using the English word "use", write it as "यूज़" so Hindi TTS reads it as "use" rather than "usse".

2. "simpleExplanation": An ultra-clear, simple English explanation (ELI5 - Explain Like I'm 5) breaking the question and answer down in plain intuitive logic.

INPUT QUESTIONS:
${JSON.stringify(pendingQuestions.map(q => ({
  id: q.id,
  topic: q.topic || 'Agriculture',
  question: q.questionText,
  optionA: q.optionA,
  optionB: q.optionB,
  optionC: q.optionC,
  optionD: q.optionD,
  optionE: q.optionE || null,
  correctAnswer: q.correctAnswer,
  explanation: q.explanation?.slice(0, 500) || ''
})), null, 2)}

Respond with a JSON array:
[
  {
    "id": number,
    "voiceExplanation": "spoken Hinglish script...",
    "simpleExplanation": "simple English explanation..."
  }
]`;

    const raw = await callGemini({
      systemPrompt: 'You are an elite Agricultural & Rural Development education specialist. Return only valid JSON array.',
      userPrompt: prompt,
      allowThinking: false,
      temperature: 0.2
    })

    const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const results: Array<{ id: number; voiceExplanation?: string; simpleExplanation?: string }> = JSON.parse(jsonStr)

    // Save batch updates in database
    let updatedCount = 0
    for (const res of results) {
      const updateData: any = { voiceScriptVersion: 2 }
      if (res.voiceExplanation && (target === 'voice' || target === 'both')) {
        updateData.voiceExplanation = res.voiceExplanation
      }
      if (res.simpleExplanation && (target === 'simple' || target === 'both')) {
        updateData.simpleExplanation = res.simpleExplanation
      }

      await prisma.question.update({
        where: { id: res.id },
        data: updateData
      })
      updatedCount++
    }

    const remainingCount = await prisma.question.count({
      where: whereCondition
    })

    return NextResponse.json({
      success: true,
      allCompleted: remainingCount === 0,
      remaining: remainingCount,
      total: totalQuestions,
      processedInChunk: updatedCount
    })
  } catch (error: any) {
    console.error('Error batch generating voice scripts:', error)
    return NextResponse.json({ error: error?.message || 'Failed batch generation' }, { status: 500 })
  }
}
