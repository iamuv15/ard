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
    const questionId = parseInt(params.id, 10)
    if (isNaN(questionId)) {
      return NextResponse.json({ error: 'Invalid question ID' }, { status: 400 })
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        quiz: {
          select: { name: true, chapter: { select: { name: true } } }
        }
      }
    })

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    let target = 'both' // 'voice' | 'simple' | 'both'
    try {
      const body = await request.json()
      if (body.target) target = body.target
    } catch {}

    const prompt = `You are an expert Agricultural Engineering & ARD Professor creating voice scripts and easy explanations for competitive exam practice.

QUESTION DETAILS:
- Subject/Topic: ${question.topic || question.quiz?.chapter?.name || 'Agriculture'}
- Question: ${question.questionText}
- Option A: ${question.optionA}
- Option B: ${question.optionB}
- Option C: ${question.optionC}
- Option D: ${question.optionD}
${question.optionE ? `- Option E: ${question.optionE}` : ''}
- Correct Answer: Option ${question.correctAnswer}
- Existing Technical Explanation: ${question.explanation || 'None provided'}

TASK:
Generate two high-yield pedagogical assets:
1. "voiceExplanation": A natural spoken conversational Hinglish explanation designed specifically for text-to-speech (Edge TTS).
   - STRICT PEDAGOGICAL RULE: Focus purely on teaching the concept behind the question and correct answer.
   - OPTION DIFFERENTIATION: Explain other terms in the options ONLY IF they have distinct, individual technical definitions (e.g., distinguishing plow vs harrow vs cultivator). Do not explain trivial distractors.
   - ABSOLUTE PROHIBITION ON EXAM TALK: DO NOT say "exam ke liye zaroori hai", "NABARD/AFO me pucha jaata hai", "exam trap", etc. Teach purely the concept.
   - SCRIPT FORMAT: Use Devanagari script for Hindi grammar and connectives, and standard English Latin letters for technical terms, tools, units, and definitions.
   - NO GREETINGS: Do NOT say "Aapka answer sahi hai" or "Pehla question dekhte hain". Jump straight into the concept explanation.
   - PRONUNCIATION SAFETY: If using the English noun/verb "use", write it as "यूज़" so Hindi TTS reads it as "use" rather than "usse".

2. "simpleExplanation": An ultra-clear, simple English explanation (ELI5 - Explain Like I'm 5) for students who found the technical explanation too complex. Break it down using intuitive real-world logic.

Return a valid JSON object in this exact format:
{
  "voiceExplanation": "spoken Hinglish script...",
  "simpleExplanation": "simple English explanation..."
}`;

    const raw = await callGemini({
      systemPrompt: 'You are an elite Agricultural & Rural Development education specialist. Return only valid JSON.',
      userPrompt: prompt,
      allowThinking: false,
      temperature: 0.2
    })

    // Clean JSON markdown blocks if any
    const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed = JSON.parse(jsonStr)

    return NextResponse.json({
      success: true,
      voiceExplanation: parsed.voiceExplanation,
      simpleExplanation: parsed.simpleExplanation
    })
  } catch (error: any) {
    console.error('Error generating draft script:', error)
    return NextResponse.json({ error: error?.message || 'Failed to generate script' }, { status: 500 })
  }
}
