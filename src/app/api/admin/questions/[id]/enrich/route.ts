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
    const questionId = parseInt(params.id, 10)
    if (isNaN(questionId)) {
      return NextResponse.json({ error: 'Invalid question ID' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured in environment' }, { status: 503 })
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId }
    })

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    const prompt = `You are an expert exam content editor and educational formatter.
Your task is to REFORMAT and VISUALLY ENHANCE the explanation for this multiple-choice question.

STRICT GUIDELINES:
1. ZERO LOSS OF INFORMATION: Do NOT summarize, trim, cut, or shorten the explanation. Retain 100% of the educational facts, numbers, scientific context, chemical formulas, and reasoning provided in the raw explanation.
2. CLEAN SCRAPING ARTIFACTS: Remove all [cite: xx] tags, citation brackets, broken characters, and redundant prefixes like "Ans: C" or "Correct option is...".
3. MARKDOWN TABLES:
   - Whenever comparative details, classifications, crop stages, nutrient deficiencies, or multi-attribute facts are present in the text, format them into a clean GitHub Flavored Markdown (GFM) table (| Feature | Details |).
4. VISUAL STRUCTURE & HIERARCHY:
   - Organize logically into clean paragraphs separated by double line breaks (\n\n).
   - Use sub-headers where appropriate (e.g. ### Core Concept, ### Key Takeaway).
   - Use bullet points (- ) or numbered lists (1. ) for steps, conditions, or characteristics.
   - Use **bold** for key concepts, essential numbers, and the correct option.
   - Use *italics* for botanical / scientific names (e.g. *Oryza sativa*) and Latin terminology.
   - Use a blockquote (> 💡 **Exam Pointer:** ...) for high-yield exam takeaways or crucial rules if applicable.
5. Output strictly valid JSON matching this schema:
{
  "formattedExplanation": "Structured markdown explanation with tables, bold, bullets, and line breaks"
}

QUESTION:
Question: ${question.questionText}
Options:
A: ${question.optionA}
B: ${question.optionB}
C: ${question.optionC}
D: ${question.optionD}
${question.optionE ? `E: ${question.optionE}` : ''}
Correct Answer: ${question.correctAnswer}
Current Raw Explanation: ${question.explanation || 'None provided'}
`

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

    if (!response.ok) {
      const errText = await response.text()
      console.error('Gemini API error during single question enrichment:', errText)
      return NextResponse.json({ error: 'AI formatting error' }, { status: 500 })
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 500 })
    }

    const parsed = JSON.parse(text)
    const formattedExplanation = parsed.formattedExplanation?.trim() || question.explanation

    const updated = await prisma.question.update({
      where: { id: questionId },
      data: {
        explanation: formattedExplanation,
        isEnriched: true
      }
    })

    return NextResponse.json({
      success: true,
      explanation: updated.explanation,
      isEnriched: true,
      message: 'Explanation successfully reformatted and saved!'
    })
  } catch (error: any) {
    console.error('Error in single question enrich API:', error)
    return NextResponse.json({ error: 'Failed to enrich question explanation' }, { status: 500 })
  }
}
