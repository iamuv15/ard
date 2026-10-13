import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { questionId } = await request.json()

    if (!questionId || typeof questionId !== 'number') {
      return NextResponse.json({ error: 'Valid questionId is required' }, { status: 400 })
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId }
    })

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // 1. If already generated & cached in DB, return immediately (0ms latency, $0 cost)
    if (question.simpleExplanation && question.simpleExplanation.trim().length > 10) {
      return NextResponse.json({
        success: true,
        simpleExplanation: question.simpleExplanation,
        cached: true
      })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        error: 'Gemini API key is not configured.'
      }, { status: 503 })
    }

    const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    const prompt = `You are a supportive, intuitive tutor explaining an exam question to a student who found the standard textbook explanation confusing or too technical.

QUESTION:
${question.questionText}

OPTIONS:
A) ${question.optionA}
B) ${question.optionB}
C) ${question.optionC}
D) ${question.optionD}
${question.optionE ? `E) ${question.optionE}` : ''}

CORRECT OPTION: Option ${question.correctAnswer}
STANDARD EXPLANATION: ${question.explanation || 'None'}

TASK:
Explain WHY this answer is correct in simple, conversational terms.
- Use a friendly, everyday analogy or visual metaphor if applicable.
- Keep it concise: 2 to 3 short sentences maximum.
- Never use technical jargon without immediately explaining it in plain words.
- Remove all citations or references like [cite: xx].
- Jump straight into the explanation without meta-talk like "Here is a simpler explanation:".`

    let response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 250
        }
      })
    })

    // Fallback strictly between gemini-3.5-flash-lite and gemini-3.5-flash
    if (response.status === 404 && model !== 'gemini-3.5-flash') {
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`
      response = await fetch(fallbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 250 }
        })
      })
    }

    if (!response.ok) {
      const errText = await response.text()
      console.error('Gemini simplify failed:', response.status, errText)
      return NextResponse.json({ error: 'Failed to generate simplified explanation' }, { status: 502 })
    }

    const data = await response.json()
    const simpleExplanation = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

    if (!simpleExplanation) {
      return NextResponse.json({ error: 'Empty explanation returned from AI' }, { status: 500 })
    }

    // Cache the simplified explanation in the database for all future students
    await prisma.question.update({
      where: { id: questionId },
      data: { simpleExplanation }
    })

    return NextResponse.json({
      success: true,
      simpleExplanation,
      cached: false
    })
  } catch (error: any) {
    console.error('Error generating simple explanation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
