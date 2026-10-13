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
 * - Phase 1 (MCQ Mining) & Phase 3 (Capsules): gemini-3.5-flash-lite, thinkingLevel = 'MINIMAL', Free Keys first -> Paid Key fallback
 * - Phase 2 (Master MindMap Taxonomy): gemini-3.5-flash, thinkingLevel = 'MEDIUM', Free Keys first -> Paid Key fallback
 */
async function callGemini({
  systemPrompt,
  userPrompt,
  allowThinking = false,
  temperature = 0.2,
  apiKeyOverride,
  fallbackApiKey,
  modelOverride
}: {
  systemPrompt: string
  userPrompt: string
  allowThinking?: boolean
  thinkingBudget?: number
  temperature?: number
  apiKeyOverride?: string
  fallbackApiKey?: string
  modelOverride?: string
}) {
  const primaryKey = (apiKeyOverride || process.env.GEMINI_API_KEY || '').trim()
  const secondFreeKey = (process.env.GEMINI_API_KEY_2 || '').trim()
  const paidKey = (fallbackApiKey || process.env.GEMINI_PAID_API_KEY || process.env.GEMINI_FALLBACK_API_KEY || '').trim()

  if (!primaryKey && !secondFreeKey && !paidKey) {
    throw new Error('GEMINI_API_KEY, GEMINI_API_KEY_2, or GEMINI_PAID_API_KEY is not configured.')
  }

  // Candidate keys:
  // Universal 3-tier failover across all phases (including Phase 2 Deep Reasoning):
  // 1. FREE 1 (GEMINI_API_KEY)
  // 2. FREE 2 (GEMINI_API_KEY_2)
  // 3. PAID (GEMINI_PAID_API_KEY / fallbackApiKey)
  const candidateKeys: { key: string; isPaid: boolean; label: string }[] = []

  // 1. First free key
  if (primaryKey) {
    candidateKeys.push({ key: primaryKey, isPaid: false, label: 'FREE 1' })
  }
  // 2. Second free key (GEMINI_API_KEY_2)
  if (secondFreeKey && secondFreeKey !== primaryKey) {
    candidateKeys.push({ key: secondFreeKey, isPaid: false, label: 'FREE 2' })
  }
  // 3. Fallback to paid key (used only if both free keys fail or are unavailable)
  if (paidKey && paidKey !== primaryKey && paidKey !== secondFreeKey) {
    candidateKeys.push({ key: paidKey, isPaid: true, label: 'PAID' })
  }
  if (candidateKeys.length === 0 && paidKey) {
    candidateKeys.push({ key: paidKey, isPaid: true, label: 'PAID' })
  }

  // Model Selection:
  // - Phase 1 & 3: gemini-3.5-flash-lite (high throughput, low latency, budget-friendly)
  // - Phase 2: gemini-3.5-flash (deep reasoning for master mindmap taxonomy synthesis)
  const defaultModel = allowThinking ? 'gemini-3.5-flash' : 'gemini-3.5-flash-lite'
  const model = modelOverride || defaultModel

  // Build request body:
  // - Phase 2 (Taxonomy Reasoning): thinkingLevel = 'MEDIUM'
  // - Phase 1 & 3 (Mining & Capsules): thinkingLevel = 'MINIMAL' (suppresses extensive CoT, reduces thought tokens to near zero)
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
      temperature: allowThinking ? Math.max(temperature, 0.4) : temperature,
      thinkingConfig: {
        thinkingLevel: allowThinking ? 'MEDIUM' : 'MINIMAL'
      }
    }
  }

  let lastError: Error | null = null
  const overallDeadline = Date.now() + 54000

  for (let i = 0; i < candidateKeys.length; i++) {
    const { key, isPaid, label } = candidateKeys[i]
    const nextCandidate = candidateKeys[i + 1]
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`

    const remainingMs = overallDeadline - Date.now()
    if (remainingMs < 3000) {
      break
    }
    const fetchTimeoutMs = Math.min(remainingMs - 1000, allowThinking ? 50000 : 35000)

    console.log(`[Gemini] >> ${model} | ${label} key (${key.slice(0, 8)}...) | thinking: ${allowThinking ? 'MEDIUM' : 'MINIMAL'} | timeout: ${fetchTimeoutMs}ms | prompt: ${userPrompt.length} chars`)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), fetchTimeoutMs)

    try {
      const t0 = Date.now()
      let response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })
      clearTimeout(timer)
      const elapsed = Date.now() - t0

      console.log(`[Gemini] << ${model} | ${label} | HTTP ${response.status} | ${elapsed}ms`)

      // Auto-recovery: If thinkingConfig was rejected with 400 INVALID_ARGUMENT, retry without it
      if (response.status === 400 && requestBody.generationConfig?.thinkingConfig) {
        const errText = await response.text()
        console.warn(`[Gemini] 400 from ${model} on ${label} with thinkingConfig: ${errText.slice(0, 160)}. Retrying without thinkingConfig...`)
        const fallbackBody = { ...requestBody, generationConfig: { ...requestBody.generationConfig } }
        delete fallbackBody.generationConfig.thinkingConfig

        const retryController = new AbortController()
        const retryTimer = setTimeout(() => retryController.abort(), 25000)
        try {
          const retryRes = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fallbackBody),
            signal: retryController.signal
          })
          clearTimeout(retryTimer)
          if (retryRes.ok) {
            response = retryRes
          }
        } catch {
          clearTimeout(retryTimer)
        }
      }

      if (response.ok) {
        const data = await response.json()
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (!candidateText) {
          console.error(`[Gemini] Empty candidate text from ${model} on ${label}:`, JSON.stringify(data).slice(0, 200))
          lastError = new Error(`Empty response content from ${model} on ${label} key`)
          continue
        }

        try {
          return JSON.parse(candidateText)
        } catch {
          const cleaned = candidateText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim()
          return JSON.parse(cleaned)
        }
      }

      const errText = await response.text()
      console.warn(`[Gemini ${response.status}] ${model} on ${label} key: ${errText.slice(0, 200)}`)

      // 503 (High Demand) or 429 (Rate Limit) -> fail over to next candidate key in chain
      if (response.status === 503 || response.status === 429) {
        console.warn(`[Gemini Failover] ${label} key got ${response.status}. ${nextCandidate ? `Failing over to ${nextCandidate.label} key...` : 'No more fallback keys.'}`)
        lastError = new Error(`Gemini API error (${response.status}) on ${label} key: ${errText}`)
        continue
      }

      if (response.status === 404) {
        if (model === 'gemini-3.5-flash-lite') {
          console.warn(`[Gemini 404] ${model} not found on ${label} key. Attempting fallback to gemini-3.5-flash...`)
          try {
            const fallbackEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${key}`
            const fbRes = await fetch(fallbackEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
              signal: controller.signal
            })
            if (fbRes.ok) {
              const fbData = await fbRes.json()
              const fbCandidate = fbData.candidates?.[0]?.content?.parts?.[0]?.text
              if (fbCandidate) {
                clearTimeout(timer)
                try {
                  return JSON.parse(fbCandidate)
                } catch {
                  const cleaned = fbCandidate.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim()
                  return JSON.parse(cleaned)
                }
              }
            }
          } catch (fbErr: any) {
            console.warn(`[Gemini Fallback Error]`, fbErr?.message)
          }
        }
        lastError = new Error(`Gemini model ${model} not found (404)`)
        continue
      }

      lastError = new Error(`Gemini API error (${response.status}) on ${label} key: ${errText}`)
      continue

    } catch (fetchErr: any) {
      clearTimeout(timer)
      if (fetchErr.name === 'AbortError') {
        console.warn(`[Gemini Timeout] ${model} on ${label} key timed out after ${fetchTimeoutMs}ms`)
        lastError = new Error(`Model ${model} timed out after ${fetchTimeoutMs}ms on ${label} key.`)
      } else {
        console.error(`[Gemini Error] ${model} on ${label} key:`, fetchErr.message)
        lastError = fetchErr
      }
      continue
    }
  }

  throw lastError || new Error('All Gemini API attempts failed.')
}

/**
 * Helper: Phase 1 "MAP" - Mine keywords from an individual batch of MCQs (Fast, Thinking OFF)
 */
async function mineKeywordsFromMCQBatch(
  mcqs: Array<{ id: number; questionText: string; optionA: string; optionB: string; optionC: string; optionD: string; optionE?: string | null; correctAnswer: string; topic?: string | null; explanation?: string | null }>,
  chapterName: string,
  apiKeyOverride?: string,
  fallbackApiKey?: string
): Promise<string[]> {
  const digest = mcqs.map((q, idx) => {
    const opts = [q.optionA, q.optionB, q.optionC, q.optionD, q.optionE].filter(Boolean).join(', ')
    return `[Q${idx + 1}] ${q.questionText} | Ans: ${q.correctAnswer}${q.topic ? ` | Topic: ${q.topic}` : ''} | Options: ${opts}`
  }).join('\n')

  const systemPrompt = `You are an expert exam entity extractor for Indian agricultural examinations (NABARD, IBPS AFO, ICAR).
Analyze these multiple-choice questions for chapter "${chapterName}".
Extract ALL key examination concepts, entities, processes, physiological metrics, instruments, diseases, and comparative parameters mentioned across the question stems, correct answers, and distractor options.
Do NOT write definitions or summaries. Return only high-yield keywords.

CRITICAL EXCLUSIONS:
- Do NOT extract standalone geographic administrative entities (e.g. states like "Punjab", "Rajasthan", "Haryana", districts, countries).
- Do NOT extract generic filler words or exam distractors (e.g. "Option A", "Group", "Band", "Trip", "True", "False").
- Return strictly high-yield agricultural/veterinary terms.

Output strictly valid JSON:
{
  "keywords": ["Keyword1", "Keyword2", "Keyword3"]
}`

  const userPrompt = `MCQ BATCH:\n${digest}\n\nExtract all distinct keywords.`

  console.log(`[Phase 1 MCQ Mining] === INPUT START ===`)
  console.log(`[Phase 1 MCQ Mining] Chapter: "${chapterName}", Questions count: ${mcqs.length}`)
  console.log(`[Phase 1 MCQ Mining] Prompt chars: ${userPrompt.length} (~${Math.round(userPrompt.length / 4)} tokens)`)
  console.log(`[Phase 1 MCQ Mining] First question preview: ${digest.split('\n')[0]}`)

  const startTime = Date.now()
  const res = await callGemini({
    systemPrompt,
    userPrompt,
    allowThinking: false, // Fast mining, zero reasoning overhead
    temperature: 0.1,
    apiKeyOverride,
    fallbackApiKey,
    modelOverride: 'gemini-3.5-flash-lite'
  })
  const durationMs = Date.now() - startTime

  const keywords: string[] = res.keywords || []
  console.log(`[Phase 1 MCQ Mining] === OUTPUT RECEIVED (${durationMs}ms) ===`)
  console.log(`[Phase 1 MCQ Mining] Extracted ${keywords.length} keywords:`, keywords)

  return keywords
}

/**
 * Progressive / Phased Mining:
 * Mines keywords from a SINGLE batch of MCQs in ~1.5-2 seconds.
 * Allows client-side manual clicking or timed batching to completely avoid Vercel timeouts.
 */
export async function mineSingleMCQBatch({
  chapterId,
  batchIndex,
  batchSize = 25,
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
1. STRICT DOMAIN RELEVANCE & NOISE FILTERING:
   - EXCLUDE all standalone administrative geographies (e.g. states like "Punjab", "Rajasthan", "Haryana", districts, or countries). Do NOT create concept nodes for geographic states. If a breed has an origin, keep the breed name (e.g., "Bikaneri Camel", "Murrah Buffalo"), not the state as an independent node.
   - EXCLUDE generic exam distractors, filler words, or general English words (e.g., "Group", "Band", "Trip", "True", "False", "None of the above", "Option A").
   - EXCLUDE any non-domain entities unrelated to ${chapter.name}.
   - RETAIN only substantive, high-yield examination concepts: breeds, anatomical & physiological metrics, diseases & vaccines, breeding & reproduction techniques, feeds & nutritional values, housing & management systems, dairy/meat processing parameters, and diagnostic tools.

2. COMPREHENSIVE COVERAGE (DO NOT ARTIFICIALLY BOTTLE-NECK OR TRUNCATE):
   - Do NOT restrict or compress the taxonomy to an arbitrary small number (e.g., do not bottle-neck to 50 concepts).
   - Retain ALL distinct, valid, non-repetitive, exam-relevant concepts found in the vocabulary. If there are 100, 150, 200, or more legitimate concepts across the chapter MCQs, include EVERY single one under its proper subcategory. Comprehensive syllabus coverage is paramount.

3. CANONICAL DEDUPLICATION & MERGING:
   - Merge synonymous, plural/singular, or slightly varied spellings into a single canonical professional term (e.g. "Desi pig" and "Desi pigs" -> "Indigenous Pig Breeds"; "Colostrum feeding" and "Feeding colostrum" -> "Colostrum Management").
   - Ensure every concept name is clean, Title-Cased, and free of formatting artifacts.

4. COHERENT MACRO-BRANCHES & SUBCATEGORIES:
   - Organize terms into 6 to 8 coherent, ICAR / TNAU-aligned macro-categories suitable for "${chapter.name}".
   - Under each macro-category, create clear sub-branches (subCategories) and distribute ALL valid deduplicated concepts into them.

5. ADJACENT RELATIONSHIPS (Cross-Branch Edges):
   - Identify critical exam linkages between terms:
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
  ]
}
Note: Output only the top 15-20 most critical crossBranchEdges. Do NOT generate a separate allKeywords array (it is automatically compiled from categories).`

  const userPrompt = `KEYWORD VOCABULARY TO FILTER AND STRUCTURE (${combined.length} raw terms):
${combined.map((k, i) => `${i + 1}. ${k}`).join('\n')}

${tnauSpine ? `TNAU AGRITECH BENCHMARK CATEGORIES FOR REFERENCE:\n${tnauSpine.categories.map(c => `- ${c.name}: ${c.topics.slice(0, 3).join(', ')}`).join('\n')}` : ''}

Filter out state names and non-subject noise, deduplicate variations, and structure ALL genuine non-repetitive ${chapter.name} exam concepts into the complete Mind Map & Taxonomy JSON.`

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
1. STRICT DOMAIN RELEVANCE & NOISE FILTERING:
   - EXCLUDE all standalone administrative geographies (e.g. states like "Punjab", "Rajasthan", "Haryana", districts, or countries). Do NOT create concept nodes for geographic states. If a breed has an origin, keep the breed name (e.g., "Bikaneri Camel", "Murrah Buffalo"), not the state as an independent node.
   - EXCLUDE generic exam distractors, filler words, or general English words (e.g., "Group", "Band", "Trip", "True", "False", "None of the above", "Option A").
   - EXCLUDE any non-domain entities unrelated to ${chapter.name}.
   - RETAIN only substantive, high-yield examination concepts: breeds, anatomical & physiological metrics, diseases & vaccines, breeding & reproduction techniques, feeds & nutritional values, housing & management systems, dairy/meat processing parameters, and diagnostic tools.

2. COMPREHENSIVE COVERAGE (DO NOT ARTIFICIALLY BOTTLE-NECK OR TRUNCATE):
   - Do NOT restrict or compress the taxonomy to an arbitrary small number (e.g., do not bottle-neck to 50 concepts).
   - Retain ALL distinct, valid, non-repetitive, exam-relevant concepts found in the vocabulary. If there are 100, 150, 200, or more legitimate concepts across the chapter MCQs, include EVERY single one under its proper subcategory. Comprehensive syllabus coverage is paramount.

3. CANONICAL DEDUPLICATION & MERGING:
   - Merge synonymous, plural/singular, or slightly varied spellings into a single canonical professional term (e.g. "Desi pig" and "Desi pigs" -> "Indigenous Pig Breeds"; "Colostrum feeding" and "Feeding colostrum" -> "Colostrum Management").
   - Ensure every concept name is clean, Title-Cased, and free of formatting artifacts.

4. COHERENT MACRO-BRANCHES & SUBCATEGORIES:
   - Organize terms into 6 to 8 coherent, ICAR / TNAU-aligned macro-categories suitable for "${chapter.name}".
   - Under each macro-category, create clear sub-branches (subCategories) and distribute ALL valid deduplicated concepts into them.

5. ADJACENT RELATIONSHIPS (Cross-Branch Edges):
   - Identify critical exam linkages between terms:
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
  ]
}
Note: Output only the top 15-20 most critical crossBranchEdges. Do NOT generate a separate allKeywords array (it is automatically compiled from categories).`

  const userPrompt = `KEYWORD VOCABULARY TO FILTER AND STRUCTURE (${combinedKeywordsForTaxonomy.length} raw terms):
${combinedKeywordsForTaxonomy.map((k, i) => `${i + 1}. ${k}`).join('\n')}

${tnauSpine ? `TNAU AGRITECH BENCHMARK CATEGORIES FOR REFERENCE:\n${tnauSpine.categories.map(c => `- ${c.name}: ${c.topics.slice(0, 3).join(', ')}`).join('\n')}` : ''}

Filter out state names and non-subject noise, deduplicate variations, and structure ALL genuine non-repetitive ${chapter.name} exam concepts into the complete Mind Map & Taxonomy JSON.`

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
  keywords = [],
  category = 'General',
  subCategory,
  items,
  apiKeyOverride,
  fallbackApiKey,
  delayBetweenCallsMs = 1200
}: {
  chapterId: number
  keywords?: string[]
  category?: string
  subCategory?: string
  items?: Array<{ keyword: string; category?: string; subCategory?: string }>
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

  // Normalize batch: support up to 20 concepts per batch (e.g. 5, 6, 7, 10, 12, 15)
  const normalizedItems: Array<{ keyword: string; category: string; subCategory?: string | null }> = 
    (items && items.length > 0)
      ? items.slice(0, 20).map(it => ({
          keyword: it.keyword.trim(),
          category: it.category || category || 'General',
          subCategory: it.subCategory || subCategory || null
        }))
      : (keywords || []).slice(0, 20).map(k => ({
          keyword: k.trim(),
          category: category || 'General',
          subCategory: subCategory || null
        }))

  if (normalizedItems.length === 0) {
    return []
  }

  const targetKeywords = normalizedItems.map(it => it.keyword)

  // Direct fast lookup of relevant questions without nested quiz scans
  const relevantQuestions = await prisma.question.findMany({
    where: {
      quiz: { chapterId },
      OR: targetKeywords.map(kw => ({
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
    take: Math.max(20, normalizedItems.length * 3) // Rich question context scaled with batch size
  })

  // Format question context
  const questionContext = relevantQuestions.map(q => 
    `[Q ID:${q.id}] Stem: ${q.questionText} | Options: [A:${q.optionA}, B:${q.optionB}, C:${q.optionC}, D:${q.optionD}] | Correct: ${q.correctAnswer} | Exp: ${q.explanation || ''}`
  ).join('\n')

  const systemPrompt = `You are an expert exam author and agriscience educator.
Your task is to write high-yield, exam-focused CONCEPT CAPSULES for the specified keywords under chapter "${chapter.name}".
Because this batch contains only 5 to 7 concepts, provide MAXIMUM RIGOR, HIGH DEPTH, and UNCOMPROMISED ACCURACY.

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

  const userPrompt = `TARGET KEYWORDS (Batch of ${normalizedItems.length} concepts):
${normalizedItems.map((it, i) => `${i + 1}. "${it.keyword}" [Branch: ${it.category}${it.subCategory ? ` > ${it.subCategory}` : ''}]`).join('\n')}

RELEVANT MCQS FROM THIS CHAPTER FOR CONTEXT:
${questionContext || 'Use standard authoritative agricultural exam curriculum data (ICAR / TNAU).'}

Generate the JSON capsules for each keyword above with full tables and traps.`

  // THINKING IS STRICTLY OFF FOR DEFINITIONS (Pure structured synthesis)
  const result = await callGemini({
    systemPrompt,
    userPrompt,
    allowThinking: false, // ZERO thinking tokens spent here!
    temperature: 0.15,
    apiKeyOverride,
    fallbackApiKey,
    modelOverride: 'gemini-3.5-flash-lite'
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

    // Match exact category/subCategory from normalizedItems
    const matchedMeta = normalizedItems.find(it => it.keyword.toLowerCase() === term.toLowerCase())
    const itemCategory = matchedMeta?.category || category || 'General'
    const itemSubCategory = matchedMeta?.subCategory || subCategory || null

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
        category: itemCategory,
        subCategory: itemSubCategory,
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
        category: itemCategory,
        subCategory: itemSubCategory,
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
