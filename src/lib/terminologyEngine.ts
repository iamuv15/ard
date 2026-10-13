import prisma from '@/lib/prisma'
import { getTNAUSpine } from '@/lib/tnauSyllabusSpine'

// Types for MindMap and Concept Capsules
export interface MindMapEdge {
  from: string
  to: string
  relationType: 'CO_OCCURRENCE' | 'LIFECYCLE' | 'TOOL_OR_DIAGNOSTIC' | 'CONTRAST'
  label?: string
}

export interface MindMapCategory {
  name: string
  description?: string
  subCategories: {
    name: string
    keywords: string[]
  }[]
}

export interface SyllabusAudit {
  scorePercent: number
  totalBenchmarkTopics: number
  coveredTopicsCount: number
  gapTopics: string[]
  tnauSourceUrl?: string
}

export interface ChapterMindMapTree {
  chapterId: number
  chapterName: string
  categories: MindMapCategory[]
  crossBranchEdges: MindMapEdge[]
  allKeywords: string[]
  syllabusAudit?: SyllabusAudit
}

export interface ConceptCapsule {
  term: string
  slug: string
  category: string
  subCategory?: string
  definition: string
  content: string // Rich GFM markdown with comparative table & key facts
  examTraps: string
  relatedTerms: string[]
  matchedQuestionIds?: number[]
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Inter-request delay to honor Free Tier limits (~15 RPM)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Helper to call Google Gemini API with fallback support and controlled thinking tokens.
 */
async function callGemini({
  systemPrompt,
  userPrompt,
  allowThinking = false,
  thinkingBudget = 1024,
  temperature = 0.2,
  apiKeyOverride
}: {
  systemPrompt: string
  userPrompt: string
  allowThinking?: boolean
  thinkingBudget?: number
  temperature?: number
  apiKeyOverride?: string
}) {
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY is not configured.')
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const requestBody: any = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: allowThinking ? Math.max(temperature, 0.4) : temperature
    }
  }

  // Configure thinking tokens strictly according to our strategy:
  // Allowed ONLY for crucial taxonomy/mind-map planning; OFF for definitions
  if (allowThinking) {
    if (thinkingBudget && thinkingBudget > 0) {
      requestBody.generationConfig.thinkingConfig = {
        thinkingBudget: thinkingBudget
      }
    }
  } else {
    // Explicitly turn thinking off to save 100% of reasoning token costs
    requestBody.generationConfig.thinkingConfig = {
      thinkingBudget: 0
    }
  }

  let response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  })

  // Fallbacks strictly between gemini-3.5-flash-lite and gemini-3.5-flash (no lower models)
  if (response.status === 404 && model !== 'gemini-3.5-flash') {
    const fallbackEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`
    response = await fetch(fallbackEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })
  }

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Gemini API error (${response.status}): ${errText}`)
  }

  const data = await response.json()
  const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!candidateText) {
    throw new Error('No candidate content received from Gemini')
  }

  try {
    return JSON.parse(candidateText)
  } catch (err) {
    // Attempt markdown clean
    const cleaned = candidateText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim()
    return JSON.parse(cleaned)
  }
}

/**
 * Helper: Phase 1 "MAP" - Mine keywords from an individual batch of 50-60 MCQs (Fast, Thinking OFF)
 */
async function mineKeywordsFromMCQBatch(
  mcqs: Array<{ id: number; questionText: string; optionA: string; optionB: string; optionC: string; optionD: string; optionE?: string | null; correctAnswer: string; topic?: string | null; explanation?: string | null }>,
  chapterName: string,
  apiKeyOverride?: string
): Promise<string[]> {
  const digest = mcqs.map((q, idx) => 
    `[Q${idx + 1}] Stem: ${q.questionText} | Options: [A: ${q.optionA}, B: ${q.optionB}, C: ${q.optionC}, D: ${q.optionD}${q.optionE ? `, E: ${q.optionE}` : ''}] | Ans: ${q.correctAnswer} | Exp: ${q.explanation ? q.explanation.slice(0, 160) : ''}`
  ).join('\n')

  const systemPrompt = `You are an expert exam entity extractor for Indian agricultural examinations (NABARD, IBPS AFO, ICAR).
Analyze these multiple-choice questions for chapter "${chapterName}".
Extract ALL key examination concepts, entities, processes, physiological metrics, instruments, diseases, and comparative parameters mentioned across the question stems, correct answers, and distractor options.
Do NOT write definitions or summaries. Return only high-yield keywords.

Output strictly valid JSON:
{
  "keywords": ["Keyword1", "Keyword2", "Keyword3"]
}`

  const userPrompt = `MCQ BATCH:\n${digest}\n\nExtract all distinct keywords.`

  const res = await callGemini({
    systemPrompt,
    userPrompt,
    allowThinking: false, // Fast mining, zero reasoning overhead
    temperature: 0.1,
    apiKeyOverride
  })

  return res.keywords || []
}

/**
 * STEP 1: Two-Phase "Map-Reduce" Chapter Mind Map & Taxonomy Pipeline (10k Thinking for Reduce)
 * Handles chapters with 500+ MCQs gracefully:
 * - Phase 1 (Map): Chunked mining across all questions (Thinking OFF, Fast).
 * - Phase 2 (Reduce): Master taxonomy structuring with 10k thinking tokens.
 * - Phase 3 (Audit): Compares with TNAU Agritech standard syllabus to find missing topics.
 */
export async function generateChapterMindMap(
  chapterId: number,
  options?: { apiKey?: string; maxQuestionsSample?: number }
): Promise<ChapterMindMapTree> {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      quizzes: {
        include: {
          questions: {
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
              explanation: true
            }
          }
        }
      }
    }
  })

  if (!chapter) {
    throw new Error(`Chapter with ID ${chapterId} not found`)
  }

  // Gather all MCQs across quizzes in this chapter
  const allQuestions = chapter.quizzes.flatMap(q => q.questions)
  if (allQuestions.length === 0) {
    throw new Error(`Chapter "${chapter.name}" has no questions to extract keywords from.`)
  }

  // PHASE 1: MAP - Chunked Keyword Mining in batches of 50-60 (immune to mixed questions)
  const batchSize = 55
  const totalBatches = Math.ceil(allQuestions.length / batchSize)
  const minedKeywordsSet = new Set<string>()

  for (let b = 0; b < totalBatches; b++) {
    const batchQuestions = allQuestions.slice(b * batchSize, (b + 1) * batchSize)
    try {
      const keywords = await mineKeywordsFromMCQBatch(batchQuestions, chapter.name, options?.apiKey)
      keywords.forEach(kw => {
        if (kw && kw.trim()) minedKeywordsSet.add(kw.trim())
      })
    } catch (err: any) {
      console.warn(`Mining warning on batch ${b + 1}:`, err?.message)
    }

    // Pacing delay between mining calls to stay well within 15 RPM
    if (b < totalBatches - 1) {
      await sleep(1200)
    }
  }

  // Retrieve standard TNAU Agritech syllabus spine for benchmarking & gap audit
  const tnauSpine = getTNAUSpine(chapter.name)
  const mustCoverTopics = tnauSpine?.mustCoverTopics || []
  
  // Identify syllabus gaps (Topics in TNAU standard syllabus that were NOT found in any platform MCQ)
  const extractedListLower = new Set(Array.from(minedKeywordsSet).map(k => k.toLowerCase()))
  const gapTopics = mustCoverTopics.filter(topic => {
    const topicLower = topic.toLowerCase()
    return !Array.from(extractedListLower).some(extracted => 
      extracted.includes(topicLower) || topicLower.includes(extracted)
    )
  })

  // Ensure high-yield gap topics are also fed to the taxonomy architect so they appear in the mindmap
  const combinedKeywordsForTaxonomy = Array.from(new Set([
    ...Array.from(minedKeywordsSet),
    ...gapTopics
  ]))

  // PHASE 2: REDUCE - Master Taxonomy Structuring with 10,000 Thinking Tokens
  const systemPrompt = `You are a chief curriculum architect and competitive exam taxonomist specializing in agricultural examinations (NABARD Grade A, IBPS AFO, ICAR, State PSCs).
Construct a rigorous, comprehensive CHAPTER MIND MAP and TAXONOMY TREE for "${chapter.name}".
You are provided with a complete vocabulary of ${combinedKeywordsForTaxonomy.length} keywords mined from all chapter MCQs and benchmarked against TNAU Agritech university syllabus standards.

TAXONOMY & ARCHITECTURAL RULES:
1. DEDUPLICATION: Merge synonymous or near-identical terms into clear professional terms.
2. MACRO-BRANCHES: Organize extracted terms into 5 to 7 coherent, macro-categories suitable for the chapter "${chapter.name}" (aligned with ICAR / TNAU Agritech curriculum).
3. SUBCATEGORIES: Under each macro-category, create clear sub-branches grouping related terms.
4. ADJACENT RELATIONSHIPS (Cross-Branch Edges):
   Identify critical exam linkages between terms:
   - SIBLING/CONTRAST (e.g. Steaming up vs Flushing; A1 Milk vs A2 Milk)
   - LIFECYCLE (e.g. Oestrus -> Gestation -> Parturition -> Lactation -> Dry Period)
   - TOOL/DIAGNOSTIC (e.g. Castration <-> Burdizzo; Mastitis <-> California Mastitis Test)
   - CO_OCCURRENCE (terms frequently paired together in exam options)

Output strictly valid JSON conforming to this schema:
{
  "chapterId": ${chapterId},
  "chapterName": "${chapter.name}",
  "categories": [
    {
      "name": "Macro Category Name",
      "description": "Short 1-line scope",
      "subCategories": [
        {
          "name": "Subcategory Name",
          "keywords": ["Keyword1", "Keyword2", "Keyword3"]
        }
      ]
    }
  ],
  "crossBranchEdges": [
    {
      "from": "Keyword1",
      "to": "Keyword2",
      "relationType": "CO_OCCURRENCE" | "LIFECYCLE" | "TOOL_OR_DIAGNOSTIC" | "CONTRAST",
      "label": "Short reason for connection"
    }
  ],
  "allKeywords": ["Sorted list of all unique extracted keywords"]
}`

  const userPrompt = `KEYWORD VOCABULARY TO STRUCTURE:
${combinedKeywordsForTaxonomy.map((k, i) => `${i + 1}. ${k}`).join('\n')}

${tnauSpine ? `TNAU AGRITECH BENCHMARK CATEGORIES FOR REFERENCE:\n${tnauSpine.categories.map(c => `- ${c.name}: ${c.topics.slice(0, 3).join(', ')}`).join('\n')}` : ''}

Reason deeply through taxonomy and generate the complete Mind Map & Taxonomy JSON.`

  // CRITICAL: Generous 10,000 thinking tokens for the Master Taxonomy Architect
  const result: ChapterMindMapTree = await callGemini({
    systemPrompt,
    userPrompt,
    allowThinking: true,
    thinkingBudget: 10000,
    temperature: 0.3,
    apiKeyOverride: options?.apiKey
  })

  // Ensure allKeywords is deduplicated and flattened
  const collected = new Set<string>()
  if (result.categories && Array.isArray(result.categories)) {
    for (const cat of result.categories) {
      for (const sub of cat.subCategories || []) {
        for (const kw of sub.keywords || []) {
          if (kw && kw.trim()) collected.add(kw.trim())
        }
      }
    }
  }
  result.allKeywords = Array.from(collected)

  // PHASE 3: Calculate Syllabus Audit Metrics
  const totalStandard = mustCoverTopics.length || 1
  const coveredCount = Math.max(0, mustCoverTopics.length - gapTopics.length)
  const scorePercent = Math.round((coveredCount / totalStandard) * 100)

  result.syllabusAudit = {
    scorePercent: Math.min(100, Math.max(0, scorePercent)),
    totalBenchmarkTopics: mustCoverTopics.length,
    coveredTopicsCount: coveredCount,
    gapTopics,
    tnauSourceUrl: tnauSpine?.sourceUrl
  }

  // Persist into ChapterMindMap table
  await prisma.chapterMindMap.upsert({
    where: { chapterId },
    create: {
      chapterId,
      treeData: result as any,
      rawKeywords: result.allKeywords,
      lastSyncAt: new Date()
    },
    update: {
      treeData: result as any,
      rawKeywords: result.allKeywords,
      lastSyncAt: new Date()
    }
  })

  return result
}

/**
 * STEP 2: Generate Concept Capsules for Terms in Batches (THINKING OFF)
 * Generates definition, comparative markdown tables, exam traps, and sibling links.
 * Keeps thinking strictly OFF to save 100% reasoning overhead and minimize token bills.
 */
export async function generateConceptCapsulesBatch({
  chapterId,
  keywords,
  category,
  subCategory,
  apiKeyOverride,
  delayBetweenCallsMs = 1200
}: {
  chapterId: number
  keywords: string[]
  category: string
  subCategory?: string
  apiKeyOverride?: string
  delayBetweenCallsMs?: number
}): Promise<ConceptCapsule[]> {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      quizzes: {
        include: {
          questions: {
            where: {
              OR: keywords.map(kw => ({
                OR: [
                  { questionText: { contains: kw, mode: 'insensitive' } },
                  { explanation: { contains: kw, mode: 'insensitive' } },
                  { optionA: { contains: kw, mode: 'insensitive' } },
                  { optionB: { contains: kw, mode: 'insensitive' } },
                  { optionC: { contains: kw, mode: 'insensitive' } },
                  { optionD: { contains: kw, mode: 'insensitive' } }
                ]
              }))
            },
            take: 15
          }
        }
      }
    }
  })

  if (!chapter) {
    throw new Error(`Chapter ID ${chapterId} not found`)
  }

  // Gather matching questions for context
  const relevantQuestions = chapter.quizzes.flatMap(q => q.questions)
  const questionContext = relevantQuestions.map(q => 
    `[Q ID:${q.id}] Stem: ${q.questionText} | Options: [A:${q.optionA}, B:${q.optionB}, C:${q.optionC}, D:${q.optionD}] | Correct: ${q.correctAnswer} | Exp: ${q.explanation || ''}`
  ).join('\n')

  const systemPrompt = `You are an expert exam author and agriscience educator.
Your task is to write high-yield, exam-focused CONCEPT CAPSULES for the specified keywords under chapter "${chapter.name}".

STRICT GUIDELINES:
1. DEFINITION: 1 to 2 sentences max. Crystal clear, rigorous, scientific.
2. COMPARATIVE TABLE & NUMERICAL METRICS (Crucial!):
   - Whenever numbers, species variations, days, temperatures, percentages, or chemical attributes apply, YOU MUST format them into a clean GitHub Flavored Markdown (GFM) table!
   - Example for Gestation Period: Table with Species | Average Days | Months Approximation.
   - Example for Colostrum: Table with Parameter | Colostrum | Normal Milk.
   - Example for Soil: Table with Soil Type | Clay Mineral | Predominant Nutrients | Deficiencies.
3. EXAM TRAPS & HIGH-PROBABILITY POINTERS:
   - Detail exactly how exam examiners twist questions on this concept (e.g. classic distractor options, exceptions, standard ICAR/Govt values).
4. SIBLING & ADJACENT TERMS: List other keywords related to this term.
5. NO VERBOSE FLUFF: Keep it dense, high-contrast, structured with bold keywords and bullet points.
6. BENCHMARK AUTHORITY: Adhere strictly to authoritative ICAR and TNAU Agritech university benchmarks (e.g. standard livestock gestation days, silage moisture 65-70%, colostrum feeding within 1-2 hours, milk fat and SNF standards, Vertisol montmorillonite mineralogy).

Output strictly valid JSON with this schema:
{
  "capsules": [
    {
      "term": "Exact Keyword Name",
      "definition": "Crisp 1-2 sentence core definition",
      "content": "Rich markdown containing: ### High-Yield Exam Matrix \\n\\n| Column | Column | ... \\n\\n### Key Characteristics & Rules \\n- Bullet 1 ...",
      "examTraps": "> ⚠️ **Exam Trap & High-Yield Rules:** ...",
      "relatedTerms": ["RelatedTerm1", "RelatedTerm2"]
    }
  ]
}`

  const userPrompt = `TARGET KEYWORDS:
${keywords.map((k, i) => `${i + 1}. ${k}`).join('\n')}

CATEGORY: ${category}
${subCategory ? `SUBCATEGORY: ${subCategory}` : ''}

RELEVANT MCQS FROM THIS CHAPTER FOR CONTEXT:
${questionContext || 'Use standard authoritative agricultural exam curriculum data.'}

Generate the JSON capsules for each keyword above.`

  // THINKING IS STRICTLY OFF FOR DEFINITIONS (Pure structured synthesis)
  const result = await callGemini({
    systemPrompt,
    userPrompt,
    allowThinking: false, // ZERO thinking tokens spent here!
    temperature: 0.15,
    apiKeyOverride
  })

  const capsules: ConceptCapsule[] = result.capsules || []

  // Upsert each concept in the database and link matched questions
  for (const cap of capsules) {
    const slug = slugify(cap.term)

    // Find questions that mention this term to link them
    const matchingQs = relevantQuestions.filter(q => 
      q.questionText.toLowerCase().includes(cap.term.toLowerCase()) ||
      (q.explanation && q.explanation.toLowerCase().includes(cap.term.toLowerCase()))
    )

    await prisma.chapterConcept.upsert({
      where: {
        chapterId_slug: {
          chapterId,
          slug
        }
      },
      create: {
        chapterId,
        term: cap.term,
        slug,
        category,
        subCategory: subCategory || null,
        definition: cap.definition,
        content: cap.content,
        examTraps: cap.examTraps,
        relatedTerms: cap.relatedTerms || [],
        questions: {
          connect: matchingQs.map(q => ({ id: q.id }))
        }
      },
      update: {
        term: cap.term,
        category,
        subCategory: subCategory || null,
        definition: cap.definition,
        content: cap.content,
        examTraps: cap.examTraps,
        relatedTerms: cap.relatedTerms || [],
        questions: {
          connect: matchingQs.map(q => ({ id: q.id }))
        }
      }
    })
  }

  // Inter-call sleep to comfortably stay under 15 RPM for free tier
  if (delayBetweenCallsMs > 0) {
    await sleep(delayBetweenCallsMs)
  }

  return capsules
}

/**
 * STEP 3: Incremental Sync When New Quizzes / Questions Are Added
 * Matches new questions to existing concepts and detects any missing keywords.
 */
export async function incrementalQuizSync(quizId: number) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      chapter: {
        include: {
          concepts: true,
          mindMap: true
        }
      },
      questions: {
        include: {
          concepts: true
        }
      }
    }
  })

  if (!quiz) throw new Error(`Quiz ${quizId} not found`)
  const chapter = quiz.chapter
  const existingConcepts = chapter.concepts

  if (existingConcepts.length === 0) {
    // If no concepts exist yet, generate the mindmap first
    await generateChapterMindMap(chapter.id)
    return { status: 'INITIAL_MINDMAP_GENERATED' }
  }

  const linkedCount: { questionId: number; matchedConcepts: string[] }[] = []

  // Link questions to existing concepts via case-insensitive keyword match
  for (const q of quiz.questions) {
    const textToScan = `${q.questionText} ${q.optionA} ${q.optionB} ${q.optionC} ${q.optionD} ${q.explanation || ''}`.toLowerCase()
    
    const matched = existingConcepts.filter(c => 
      textToScan.includes(c.term.toLowerCase())
    )

    if (matched.length > 0) {
      await prisma.question.update({
        where: { id: q.id },
        data: {
          concepts: {
            connect: matched.map(m => ({ id: m.id }))
          }
        }
      })
      linkedCount.push({
        questionId: q.id,
        matchedConcepts: matched.map(m => m.term)
      })
    }
  }

  return {
    status: 'SYNCED',
    questionsProcessed: quiz.questions.length,
    linkedQuestions: linkedCount.length,
    details: linkedCount
  }
}
