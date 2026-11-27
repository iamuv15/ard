import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserSession } from '@/lib/auth'

let roundRobinIndex = 0

function getGeminiKeys(): string[] {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
  ].filter((k): k is string => Boolean(k && k.trim().length > 0))
}

function getNextApiKey(keys: string[]): string {
  const key = keys[roundRobinIndex % keys.length]
  roundRobinIndex = (roundRobinIndex + 1) % keys.length
  return key
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 })
    }

    const params = await props.params
    const chapterId = parseInt(params.id, 10)
    if (isNaN(chapterId)) {
      return NextResponse.json({ error: 'Invalid chapter ID' }, { status: 400 })
    }

    const body = await request.json()
    const userPrompt = (body?.prompt || '').trim()
    if (userPrompt.length < 2) {
      return NextResponse.json(
        { error: 'Please enter topics or keywords you want to be tested on.' },
        { status: 400 }
      )
    }

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { id: true, name: true }
    })

    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
    }

    const questions = await prisma.question.findMany({
      where: { quiz: { chapterId } },
      orderBy: [{ quiz: { order: 'asc' } }, { id: 'asc' }],
      select: {
        id: true,
        questionText: true,
        topic: true,
        difficulty: true,
      }
    })

    if (questions.length === 0) {
      return NextResponse.json({
        success: true,
        chapterId,
        chapterName: chapter.name,
        matchedIds: [],
        totalMatched: 0,
        breakdown: { easy: 0, medium: 0, hard: 0 },
        summary: 'No questions available in this chapter.',
        topicsCovered: [],
        previews: []
      })
    }

    const keys = getGeminiKeys()
    if (keys.length === 0) {
      return NextResponse.json(
        { error: 'AI service is not configured (missing Gemini API keys).' },
        { status: 500 }
      )
    }

    const questionLookup = new Map<number, typeof questions[number]>()
    const compactLines: string[] = []

    for (const q of questions) {
      questionLookup.set(q.id, q)
      const cleanText = q.questionText.replace(/\s+/g, ' ').trim().slice(0, 220)
      compactLines.push(`${q.id}|${q.topic || 'General'}|${q.difficulty || 'MEDIUM'}|${cleanText}`)
    }

    const systemInstruction = `You are an expert Agriculture & Competitive Exam Question Curator for NABARD Grade A / ICAR.
A student is currently studying the chapter "${chapter.name}" and has entered a request describing what topics, concepts, or difficulty levels they want to be tested on.

Below is the COMPLETE list of ${questions.length} questions in "${chapter.name}".
Format per line: ID|Topic|Difficulty|QuestionText

INSTRUCTIONS:
1. Carefully understand the student's prompt: topics, specific sub-concepts, keywords, formulas/calculations, or difficulty preferences (e.g., "easy only", "medium and hard", "tough numericals", etc.).
2. Scan ALL questions in the list below and select EVERY question ID that genuinely matches the student's requested topics AND difficulty criteria.
3. Order the matchedIds from most relevant to least relevant (or in logical order if equally relevant).
4. If the student mentions a specific target count (e.g., "give me 15 questions on..."), select up to that count prioritizing the best matches. Otherwise, return all matching question IDs.
5. NEVER invent IDs that are not in the list. If nothing matches the topic in this chapter, return an empty matchedIds array and explain clearly in summary.
6. Return strict JSON ONLY matching this schema:
{
  "matchedIds": [number],
  "summary": "Concise 1-sentence summary of what was matched (or why nothing matched).",
  "topicsCovered": ["string"]
}`

    const fullPrompt = `${systemInstruction}

STUDENT REQUEST:
"${userPrompt}"

CHAPTER QUESTIONS (${questions.length} total):
${compactLines.join('\n')}`

    const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
    let parsedResult: { matchedIds?: unknown[]; summary?: string; topicsCovered?: string[] } | null = null
    let lastError: string | null = null

    const maxAttempts = Math.min(keys.length + 1, 3)
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const apiKey = getNextApiKey(keys)
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json'
            }
          })
        })

        if (!res.ok) {
          const errText = await res.text()
          lastError = `AI API error ${res.status}: ${errText.slice(0, 150)}`
          continue
        }

        const data = await res.json()
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (!rawText) {
          lastError = 'Empty response from AI'
          continue
        }

        let cleaned = rawText.trim()
        if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '')
        else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '')

        parsedResult = JSON.parse(cleaned)
        break
      } catch (err: any) {
        lastError = err?.message || 'Failed to parse AI response'
      }
    }

    if (!parsedResult) {
      return NextResponse.json(
        { error: lastError || 'Failed to match questions with AI. Please try again.' },
        { status: 502 }
      )
    }

    // Validate & deduplicate matched IDs against actual DB questions in this chapter
    const seen = new Set<number>()
    const validIds: number[] = []
    if (Array.isArray(parsedResult.matchedIds)) {
      for (const rawId of parsedResult.matchedIds) {
        const numId = typeof rawId === 'number' ? rawId : parseInt(String(rawId), 10)
        if (!isNaN(numId) && questionLookup.has(numId) && !seen.has(numId)) {
          seen.add(numId)
          validIds.push(numId)
        }
      }
    }

    const breakdown = { easy: 0, medium: 0, hard: 0 }
    const topicsSet = new Set<string>()
    const previews: { id: number; questionText: string; topic: string | null; difficulty: string | null }[] = []

    for (const id of validIds) {
      const q = questionLookup.get(id)!
      if (q.difficulty === 'EASY') breakdown.easy++
      else if (q.difficulty === 'HARD') breakdown.hard++
      else breakdown.medium++

      if (q.topic) topicsSet.add(q.topic)

      if (previews.length < 3) {
        previews.push({
          id: q.id,
          questionText: q.questionText,
          topic: q.topic,
          difficulty: q.difficulty
        })
      }
    }

    return NextResponse.json({
      success: true,
      chapterId,
      chapterName: chapter.name,
      matchedIds: validIds,
      totalMatched: validIds.length,
      breakdown,
      summary: parsedResult.summary || (
        validIds.length > 0
          ? `Found ${validIds.length} matching questions in ${chapter.name}.`
          : `No questions matched "${userPrompt}" in ${chapter.name}.`
      ),
      topicsCovered: Array.from(topicsSet),
      previews
    })
  } catch (error) {
    console.error('Error in custom-ai-quiz:', error)
    return NextResponse.json({ error: 'Failed to generate custom AI quiz' }, { status: 500 })
  }
}
