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

    let body: any = {}
    try {
      body = await request.json()
    } catch {
      // Body is optional
    }

    const batchSize = Math.min(Math.max(body.batchSize || 6, 1), 10)
    const forceReset = Boolean(body.forceReset)

    if (forceReset) {
      await prisma.question.updateMany({
        where: { quizId },
        data: { isEnriched: false }
      })
    }

    const totalQuestions = await prisma.question.count({ where: { quizId } })

    const unenrichedQuestions = await prisma.question.findMany({
      where: { quizId, isEnriched: false },
      orderBy: { id: 'asc' },
      take: batchSize
    })

    if (unenrichedQuestions.length === 0) {
      return NextResponse.json({
        success: true,
        allCompleted: true,
        enrichedInChunk: 0,
        remaining: 0,
        total: totalQuestions,
        message: 'All questions in this quiz are already enriched!'
      })
    }

    const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    const batchItems = unenrichedQuestions.map((q, idx) => `
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
Current Raw Explanation: ${q.explanation || 'None provided'}
`).join('\n')

    const prompt = `You are an expert exam content editor and educational formatter.
Your task is to REFORMAT and VISUALLY ENHANCE the existing explanations for these multiple-choice questions without losing any information.

STRICT GUIDELINES:
1. ZERO LOSS OF INFORMATION: Do NOT summarize, trim, cut, or shorten the explanation. Retain 100% of the facts, definitions, scientific data, numerical values, chemical formulas, and reasoning present in the current raw explanation.
2. CLEAN SCRAPING ARTIFACTS: Remove all [cite: xx] tags, citation brackets, broken characters, and redundant prefixes like "Ans: C" or "Correct option is...".
3. MARKDOWN TABLES:
   - Whenever comparative details, classifications, crop stages, nutrient deficiencies, pH levels, or multi-attribute facts are present, structure them into a clean GitHub Flavored Markdown (GFM) table (| Feature | Details |).
4. VISUAL STRUCTURE & HIERARCHY:
   - Organize logically into clean paragraphs separated by double line breaks (\n\n).
   - Use sub-headers where appropriate (e.g. ### Core Concept, ### Key Takeaway).
   - Use bullet points (- ) or numbered lists (1. ) for steps, conditions, or characteristics.
   - Use **bold** for key concepts, essential numbers, and the correct option.
   - Use *italics* for botanical / scientific names (e.g. *Oryza sativa*) and Latin terminology.
   - Use a blockquote (> 💡 **Exam Pointer:** ...) for high-yield tips or takeaways if applicable.
5. Output strictly valid JSON matching this schema:
{
  "results": [
    {
      "id": number,
      "formattedExplanation": "Structured markdown explanation with tables, bold, bullets, and line breaks"
    }
  ]
}

QUESTIONS TO FORMAT:
${batchItems}`

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

    if (response.status === 404 && model !== 'gemini-3.5-flash') {
      const fallback = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`
      response = await fetch(fallback, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
        })
      })
    }

    let enrichedCount = 0

    if (response.ok) {
      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) {
        try {
          const parsed = JSON.parse(text)
          if (Array.isArray(parsed.results)) {
            for (const item of parsed.results) {
              if (item.id && item.formattedExplanation) {
                await prisma.question.update({
                  where: { id: item.id },
                  data: {
                    explanation: item.formattedExplanation.trim(),
                    isEnriched: true
                  }
                })
                enrichedCount++
              }
            }
          }
        } catch (parseErr) {
          console.error('Error parsing Gemini JSON response:', parseErr)
        }
      }
    } else {
      const errText = await response.text()
      console.error('Gemini API error during enrichment:', errText)
      return NextResponse.json({ error: 'AI formatting error. Please retry.' }, { status: 500 })
    }

    const remainingCount = await prisma.question.count({
      where: { quizId, isEnriched: false }
    })

    return NextResponse.json({
      success: true,
      allCompleted: remainingCount === 0,
      enrichedInChunk: enrichedCount,
      remaining: remainingCount,
      total: totalQuestions,
      message: `Enriched ${enrichedCount} questions in this batch. ${remainingCount} remaining.`
    })
  } catch (error: any) {
    console.error('Error in quiz enrich API:', error)
    return NextResponse.json({ error: 'Failed to enrich quiz explanations' }, { status: 500 })
  }
}
