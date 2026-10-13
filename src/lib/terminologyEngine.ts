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
 * Helper to call Google Gemini API with multi-tier resilience:
 * 1. Model failover: gemini-3.5-flash-lite <-> gemini-3.5-flash on 503/429
 * 2. Key failover: Primary Key (Free) -> Paid Key (process.env.GEMINI_PAID_API_KEY or fallbackApiKey)
 * 3. Transient retries with exponential backoff on 503 (High demand) spikes
 */
async function callGemini({
  systemPrompt,
  userPrompt,
  allowThinking = false,
  thinkingBudget = 1024,
  temperature = 0.2,
  apiKeyOverride,
  fallbackApiKey
}: {
  systemPrompt: string
  userPrompt: string
  allowThinking?: boolean
  thinkingBudget?: number
  temperature?: number
  apiKeyOverride?: string
  fallbackApiKey?: string
}) {
  const primaryKey = (apiKeyOverride || process.env.GEMINI_API_KEY || '').trim()
  const paidKey = (fallbackApiKey || process.env.GEMINI_PAID_API_KEY || process.env.GEMINI_FALLBACK_API_KEY || '').trim()

  if (!primaryKey && !paidKey) {
    throw new Error('GEMINI_API_KEY is not configured.')
  }

  // Build candidate key list: Free key first, then Paid key
  const candidateKeys: { key: string; isPaid: boolean }[] = []
  if (primaryKey) {
    candidateKeys.push({ key: primaryKey, isPaid: false })
  }
  if (paidKey && paidKey !== primaryKey) {
    candidateKeys.push({ key: paidKey, isPaid: true })
  }

  const defaultModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
  const alternateModel = defaultModel === 'gemini-3.5-flash' ? 'gemini-3.5-flash-lite' : 'gemini-3.5-flash'
  const candidateModels = [defaultModel, alternateModel]

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

  let lastError: Error | null = null

  // Outer loop: Try keys (Free key first, Paid key fallback)
  for (let k = 0; k < candidateKeys.length; k++) {
    const { key, isPaid } = candidateKeys[k]

    // Middle loop: Try models (Flash-Lite first, Flash fallback)
    for (let m = 0; m < candidateModels.length; m++) {
      const model = candidateModels[m]
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`

      // Inner loop: Retries with backoff on 503 / 429
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          })

          if (response.ok) {
            const data = await response.json()
            const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text
            if (!candidateText) {
              throw new Error(`Empty response content from ${model}`)
            }

            try {
              return JSON.parse(candidateText)
            } catch {
              const cleaned = candidateText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim()
              return JSON.parse(cleaned)
            }
          }

          // 503 (High Demand) or 429 (Rate Limit / Quota Exceeded)
          if (response.status === 503 || response.status === 429) {
            const errText = await response.text()
            console.warn(`[Gemini ${response.status}] ${model} on ${isPaid ? 'Paid' : 'Free'} key: ${errText.slice(0, 160)}. Attempting failover...`)
            lastError = new Error(`Gemini API error (${response.status}): ${errText}`)

            if (attempt === 0) {
              // Quick backoff before switching
              await sleep(1500)
              continue
            } else {
              break // Move to alternate model or paid key
            }
          }

          // 404 (Model not found)
          if (response.status === 404) {
            lastError = new Error(`Gemini model ${model} not found (404)`)
            break // Switch model immediately
          }

          // Other HTTP errors (e.g. 400 Bad Request)
          const errText = await response.text()
          lastError = new Error(`Gemini API error (${response.status}): ${errText}`)
          break

        } catch (fetchErr: any) {
          lastError = fetchErr
          await sleep(1000)
        }
      }
    }
  }

  throw lastError || new Error('All Gemini API attempts (free key, paid key fallback, and alternate models) failed.')
}

/**
 * Helper: Phase 1 "MAP" - Mine keywords from an individual batch of 50-60 MCQs (Fast, Thinking OFF)
 */
async function mineKeywordsFromMCQBatch(
  mcqs: Array<{ id: number; questionText: string; optionA: string; optionB: string; optionC: string; optionD: string; optionE?: string | null; correctAnswer: string; topic?: string | null; explanation?: string | null }>,
  chapterName: string,
  apiKeyOverride?: string,
  fallbackApiKey?: string
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
    apiKeyOverride,
    fallbackApiKey
  })

  return res.keywords || []
}

/**
 * Progressive / Phased Mining:
 * Mines keywords from a SINGLE batch of 50-60 MCQs in ~2 seconds.
 * Allows client-side manual clicking or timed batching to completely avoid Vercel timeouts.
 */
export async function mineSingleMCQBatch({
  chapterId,
  batchIndex,
  batchSize = 55,
  apiKey,
  fallbackApiKey
}: {
  chapterId: number
  batchIndex: number
  batchSize?: number
  apiKey?: string
  fallbackApiKey?: string
}) {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { id: true, name: true }
  })
  if (!chapter) throw new Error(`Chapter ${chapterId} not found`)

  const totalQuestions = await prisma.question.count({
    where: { quiz: { chapterId } }
  })

  const batchQuestions = await prisma.question.findMany({
    where: { quiz: { chapterId } },
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
    },
    orderBy: { id: 'asc' },
    skip: batchIndex * batchSize,
    take: batchSize
  })

  if (batchQuestions.length === 0) {
    const existing = await prisma.chapterMindMap.findUnique({ where: { chapterId } })
    return {
      batchIndex,
      batchQuestionsCount: 0,
      totalQuestions,
      totalBatches: Math.ceil(totalQuestions / batchSize),
      extractedKeywords: [],
      newKeywordsAdded: 0,
      totalKeywordsPool: existing?.rawKeywords?.length || 0,
      allRawKeywords: existing?.rawKeywords || []
    }
  }

  const minedKeywords = await mineKeywordsFromMCQBatch(
    batchQuestions,
    chapter.name,
    apiKey,
    fallbackApiKey
  )

  const existingMindMap = await prisma.chapterMindMap.findUnique({
    where: { chapterId }
  })

  const currentPool = new Set<string>(existingMindMap?.rawKeywords || [])
  let newAdded = 0
  minedKeywords.forEach(kw => {
    const trimmed = (kw || '').trim()
    if (trimmed && !currentPool.has(trimmed)) {
      currentPool.add(trimmed)
      newAdded++
    }
  })

  const updatedList = Array.from(currentPool)

  await prisma.chapterMindMap.upsert({
    where: { chapterId },
    create: {
      chapterId,
      rawKeywords: updatedList,
      treeData: { categories: [], crossBranchEdges: [], allKeywords: updatedList },
      lastSyncAt: new Date()
    },
    update: {
      rawKeywords: updatedList,
      lastSyncAt: new Date()
    }
  })

  return {
    batchIndex,
    batchQuestionsCount: batchQuestions.length,
    totalQuestions,
    totalBatches: Math.ceil(totalQuestions / batchSize),
    extractedKeywords: minedKeywords,
    newKeywordsAdded: newAdded,
    totalKeywordsPool: updatedList.length,
    allRawKeywords: updatedList
  }
}

/**
 * Phase 2 Synthesizer:
 * Takes accumulated keyword vocabulary and generates the Master Mind Map (Taxonomy Tree)
 * using 10,000 thinking tokens in ~12 to 18 seconds.
 */
export async function synthesizeMindMapFromKeywords({
  chapterId,
  keywords,
  apiKey,
  fallbackApiKey
}: {
  chapterId: number
  keywords?: string[]
  apiKey?: string
  fallbackApiKey?: string
}): Promise<ChapterMindMapTree> {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { id: true, name: true }
  })
  if (!chapter) throw new Error(`Chapter ${chapterId} not found`)

  let targetKeywords = keywords
  if (!targetKeywords || targetKeywords.length === 0) {
    const existing = await prisma.chapterMindMap.findUnique({ where: { chapterId } })
    targetKeywords = existing?.rawKeywords || []
  }

  if (targetKeywords.length === 0) {
    throw new Error('No keywords found to synthesize taxonomy. Please mine at least one batch first.')
  }

  const tnauSpine = getTNAUSpine(chapter.name)
  const mustCoverTopics = tnauSpine?.mustCoverTopics || []

  const extractedLower = new Set(targetKeywords.map(k => k.toLowerCase()))
  const gapTopics = mustCoverTopics.filter(topic => {
    const topicLower = topic.toLowerCase()
    return !Array.from(extractedLower).some(extracted => 
      extracted.includes(topicLower) || topicLower.includes(extracted)
    )
  })

  const combined = Array.from(new Set([...targetKeywords, ...gapTopics]))

  const systemPrompt = `You are a chief curriculum architect and competitive exam taxonomist specializing in agricultural examinations (NABARD Grade A, IBPS AFO, ICAR, State PSCs).
Construct a rigorous, comprehensive CHAPTER MIND MAP and TAXONOMY TREE for "${chapter.name}".
You are provided with a complete vocabulary of ${combined.length} keywords mined from chapter MCQs and benchmarked against TNAU Agritech university syllabus standards.

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
${combined.map((k, i) => `${i + 1}. ${k}`).join('\n')}

${tnauSpine ? `TNAU AGRITECH BENCHMARK CATEGORIES FOR REFERENCE:\n${tnauSpine.categories.map(c => `- ${c.name}: ${c.topics.slice(0, 3).join(', ')}`).join('\n')}` : ''}

Reason deeply through taxonomy and generate the complete Mind Map & Taxonomy JSON.`

  const result: ChapterMindMapTree = await callGemini({
    systemPrompt,
    userPrompt,
    allowThinking: true,
    thinkingBudget: 10000,
    temperature: 0.3,
    apiKeyOverride: apiKey,
    fallbackApiKey
  })

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
 * STEP 1: Two-Phase "Map-Reduce" Chapter Mind Map & Taxonomy Pipeline (10k Thinking for Reduce)
 * Handles chapters with 500+ MCQs gracefully:
 * - Phase 1 (Map): Chunked mining across all questions (Thinking OFF, Fast).
 * - Phase 2 (Reduce): Master taxonomy structuring with 10k thinking tokens.
 * - Phase 3 (Audit): Compares with TNAU Agritech standard syllabus to find missing topics.
 */
export async function generateChapterMindMap(
  chapterId: number,
  options?: { apiKey?: string; fallbackApiKey?: string; maxQuestionsSample?: number }
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

  // Sample high-yield MCQs (default 180 = ~3 batches) so generation finishes comfortably in 15-20s
  const sampleLimit = options?.maxQuestionsSample || 180
  const sampledQuestions = allQuestions.length > sampleLimit
    ? allQuestions.slice(0, sampleLimit)
    : allQuestions

  // PHASE 1: MAP - Chunked Keyword Mining in batches of 55-60 (immune to mixed questions)
  const batchSize = 60
  const totalBatches = Math.ceil(sampledQuestions.length / batchSize)
  const minedKeywordsSet = new Set<string>()

  for (let b = 0; b < totalBatches; b++) {
    const batchQuestions = sampledQuestions.slice(b * batchSize, (b + 1) * batchSize)
    try {
      const keywords = await mineKeywordsFromMCQBatch(
        batchQuestions, 
        chapter.name, 
        options?.apiKey,
        options?.fallbackApiKey
      )
      keywords.forEach(kw => {
        if (kw && kw.trim()) minedKeywordsSet.add(kw.trim())
      })
    } catch (err: any) {
      console.warn(`Mining warning on batch ${b + 1}:`, err?.message)
    }

    // Pacing delay between mining calls
    if (b < totalBatches - 1) {
      await sleep(1000)
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

  // CRITICAL: Generous 10,000 thinking tokens for the Master Taxonomy Architect (with multi-key failover)
  const result: ChapterMindMapTree = await callGemini({
    systemPrompt,
    userPrompt,
    allowThinking: true,
    thinkingBudget: 10000,
    temperature: 0.3,
    apiKeyOverride: options?.apiKey,
    fallbackApiKey: options?.fallbackApiKey
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
  fallbackApiKey,
  delayBetweenCallsMs = 1200
}: {
  chapterId: number
  keywords: string[]
  category: string
  subCategory?: string
  apiKeyOverride?: string
  fallbackApiKey?: string
  delayBetweenCallsMs?: number
}): Promise<ConceptCapsule[]> {
  // Fast chapter check
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { id: true, name: true }
  })

  if (!chapter) {
    throw new Error(`Chapter ID ${chapterId} not found`)
  }

  // Direct fast lookup of relevant questions without nested quiz scans
  const relevantQuestions = await prisma.question.findMany({
    where: {
      quiz: { chapterId },
      OR: keywords.map(kw => ({
        OR: [
          { questionText: { contains: kw, mode: 'insensitive' } },
          { explanation: { contains: kw, mode: 'insensitive' } }
        ]
      }))
    },
    select: {
      id: true,
      questionText: true,
      optionA: true,
      optionB: true,
      optionC: true,
      optionD: true,
      correctAnswer: true,
      explanation: true
    },
    take: 8
  })

  // Format question context
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
    apiKeyOverride,
    fallbackApiKey
  })

  // Robust parsing: accept array directly or property wrappers
  let capsules: ConceptCapsule[] = []
  if (Array.isArray(result)) {
    capsules = result
  } else if (Array.isArray(result?.capsules)) {
    capsules = result.capsules
  } else if (Array.isArray(result?.concepts)) {
    capsules = result.concepts
  } else if (Array.isArray(result?.data)) {
    capsules = result.data
  }

  // Upsert each concept in the database and link matched questions
  for (const cap of capsules) {
    const term = (cap.term || '').trim()
    if (!term) continue
    const slug = slugify(term)
    const definition = cap.definition || `${term} - key agricultural concept.`
    const content = cap.content || definition
    const examTraps = cap.examTraps || null
    const relatedTerms = Array.isArray(cap.relatedTerms) ? cap.relatedTerms : []

    // Find questions that mention this term to link them
    const matchingQs = relevantQuestions.filter(q => 
      q.questionText.toLowerCase().includes(term.toLowerCase()) ||
      (q.explanation && q.explanation.toLowerCase().includes(term.toLowerCase()))
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
        term,
        slug,
        category,
        subCategory: subCategory || null,
        definition,
        content,
        examTraps,
        relatedTerms,
        questions: {
          connect: matchingQs.map(q => ({ id: q.id }))
        }
      },
      update: {
        term,
        category,
        subCategory: subCategory || null,
        definition,
        content,
        examTraps,
        relatedTerms,
        questions: {
          set: matchingQs.map(q => ({ id: q.id }))
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
