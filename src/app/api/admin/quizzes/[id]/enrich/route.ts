import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'

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

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured in environment' }, { status: 503 })
    }

    const questions = await prisma.question.findMany({
      where: { quizId },
      orderBy: { id: 'asc' }
    })

    if (questions.length === 0) {
      return NextResponse.json({ success: true, message: 'No questions found to enrich', enrichedCount: 0 })
    }

    const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    // Process questions in batches of 5 to balance rate limits and prompt efficiency
    const BATCH_SIZE = 5
    let enrichedCount = 0

    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
      const batch = questions.slice(i, i + BATCH_SIZE)

      const batchItems = batch.map((q, idx) => `
[QUESTION_${idx + 1}]
ID: ${q.id}
Question: ${q.questionText}
Options:
A: ${q.optionA}
B: ${q.optionB}
C: ${q.optionC}
D: ${q.optionD}
${q.optionE ? `E: ${q.optionE}` : ''}
Correct Answer: ${q.correctAnswer}
Current Explanation: ${q.explanation || 'None'}
`).join('\n')

      const prompt = `You are an expert exam content editor.
Clean and polish the explanations for these multiple-choice questions to make them clear, engaging, and easy to read for students.

GUIDELINES:
1. Strip all scraping artifacts, citation marks (e.g. [cite: 21], [cite: 23]), or broken characters.
2. Bold key concepts, terminology, or reasons using markdown (e.g. **fluoride pollution**, **Option C**).
3. Clearly explain why the correct option is right in 2-4 clean, easy-to-read sentences.
4. Output strictly valid JSON matching this schema:
{
  "results": [
    {
      "id": number,
      "polishedExplanation": "Clean, engaging, bold-formatted explanation"
    }
  ]
}

QUESTIONS TO ENRICH:
${batchItems}`

      try {
        let response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2
            }
          })
        })

        if (response.status === 404 && model !== 'gemini-2.0-flash-lite') {
          const fallback = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`
          response = await fetch(fallback, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
            })
          })
        }

        if (response.ok) {
          const data = await response.json()
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) {
            const parsed = JSON.parse(text)
            if (Array.isArray(parsed.results)) {
              for (const item of parsed.results) {
                if (item.id && item.polishedExplanation) {
                  await prisma.question.update({
                    where: { id: item.id },
                    data: { explanation: item.polishedExplanation.trim() }
                  })
                  enrichedCount++
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Error enriching batch:', err)
      }
    }

    return NextResponse.json({
      success: true,
      enrichedCount,
      totalQuestions: questions.length,
      message: `Successfully enriched ${enrichedCount} of ${questions.length} question explanations!`
    })
  } catch (error: any) {
    console.error('Error in quiz enrich API:', error)
    return NextResponse.json({ error: 'Failed to enrich quiz explanations' }, { status: 500 })
  }
}
