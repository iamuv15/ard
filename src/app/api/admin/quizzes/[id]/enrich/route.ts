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

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        chapterId: true,
        chapter: {
          select: {
            id: true,
            name: true,
            concepts: {
              select: {
                id: true,
                term: true,
                slug: true,
                category: true,
                subCategory: true
              },
              orderBy: { term: 'asc' }
            }
          }
        }
      }
    })

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    const chapterConcepts = quiz.chapter?.concepts || []
    let taxonomyPromptSection = ''
    if (chapterConcepts.length > 0) {
      const grouped: Record<string, string[]> = {}
      for (const c of chapterConcepts) {
        const branch = c.subCategory ? `${c.category} - ${c.subCategory}` : (c.category || 'General')
        if (!grouped[branch]) grouped[branch] = []
        grouped[branch].push(`${c.term} [slug: "${c.slug}"]`)
      }
      taxonomyPromptSection = `\nCHAPTER CONCEPT TAXONOMY (Available to tag):\n` +
        Object.entries(grouped)
          .map(([branch, list]) => `• ${branch}:\n  ${list.join(', ')}`)
          .join('\n') + `\n
CONCEPT ATTRIBUTION RULES:
- Identify 1 to 3 concept slugs from the CHAPTER CONCEPT TAXONOMY above that are DIRECTLY TESTED by each question (the core educational concept tested by the question stem and the correct answer).
- CRITICAL NEGATIVE CONSTRAINT: Do NOT tag a concept merely because a generic English word (e.g., "full", "hand", "milk", "free", "system", "stage") appears in the stem or explanation text.
  * Example: A question testing "puberty" or "ovary development" must NEVER be tagged with "full-cream-milk" or "full-hand-milking" just because the word "fully" appears.
- If no concept in the taxonomy directly tests a question, return an empty array: "testedConceptSlugs": [].
`
    }

    const isTagOnly = body.action === 'tag_only'
    const batchSize = Math.min(Math.max(body.batchSize || (isTagOnly ? 15 : 6), 1), 25)
    const forceReset = Boolean(body.forceReset)

    if (forceReset && !isTagOnly) {
      await prisma.question.updateMany({
        where: { quizId },
        data: { isEnriched: false }
      })
    }

    const totalQuestions = await prisma.question.count({ where: { quizId } })

    const targetQuestions = isTagOnly
      ? await prisma.question.findMany({
          where: { quizId },
          orderBy: { id: 'asc' },
          skip: Number(body.offset) || 0,
          take: batchSize
        })
      : await prisma.question.findMany({
          where: { quizId, isEnriched: false },
          orderBy: { id: 'asc' },
          take: batchSize
        })

    if (targetQuestions.length === 0) {
      return NextResponse.json({
        success: true,
        allCompleted: true,
        enrichedInChunk: 0,
        remaining: 0,
        total: totalQuestions,
        message: isTagOnly
          ? 'All questions in this quiz have been evaluated for concept tags!'
          : 'All questions in this quiz are already enriched!'
      })
    }

    const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash'
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    const batchItems = targetQuestions.map((q, idx) => `
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

    const prompt = isTagOnly
      ? `You are an expert exam concept classifier.
Analyze these multiple-choice questions and attribute 1 to 3 directly tested concept slugs from the CHAPTER CONCEPT TAXONOMY below.

STRICT GUIDELINES:
- Base attribution strictly on the core concept tested by the question stem and the correct answer.
- CRITICAL NEGATIVE CONSTRAINT: Do NOT tag a concept merely because an English word (e.g. "full", "hand", "milk", "stage") appears casually as an adjective or distractor.
- If no concept in the taxonomy directly applies, return an empty array [].
${taxonomyPromptSection}
Output strictly valid JSON matching this schema:
{
  "results": [
    {
      "id": number,
      "testedConceptSlugs": ["slug-1", "slug-2"]
    }
  ]
}

QUESTIONS TO CLASSIFY:
${batchItems}`
      : `You are an expert exam content editor and educational formatter.
Your task is to REFORMAT and VISUALLY ENHANCE the existing explanations for these multiple-choice questions without losing any information, AND attribute directly tested concepts from the chapter taxonomy.

STRICT EXPLANATION GUIDELINES:
1. ZERO LOSS OF INFORMATION: Do NOT summarize, trim, cut, or shorten the explanation. Retain 100% of the facts, definitions, scientific data, numerical values, chemical formulas, and reasoning present in the current raw explanation.
2. CLEAN SCRAPING ARTIFACTS: Remove all [cite: xx] tags, citation brackets, broken characters, and redundant prefixes like "Ans: C" or "Correct option is...".
3. MARKDOWN TABLES:
   - Whenever comparative details, classifications, crop stages, nutrient deficiencies, pH levels, or multi-attribute facts are present, structure them into a clean GitHub Flavored Markdown (GFM) table (| Feature | Details |).
4. VISUAL STRUCTURE & HIERARCHY:
   - Organize logically into clean paragraphs separated by double line breaks (\\n\\n).
   - Use sub-headers where appropriate (e.g. ### Core Concept, ### Key Takeaway).
   - Use bullet points (- ) or numbered lists (1. ) for steps, conditions, or characteristics.
   - Use **bold** for key concepts, essential numbers, and the correct option.
   - Use *italics* for botanical / scientific names (e.g. *Oryza sativa*) and Latin terminology.
   - Use a blockquote (> 💡 **Exam Pointer:** ...) for high-yield tips or takeaways if applicable.
${taxonomyPromptSection}
Output strictly valid JSON matching this schema:
{
  "results": [
    {
      "id": number,
      "formattedExplanation": "Structured markdown explanation with tables, bold, bullets, and line breaks",
      "testedConceptSlugs": ["slug-1", "slug-2"]
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

    let processedCount = 0

    if (response.ok) {
      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text || data.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) {
        try {
          const parsed = JSON.parse(text)
          if (Array.isArray(parsed.results)) {
            const slugMap = new Map<string, number>()
            for (const c of chapterConcepts) {
              slugMap.set(c.slug.toLowerCase().trim(), c.id)
              slugMap.set(c.term.toLowerCase().trim(), c.id)
            }

            for (const item of parsed.results) {
              if (item.id) {
                const matchedConceptIds: number[] = []
                if (chapterConcepts.length > 0 && Array.isArray(item.testedConceptSlugs)) {
                  for (const s of item.testedConceptSlugs) {
                    const id = slugMap.get(String(s).toLowerCase().trim())
                    if (id && !matchedConceptIds.includes(id)) {
                      matchedConceptIds.push(id)
                    }
                  }
                }

                if (isTagOnly) {
                  await prisma.question.update({
                    where: { id: item.id },
                    data: {
                      ...(chapterConcepts.length > 0 ? {
                        concepts: {
                          set: matchedConceptIds.map(id => ({ id }))
                        }
                      } : {})
                    }
                  })
                } else if (item.formattedExplanation) {
                  await prisma.question.update({
                    where: { id: item.id },
                    data: {
                      explanation: item.formattedExplanation.trim(),
                      isEnriched: true,
                      ...(chapterConcepts.length > 0 ? {
                        concepts: {
                          set: matchedConceptIds.map(id => ({ id }))
                        }
                      } : {})
                    }
                  })
                }
                processedCount++
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
      return NextResponse.json({ error: 'AI processing error. Please retry.' }, { status: 500 })
    }

    const remainingCount = isTagOnly
      ? Math.max(0, totalQuestions - ((Number(body.offset) || 0) + targetQuestions.length))
      : await prisma.question.count({ where: { quizId, isEnriched: false } })

    return NextResponse.json({
      success: true,
      allCompleted: remainingCount === 0,
      enrichedInChunk: processedCount,
      remaining: remainingCount,
      total: totalQuestions,
      message: isTagOnly
        ? `Tagged concepts for ${processedCount} questions in this batch. ${remainingCount} remaining.`
        : `Enriched ${processedCount} questions in this batch. ${remainingCount} remaining.`
    })
  } catch (error: any) {
    console.error('Error in quiz enrich API:', error)
    return NextResponse.json({ error: 'Failed to enrich quiz explanations' }, { status: 500 })
  }
}
