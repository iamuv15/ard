import prisma from '@/lib/prisma'
import { getTNAUSpine } from '@/lib/tnauSyllabusSpine'
import { enrichConceptTerm } from '@/lib/mediaEnrichment'
import fs from 'fs'
import path from 'path'

// Cache of loaded Notes/*.md files
let notesCache: Record<string, string> | null = null

function loadNotesKnowledge(): Record<string, string> {
  if (notesCache) return notesCache
  const cache: Record<string, string> = {}
  try {
    const notesDir = path.join(process.cwd(), 'Notes')
    if (fs.existsSync(notesDir)) {
      const files = fs.readdirSync(notesDir).filter(f => f.endsWith('.md'))
      for (const file of files) {
        cache[file] = fs.readFileSync(path.join(notesDir, file), 'utf-8')
      }
    }
    const soilDir = path.join(process.cwd(), 'Notes', 'Soil_Science')
    if (fs.existsSync(soilDir)) {
      const soilFiles = fs.readdirSync(soilDir).filter(f => f.endsWith('.md'))
      for (const file of soilFiles) {
        cache[file] = fs.readFileSync(path.join(soilDir, file), 'utf-8')
      }
    }
  } catch (err) {
    console.warn('Failed to load notes knowledge:', err)
  }
  notesCache = cache
  return cache
}

export function getGroundingContextForCategory(category: string, keywords: string[]): { primaryText: string; pyqText: string } {
  const notes = loadNotesKnowledge()
  const lowerCat = category.toLowerCase()

  // Match corresponding category file (Animal Husbandry or Soil Science)
  let matchingFile = ''
  if (/breed|genetic|species|cattle|buffalo|goat|sheep|swine|pig|camel|rabbit|horse/i.test(lowerCat)) {
    matchingFile = '01_livestock_breeds_and_genetics.md'
  } else if (/reproduct|physiol|estrus|oestrus|heat|gestation|breeding|inseminat|castrat/i.test(lowerCat)) {
    matchingFile = '02_reproductive_physiology_and_lifecycle.md'
  } else if (/feed|fodder|nutrit|digest|rumen|ration/i.test(lowerCat)) {
    matchingFile = '03_animal_feeds_fodder_and_nutrition.md'
  } else if (/farm|hous|management|tool|dentition|census|institute|calf/i.test(lowerCat)) {
    matchingFile = '04_farm_management_practices_and_housing.md'
  } else if (/dairy|milk|process|technolog|ghee|pasteur/i.test(lowerCat)) {
    matchingFile = '05_dairy_science_and_processing_technology.md'
  } else if (/poultry|avian|chicken|egg|broiler|layer/i.test(lowerCat)) {
    matchingFile = '06_poultry_husbandry_and_management.md'
  } else if (/health|disease|vaccin|medicine|patholog/i.test(lowerCat)) {
    matchingFile = '07_animal_healthcare_diseases_and_vaccination.md'
  } else if (/rock|mineral|weathering|fundamental|crust|geolog/i.test(lowerCat)) {
    matchingFile = '01_soil_science_fundamentals_rocks_and_minerals.md'
  } else if (/formation|pedolog|profile|horizon|jenny|epipedon|endopedon/i.test(lowerCat)) {
    matchingFile = '02_soil_formation_weathering_and_pedology.md'
  } else if (/physical|texture|stokes|structure|density|porosity|bulk density|particle density|color|munsell|consistency/i.test(lowerCat)) {
    matchingFile = '03_soil_physical_properties.md'
  } else if (/water|moisture|hygroscopic|wilting|field capacity|pf|tensiometer|percolat|darcy|infiltration/i.test(lowerCat)) {
    matchingFile = '04_soil_water_dynamics_and_measurement.md'
  } else if (/alluvial|black soil|vertisol|red soil|laterite|taxonomy|usda order|inceptisol|entisol|alfisol/i.test(lowerCat)) {
    matchingFile = '05_soils_of_india_and_soil_taxonomy.md'
  } else if (/colloid|chemistry|cec|anion exchange|clay mineral|montmorillonite|kaolinite|humus|c:n ratio|organic matter/i.test(lowerCat)) {
    matchingFile = '06_soil_chemistry_colloids_and_organic_matter.md'
  } else if (/problem|salin|sodic|alkali|acid soil|gypsum requirement|liming|sar|esp|cat clay/i.test(lowerCat)) {
    matchingFile = '07_problematic_soils_and_reclamation.md'
  } else if (/erosion|usle|conservation|wind erosion|water erosion|gully|rill|sheet|watershed/i.test(lowerCat)) {
    matchingFile = '08_soil_erosion_conservation_and_watershed.md'
  } else if (/nutrient|fertilizer|manure|fym|compost|biofertilizer|arnon|deficiency|khaira|whiptail|urea|dap|can|fco/i.test(lowerCat)) {
    matchingFile = '09_plant_nutrients_manures_and_fertilizers.md'
  } else if (/tillage|tilth|puddling|plough|zero tillage|conservation tillage|minimum tillage/i.test(lowerCat)) {
    matchingFile = '10_tillage_and_soil_management.md'
  }

  let primaryText = matchingFile && notes[matchingFile] ? notes[matchingFile] : ''
  if (primaryText.length > 20000) {
    primaryText = primaryText.slice(0, 20000)
  }

  // Cross-cutting PYQ matches: select appropriate master PYQ file based on domain
  const isSoilDomain = /soil|rock|mineral|weathering|pedolog|profile|texture|water|alluvial|vertisol|salin|sodic|erosion|nutrient|fertilizer|manure|biofertilizer|tillage/i.test(lowerCat)
  let pyqText = ''
  const pyqFile = isSoilDomain
    ? (notes['00_master_exam_facts_and_pyqs.md'] || notes['08_important_exam_facts_and_one_liners.md'] || '')
    : (notes['08_important_exam_facts_and_one_liners.md'] || notes['00_master_exam_facts_and_pyqs.md'] || '')
  if (pyqFile) {
    const lines = pyqFile.split('\n')
    const relevantLines: string[] = []
    const kwTokens = keywords.flatMap(k => k.toLowerCase().split(/[\s-]+/)).filter(t => t.length > 3)

    for (const line of lines) {
      const lowerLine = line.toLowerCase()
      if (kwTokens.some(token => lowerLine.includes(token))) {
        relevantLines.push(line)
        if (relevantLines.length >= 25) break
      }
    }

    if (relevantLines.length > 0) {
      pyqText = relevantLines.join('\n')
    } else {
      pyqText = lines.filter(l => l.startsWith('* **') || l.startsWith('- **') || l.startsWith('*')).slice(0, 15).join('\n')
    }
  }

  return { primaryText, pyqText }
}


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
 * Ultra-robust JSON parser that safely repairs invalid JSON escape sequences
 * (e.g. \%, \|, \_, \*, \ , etc. commonly produced when LLMs write markdown in JSON strings),
 * trailing commas, raw unescaped newlines/tabs inside string literals, and extraneous markdown text.
 */
function robustJsonParse(jsonStr: string): any {
  if (!jsonStr || typeof jsonStr !== 'string') {
    throw new Error('Invalid JSON input: empty or not a string')
  }

  // 1. Strip markdown wrappers
  let str = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

  // Fast path: try standard parse first
  try {
    return JSON.parse(str)
  } catch {
    // Continue to repair
  }

  // 2. Extract balanced JSON block if there is extraneous text around it
  const firstBrace = str.indexOf('{')
  const firstBracket = str.indexOf('[')
  let startIdx = -1
  let isObject = false

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace
    isObject = true
  } else if (firstBracket !== -1) {
    startIdx = firstBracket
    isObject = false
  }

  if (startIdx !== -1) {
    const lastChar = isObject ? '}' : ']'
    const lastIdx = str.lastIndexOf(lastChar)
    if (lastIdx > startIdx) {
      str = str.slice(startIdx, lastIdx + 1)
    }
  }

  try {
    return JSON.parse(str)
  } catch {}

  // 3. State Machine Lexer: repair unescaped backslashes, control characters, and newlines
  let insideString = false
  let result = ''

  for (let i = 0; i < str.length; i++) {
    const c = str[i]

    if (!insideString) {
      if (c === '"') {
        insideString = true
        result += c
      } else {
        result += c
      }
    } else {
      // Inside a string
      if (c === '"') {
        insideString = false
        result += c
      } else if (c === '\\') {
        const next = str[i + 1]
        if (
          next === '"' ||
          next === '\\' ||
          next === '/' ||
          next === 'b' ||
          next === 'f' ||
          next === 'n' ||
          next === 'r' ||
          next === 't'
        ) {
          // Valid JSON escape
          result += c + next
          i++
        } else if (next === 'u' && /^[0-9a-fA-F]{4}$/.test(str.slice(i + 2, i + 6))) {
          // Valid unicode escape \uXXXX
          result += str.slice(i, i + 6)
          i += 5
        } else {
          // Invalid escape: escape the backslash itself to prevent "Bad escaped character"
          result += '\\\\'
        }
      } else if (c === '\n') {
        result += '\\n'
      } else if (c === '\r') {
        result += '\\r'
      } else if (c === '\t') {
        result += '\\t'
      } else if (c.charCodeAt(0) < 32) {
        // Replace non-printable ASCII control characters with space
        result += ' '
      } else {
        result += c
      }
    }
  }

  // 4. Strip trailing commas before closing braces or brackets
  result = result.replace(/,\s*([}\]])/g, '$1')

  try {
    return JSON.parse(result)
  } catch (err) {
    // 5. Fallback regex extraction for concept capsules if full parse fails
    const capsuleMatch = result.match(/\{\s*"term"\s*:\s*"[^"]+"/g)
    if (capsuleMatch && capsuleMatch.length > 0) {
      const capsules: any[] = []
      const regex = /\{\s*"term"\s*:\s*"([^"]+)"[\s\S]*?"definition"\s*:\s*"([^"]+)"[\s\S]*?"content"\s*:\s*"((?:[^"\\]|\\.)*)"/g
      let m: RegExpExecArray | null
      while ((m = regex.exec(result)) !== null) {
        try {
          capsules.push({
            term: m[1],
            definition: m[2],
            content: m[3].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
          })
        } catch {}
      }
      if (capsules.length > 0) {
        return { capsules }
      }
    }
    throw err
  }
}

/**
 * Helper to call Google Gemini API with multi-tier resilience:
 * - Phase 1 (MCQ Mining) & Phase 3 (Capsules): gemini-3.5-flash-lite, thinkingLevel = 'MINIMAL', Free Keys first -> Paid Key fallback
 * - Phase 2 (Master MindMap Taxonomy): gemini-3.5-flash, thinkingLevel = 'MEDIUM', Free Keys first -> Paid Key fallback
 */
export async function callGemini({
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
          return robustJsonParse(candidateText)
        } catch (jsonErr: any) {
          console.error(`[Gemini JSON Parse Error] ${jsonErr.message}. Sample text:`, candidateText.slice(0, 300))
          lastError = new Error(`Failed to parse AI JSON response: ${jsonErr.message}`)
          continue
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
                  return robustJsonParse(fbCandidate)
                } catch (fbJsonErr: any) {
                  console.error(`[Gemini Fallback JSON Parse Error] ${fbJsonErr.message}`)
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
 * Smart "Delta Append" (Option 2):
 * When new MCQs are mined or added:
 * 1. Links questions to matching existing concepts in the chapter (updating questionCount).
 * 2. If a new question contains novel traps, numbers, or rules not present in concept.examTraps,
 *    appends a single crisp bullet point to concept.examTraps without touching definition or tables.
 */
export async function applySmartDeltaAppend({
  chapterId,
  questions,
  apiKey,
  fallbackApiKey
}: {
  chapterId: number
  questions: Array<{
    id: number
    questionText: string
    optionA: string
    optionB: string
    optionC: string
    optionD: string
    optionE?: string | null
    correctAnswer: string
    explanation?: string | null
  }>
  apiKey?: string
  fallbackApiKey?: string
}) {
  const existingConcepts = await prisma.chapterConcept.findMany({
    where: { chapterId },
    select: {
      id: true,
      term: true,
      slug: true,
      examTraps: true
    }
  })

  if (existingConcepts.length === 0) return { linkedCount: 0, deltaAppendedCount: 0 }

  let linkedCount = 0
  let deltaAppendedCount = 0

  for (const q of questions) {
    const stemAndOptions = `${q.questionText} ${q.optionA} ${q.optionB} ${q.optionC} ${q.optionD}`.toLowerCase()

    // Find concepts mentioned in this question using whole-word boundary matching on stem and options
    const matchedConcepts = existingConcepts.filter(c => {
      if (!c.term || c.term.trim().length < 3) return false
      const escaped = c.term.toLowerCase().trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`\\b${escaped}\\b`, 'i')
      return regex.test(stemAndOptions)
    })

    if (matchedConcepts.length === 0) continue

    // Connect question to matched concepts
    await prisma.question.update({
      where: { id: q.id },
      data: {
        concepts: {
          connect: matchedConcepts.map(c => ({ id: c.id }))
        }
      }
    })
    linkedCount++

    // For any matched concept that has an explanation with substantive text:
    if (q.explanation && q.explanation.trim().length > 25) {
      for (const concept of matchedConcepts) {
        const currentTraps = concept.examTraps || ''
        
        // Fast heuristic check: if the explanation text is already contained in the trap, skip AI call
        const snippet = q.explanation.slice(0, 35).toLowerCase()
        if (currentTraps.toLowerCase().includes(snippet)) continue

        try {
          const prompt = `You are an expert agricultural competitive exam author.
Concept: "${concept.term}"
Current Exam Traps for this concept:
"${currentTraps.slice(0, 500)}"

Newly added exam question:
Stem: ${q.questionText}
Ans: ${q.correctAnswer}
Explanation: ${q.explanation}

Does this new question reveal a critical exam trap, numeric standard, or exception that is NOT already mentioned in the Current Exam Traps?
If YES, provide a single concise bullet point (maximum 1 sentence) starting with "- ⚡ **Delta Update:** ".
If NO or redundant, return strictly: {"newTrap": null}

Return valid JSON: {"newTrap": string | null}`

          const res = await callGemini({
            systemPrompt: 'You are an expert agricultural competitive exam author.',
            userPrompt: prompt,
            allowThinking: false,
            temperature: 0.1,
            apiKeyOverride: apiKey,
            fallbackApiKey,
            modelOverride: 'gemini-3.5-flash-lite'
          })

          if (res?.newTrap && typeof res.newTrap === 'string' && res.newTrap.trim().length > 10) {
            const updatedTraps = currentTraps
              ? `${currentTraps.trim()}\n\n${res.newTrap.trim()}`
              : res.newTrap.trim()

            await prisma.chapterConcept.update({
              where: { id: concept.id },
              data: { examTraps: updatedTraps }
            })
            concept.examTraps = updatedTraps // update local copy
            deltaAppendedCount++
          }
        } catch (err: any) {
          console.warn(`Smart delta append skipped for concept "${concept.term}":`, err?.message)
        }
      }
    }
  }

  return { linkedCount, deltaAppendedCount }
}

/**
 * Incremental Delta Mining with Database Lock:
 * Strictly processes UNMINED questions (isMined: false) in small batches.
 * Once mined, questions are marked isMined: true so they are NEVER re-run through the AI.
 * Also runs Smart Delta Append to link questions and update existing concept cards with new traps.
 */
export async function mineSingleMCQBatch({
  chapterId,
  batchIndex = 0,
  batchSize = 25,
  apiKey,
  fallbackApiKey,
  forceAll = false
}: {
  chapterId: number
  batchIndex?: number
  batchSize?: number
  apiKey?: string
  fallbackApiKey?: string
  forceAll?: boolean
}) {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { id: true, name: true }
  })
  if (!chapter) throw new Error(`Chapter ${chapterId} not found`)

  const totalQuestions = await prisma.question.count({
    where: { quiz: { chapterId } }
  })

  const minedQuestions = await prisma.question.count({
    where: { quiz: { chapterId }, isMined: true }
  })

  const unminedQuestions = totalQuestions - minedQuestions

  // If already 100% locked and user didn't explicitly force
  if (!forceAll && unminedQuestions === 0) {
    const existing = await prisma.chapterMindMap.findUnique({ where: { chapterId } })
    return {
      batchIndex: 0,
      batchQuestionsCount: 0,
      totalQuestions,
      minedQuestions,
      unminedQuestions: 0,
      isLocked: true,
      totalBatches: 0,
      extractedKeywords: [],
      newKeywordsAdded: 0,
      totalKeywordsPool: existing?.rawKeywords?.length || 0,
      allRawKeywords: existing?.rawKeywords || [],
      message: 'All questions in this chapter are already mined and locked.'
    }
  }

  // Fetch only unmined questions for targeted delta mining
  const batchQuestions = await prisma.question.findMany({
    where: forceAll 
      ? { quiz: { chapterId } }
      : { quiz: { chapterId }, isMined: false },
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
    skip: forceAll ? batchIndex * batchSize : 0,
    take: batchSize
  })

  if (batchQuestions.length === 0) {
    const existing = await prisma.chapterMindMap.findUnique({ where: { chapterId } })
    return {
      batchIndex,
      batchQuestionsCount: 0,
      totalQuestions,
      minedQuestions,
      unminedQuestions: 0,
      isLocked: true,
      totalBatches: 0,
      extractedKeywords: [],
      newKeywordsAdded: 0,
      totalKeywordsPool: existing?.rawKeywords?.length || 0,
      allRawKeywords: existing?.rawKeywords || []
    }
  }

  // Phase 1: Extract keywords from this new batch of questions
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

  // Mark processed questions as locked in database
  const processedIds = batchQuestions.map(q => q.id)
  await prisma.question.updateMany({
    where: { id: { in: processedIds } },
    data: { isMined: true }
  })

  // Smart Delta Append: link newly mined questions to existing cards & append new traps
  const deltaResult = await applySmartDeltaAppend({
    chapterId,
    questions: batchQuestions,
    apiKey,
    fallbackApiKey
  })

  const newMinedCount = minedQuestions + batchQuestions.length
  const newUnminedCount = Math.max(0, totalQuestions - newMinedCount)

  return {
    batchIndex,
    batchQuestionsCount: batchQuestions.length,
    totalQuestions,
    minedQuestions: newMinedCount,
    unminedQuestions: newUnminedCount,
    isLocked: newUnminedCount === 0,
    totalBatches: Math.ceil(newUnminedCount / batchSize),
    extractedKeywords: minedKeywords,
    newKeywordsAdded: newAdded,
    totalKeywordsPool: updatedList.length,
    allRawKeywords: updatedList,
    deltaAppended: deltaResult
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

  const isSoil = /soil/i.test(chapter.name)
  const isAnimal = /animal|husbandry|dairy|livestock|poultry/i.test(chapter.name)

  const domainSubstantiveText = isSoil
    ? `soil physical properties, separates & structures, soil water forms & potentials, weathering & master horizons, soil taxonomy orders, clay mineral lattices, chemical metrics (CEC, SAR, ESP, pH, EC), problematic soil types & chemical amendments, water & wind erosion stages, USLE factors, essential plant nutrients, deficiency symptoms, fertilizer grades (FCO 1985), and tillage systems.`
    : isAnimal
    ? `breeds, anatomical & physiological metrics, diseases & vaccines, breeding & reproduction techniques, feeds & nutritional values, housing & management systems, dairy/meat processing parameters, and diagnostic tools.`
    : `core biological processes, classifications, physical/chemical metrics, diagnostic tools, management practices, and exam benchmarks.`

  const domainEdgesText = isSoil
    ? `      - SIBLING/CONTRAST (e.g. Khadar vs Bhangar; 1:1 Kaolinite vs 2:1 Montmorillonite; Saline vs Alkali Soil; Bulk Density vs Particle Density)
      - LIFECYCLE/PROCESS (e.g. Weathering -> Regolith -> Solum; Splash -> Sheet -> Rill -> Gully -> Ravine; Ammonification -> Nitrification -> Denitrification)
      - TOOL/DIAGNOSTIC/AMENDMENT (e.g. Soil Moisture Tension <-> Tensiometer; Sodic Soil <-> Gypsum; Acid Soil <-> Agricultural Lime; Groundwater Depth <-> Piezometer)
      - CO_OCCURRENCE (terms frequently paired together in exam options, e.g. Montmorillonite <-> Vertisol; Stokes Law <-> Sedimentation Velocity)`
    : `      - SIBLING/CONTRAST (e.g. Steaming up vs Flushing; A1 Milk vs A2 Milk)
      - LIFECYCLE (e.g. Oestrus -> Gestation -> Parturition -> Lactation -> Dry Period)
      - TOOL/DIAGNOSTIC (e.g. Castration <-> Burdizzo; Mastitis <-> California Mastitis Test)
      - CO_OCCURRENCE (terms frequently paired together in exam options)`

  const deduplicationExamples = isSoil
    ? `(e.g. "Stokes law" and "Stokes's law" -> "Stokes' Law"; "Vertisol" and "Vertisols" -> "Vertisols / Black Cotton Soil"; "Bulk density" and "Soil bulk density" -> "Bulk Density")`
    : `(e.g. "Desi pig" and "Desi pigs" -> "Indigenous Pig Breeds"; "Colostrum feeding" and "Feeding colostrum" -> "Colostrum Management")`

  const systemPrompt = `You are a chief curriculum architect and competitive exam taxonomist specializing in agricultural examinations (NABARD Grade A, IBPS AFO, ICAR, State PSCs).
Construct a rigorous, comprehensive CHAPTER MIND MAP and TAXONOMY TREE for "${chapter.name}".
You are provided with a complete vocabulary of ${combined.length} keywords mined from chapter MCQs and benchmarked against authoritative Master Curriculum Notes and standard syllabus standards.

TAXONOMY & ARCHITECTURAL RULES:
1. STRICT DOMAIN RELEVANCE & NOISE FILTERING:
   - EXCLUDE all standalone administrative geographies (e.g. states like "Punjab", "Rajasthan", "Haryana", districts, or countries). Do NOT create concept nodes for geographic states. If a breed or soil has an origin, keep the specific subject entity (e.g., "Bikaneri Camel", "Black Cotton Soil"), not the state as an independent node.
   - EXCLUDE generic exam distractors, filler words, or general English words (e.g., "Group", "Band", "Trip", "True", "False", "None of the above", "Option A").
   - EXCLUDE any non-domain entities unrelated to ${chapter.name}.
   - RETAIN only substantive, high-yield examination concepts: ${domainSubstantiveText}

2. COMPREHENSIVE COVERAGE (DO NOT ARTIFICIALLY BOTTLE-NECK OR TRUNCATE):
   - Do NOT restrict or compress the taxonomy to an arbitrary small number (e.g., do not bottle-neck to 50 concepts).
   - Retain ALL distinct, valid, non-repetitive, exam-relevant concepts found in the vocabulary. If there are 100, 150, 200, or more legitimate concepts across the chapter MCQs, include EVERY single one under its proper subcategory. Comprehensive syllabus coverage is paramount.

3. CANONICAL DEDUPLICATION & MERGING:
   - Merge synonymous, plural/singular, or slightly varied spellings into a single canonical professional term ${deduplicationExamples}.
   - Ensure every concept name is clean, Title-Cased, and free of formatting artifacts.

4. COHERENT MACRO-BRANCHES & SUBCATEGORIES:
   - Organize terms into 6 to 8 coherent, ICAR / syllabus-aligned macro-categories suitable for "${chapter.name}".
   - Under each macro-category, create clear sub-branches (subCategories) and distribute ALL valid deduplicated concepts into them.

5. ADJACENT RELATIONSHIPS (Cross-Branch Edges):
   - Identify critical exam linkages between terms:
${domainEdgesText}

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

  const isSoil = /soil/i.test(chapter.name)
  const isAnimal = /animal|husbandry|dairy|livestock|poultry/i.test(chapter.name)

  const domainSubstantiveText = isSoil
    ? `soil physical properties, separates & structures, soil water forms & potentials, weathering & master horizons, soil taxonomy orders, clay mineral lattices, chemical metrics (CEC, SAR, ESP, pH, EC), problematic soil types & chemical amendments, water & wind erosion stages, USLE factors, essential plant nutrients, deficiency symptoms, fertilizer grades (FCO 1985), and tillage systems.`
    : isAnimal
    ? `breeds, anatomical & physiological metrics, diseases & vaccines, breeding & reproduction techniques, feeds & nutritional values, housing & management systems, dairy/meat processing parameters, and diagnostic tools.`
    : `core biological processes, classifications, physical/chemical metrics, diagnostic tools, management practices, and exam benchmarks.`

  const domainEdgesText = isSoil
    ? `      - SIBLING/CONTRAST (e.g. Khadar vs Bhangar; 1:1 Kaolinite vs 2:1 Montmorillonite; Saline vs Alkali Soil; Bulk Density vs Particle Density)
      - LIFECYCLE/PROCESS (e.g. Weathering -> Regolith -> Solum; Splash -> Sheet -> Rill -> Gully -> Ravine; Ammonification -> Nitrification -> Denitrification)
      - TOOL/DIAGNOSTIC/AMENDMENT (e.g. Soil Moisture Tension <-> Tensiometer; Sodic Soil <-> Gypsum; Acid Soil <-> Agricultural Lime; Groundwater Depth <-> Piezometer)
      - CO_OCCURRENCE (terms frequently paired together in exam options, e.g. Montmorillonite <-> Vertisol; Stokes Law <-> Sedimentation Velocity)`
    : `      - SIBLING/CONTRAST (e.g. Steaming up vs Flushing; A1 Milk vs A2 Milk)
      - LIFECYCLE (e.g. Oestrus -> Gestation -> Parturition -> Lactation -> Dry Period)
      - TOOL/DIAGNOSTIC (e.g. Castration <-> Burdizzo; Mastitis <-> California Mastitis Test)
      - CO_OCCURRENCE (terms frequently paired together in exam options)`

  const deduplicationExamples = isSoil
    ? `(e.g. "Stokes law" and "Stokes's law" -> "Stokes' Law"; "Vertisol" and "Vertisols" -> "Vertisols / Black Cotton Soil"; "Bulk density" and "Soil bulk density" -> "Bulk Density")`
    : `(e.g. "Desi pig" and "Desi pigs" -> "Indigenous Pig Breeds"; "Colostrum feeding" and "Feeding colostrum" -> "Colostrum Management")`

  // PHASE 2: REDUCE - Master Taxonomy Structuring with 10,000 Thinking Tokens
  const systemPrompt = `You are a chief curriculum architect and competitive exam taxonomist specializing in agricultural examinations (NABARD Grade A, IBPS AFO, ICAR, State PSCs).
Construct a rigorous, comprehensive CHAPTER MIND MAP and TAXONOMY TREE for "${chapter.name}".
You are provided with a complete vocabulary of ${combinedKeywordsForTaxonomy.length} keywords mined from all chapter MCQs and benchmarked against authoritative Master Curriculum Notes and standard syllabus standards.

TAXONOMY & ARCHITECTURAL RULES:
1. STRICT DOMAIN RELEVANCE & NOISE FILTERING:
   - EXCLUDE all standalone administrative geographies (e.g. states like "Punjab", "Rajasthan", "Haryana", districts, or countries). Do NOT create concept nodes for geographic states. If a breed or soil has an origin, keep the specific subject entity (e.g., "Bikaneri Camel", "Black Cotton Soil"), not the state as an independent node.
   - EXCLUDE generic exam distractors, filler words, or general English words (e.g., "Group", "Band", "Trip", "True", "False", "None of the above", "Option A").
   - EXCLUDE any non-domain entities unrelated to ${chapter.name}.
   - RETAIN only substantive, high-yield examination concepts: ${domainSubstantiveText}

2. COMPREHENSIVE COVERAGE (DO NOT ARTIFICIALLY BOTTLE-NECK OR TRUNCATE):
   - Do NOT restrict or compress the taxonomy to an arbitrary small number (e.g., do not bottle-neck to 50 concepts).
   - Retain ALL distinct, valid, non-repetitive, exam-relevant concepts found in the vocabulary. If there are 100, 150, 200, or more legitimate concepts across the chapter MCQs, include EVERY single one under its proper subcategory. Comprehensive syllabus coverage is paramount.

3. CANONICAL DEDUPLICATION & MERGING:
   - Merge synonymous, plural/singular, or slightly varied spellings into a single canonical professional term ${deduplicationExamples}.
   - Ensure every concept name is clean, Title-Cased, and free of formatting artifacts.

4. COHERENT MACRO-BRANCHES & SUBCATEGORIES:
   - Organize terms into 6 to 8 coherent, ICAR / syllabus-aligned macro-categories suitable for "${chapter.name}".
   - Under each macro-category, create clear sub-branches (subCategories) and distribute ALL valid deduplicated concepts into them.

5. ADJACENT RELATIONSHIPS (Cross-Branch Edges):
   - Identify critical exam linkages between terms:
${domainEdgesText}

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
  }  const targetKeywords = normalizedItems.map(it => it.keyword)  // Expand search terms with word stems and standard synonyms to prevent missing MCQs
  const searchTerms = Array.from(new Set(targetKeywords.flatMap(kw => {
    const terms = [kw]
    const lower = kw.toLowerCase()
    if (lower.includes('estrus') || lower.includes('oestrus')) {
      terms.push('estrus', 'oestrus', 'estrous', 'heat period', 'heat')
    } else if (lower.includes('saline') || lower.includes('sodic') || lower.includes('alkali')) {
      terms.push('salinity', 'sodicity', 'esp', 'sar', 'gypsum')
    } else if (lower.includes('texture') || lower.includes('stokes')) {
      terms.push('hydrometer', 'international pipet', 'isss', 'usda', 'sand', 'silt', 'clay')
    }
    const words = kw.split(/[\s-]+/).filter(w => w.length > 3 && !['phase', 'system', 'type', 'breed', 'order', 'soil', 'soils', 'plant', 'water', 'management'].includes(w.toLowerCase()))
    terms.push(...words)
    return terms
  })))

  // Direct fast lookup of relevant questions across chapter with expanded search terms
  const relevantQuestions = await prisma.question.findMany({
    where: {
      quiz: { chapterId },
      OR: searchTerms.map(term => ({
        OR: [
          { questionText: { contains: term, mode: 'insensitive' } },
          { explanation: { contains: term, mode: 'insensitive' } }
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
    take: Math.max(50, normalizedItems.length * 8) // Scaled question context to prevent MCQ truncation
  })

  // Format question context
  const questionContext = relevantQuestions.map(q => 
    `[Q ID:${q.id}] Stem: ${q.questionText} | Options: [A:${q.optionA}, B:${q.optionB}, C:${q.optionC}, D:${q.optionD}] | Correct: ${q.correctAnswer} | Exp: ${q.explanation || ''}`
  ).join('\n')

  // Load primary textbook ground truth and PYQs for this category
  const { primaryText, pyqText } = getGroundingContextForCategory(normalizedItems[0]?.category || category || '', targetKeywords)

  const isSoilChapter = /soil|earth|pedol|fertili|agronomy|land/i.test(chapter.name) ||
    /soil|rock|mineral|weathering|pedolog|profile|texture|water|alluvial|vertisol|salin|sodic|erosion|nutrient|fertilizer|manure|biofertilizer|tillage/i.test(normalizedItems[0]?.category || category || '')

  const systemPrompt = isSoilChapter
    ? `You are a distinguished Soil Science and Agricultural Chemistry professor preparing authoritative high-yield concept capsules for competitive examinations (ICAR-AIEEA/JRF, State AO/AAO, IBPS-AFO, NABARD, UPSC-Agriculture).
Your task is to write high-yield, exam-focused CONCEPT CAPSULES for the specified keywords under chapter "${chapter.name}".
Provide MAXIMUM RIGOR, HIGH DEPTH, and UNCOMPROMISED ACCURACY for every concept in this batch.

STRICT GUIDELINES:
1. DEFINITION: 1 to 2 sentences max. Crystal clear, rigorous, scientific (incorporating pedological, physical, or chemical mechanisms).
2. COMPARATIVE TABLE & NUMERICAL METRICS (Crucial!):
   - Whenever numbers, size fractions, EC/ESP/pH thresholds, bulk density, pF values, clay expandability/CEC, or fertilizer N:P:K percentages apply, YOU MUST format them into a clean GitHub Flavored Markdown (GFM) table!
   - Example for Problematic Soils: Table with Soil Class | pH | EC (dS/m) | ESP (%) | SAR | Dominant Cation/Anion | Reclamation Amendment.
   - Example for Soil Texture: Table with Fraction | ISSS Size (mm) | USDA Size (mm) | Specific Surface Area | Cohesion/Plasticity.
   - Example for Clay Minerals: Table with Mineral Group | Lattice Type (1:1 / 2:1) | Basal Spacing (Å) | Swelling/Shrinkage | CEC (cmol(p+)/kg).
   - Example for Soil Water Potentials: Table with Category | Suction (bars / atm) | pF Value | Availability to Plants | Measurement Instrument.
   - Example for Plant Nutrients: Table with Nutrient | Available Ionic Form | Mobility in Plant | Classic Deficiency Symptom / Indicator Crop | Critical Concentration.
   - Example for Fertilizers: Table with Fertilizer | Total N% | P2O5% / K2O% | Form | Acidity/Basicity Equivalent | Precautions.
3. EXAM TRAPS & HIGH-PROBABILITY POINTERS:
   - Detail exactly how exam examiners twist questions on this concept (e.g. bulk density vs particle density vs porosity formula traps; Stokes' Law assumptions/limitations; saline vs sodic leaching vs gypsum order; Khaira disease vs Whiptail vs Marsh spot; FCO 1985 biuret limits; Vertisol self-ploughing).
4. GROUND TRUTH MANDATE:
   - Adhere strictly to the provided PRIMARY TEXTBOOK REFERENCE and AUTHORITATIVE PREVIOUS YEAR EXAM FACTS (PYQS).
   - Do NOT alter standard numbers, constants (e.g. bulk density 1.33 g/cm³, particle density 2.65 g/cm³, pF 2.54 field capacity, pF 4.18 PWP), or legal percentages.
5. SIBLING & ADJACENT TERMS: List other keywords related to this term.
6. NO VERBOSE FLUFF: Keep it dense, high-contrast, structured with bold keywords and bullet points.
7. VALID JSON ESCAPING: Output strictly valid JSON. In markdown strings, do NOT escape standard characters like %, |, _, *, <, > with backslashes. Only use standard JSON escapes (\", \\, \n, \t). Do NOT produce illegal escape characters.

Output strictly valid JSON with this schema:
{
  "capsules": [
    {
      "term": "Exact Keyword Name",
      "definition": "Crisp 1-2 sentence core definition",
      "content": "Rich markdown containing: ### High-Yield Exam Matrix \\n\\n| Column | Column | ... \\n\\n### Key Characteristics & Rules \\n- Bullet 1 ...",
      "examTraps": "> [!WARNING]\\n> **Exam Trap & High-Yield Rules:** ...",
      "relatedTerms": ["RelatedTerm1", "RelatedTerm2"]
    }
  ]
}`
    : `You are a distinguished Veterinary and Agricultural Science professor preparing authoritative high-yield concept capsules for competitive examinations (ICAR, JRF, State AO/AAO, IBPS-AFO, NABARD).
Your task is to write high-yield, exam-focused CONCEPT CAPSULES for the specified keywords under chapter "${chapter.name}".
Provide MAXIMUM RIGOR, HIGH DEPTH, and UNCOMPROMISED ACCURACY for every concept in this batch.

STRICT GUIDELINES:
1. DEFINITION: 1 to 2 sentences max. Crystal clear, rigorous, scientific.
2. COMPARATIVE TABLE & NUMERICAL METRICS (Crucial!):
   - Whenever numbers, species variations, days, temperatures, percentages, or chemical attributes apply, YOU MUST format them into a clean GitHub Flavored Markdown (GFM) table!
   - Example for Gestation Period: Table with Species | Average Days | Months Approximation | Heat Duration.
   - Example for Colostrum: Table with Parameter | Colostrum | Normal Milk.
   - Example for Feeds & Nutrition: Table with Feed Type | DCP % | TDN % | Moisture %.
3. EXAM TRAPS & HIGH-PROBABILITY POINTERS:
   - Detail exactly how exam examiners twist questions on this concept (e.g. classic distractor options, exceptions, past AFO/RRB SO trivia).
4. GROUND TRUTH MANDATE:
   - Adhere strictly to the provided PRIMARY TEXTBOOK REFERENCE and AUTHORITATIVE PREVIOUS YEAR EXAM FACTS (PYQS).
   - Do NOT alter standard numbers, durations, or legal percentages.
5. SIBLING & ADJACENT TERMS: List other keywords related to this term.
6. NO VERBOSE FLUFF: Keep it dense, high-contrast, structured with bold keywords and bullet points.
7. VALID JSON ESCAPING: Output strictly valid JSON. In markdown strings, do NOT escape standard characters like %, |, _, *, <, > with backslashes. Only use standard JSON escapes (\", \\, \n, \t). Do NOT produce illegal escape characters.

Output strictly valid JSON with this schema:
{
  "capsules": [
    {
      "term": "Exact Keyword Name",
      "definition": "Crisp 1-2 sentence core definition",
      "content": "Rich markdown containing: ### High-Yield Exam Matrix \\n\\n| Column | Column | ... \\n\\n### Key Characteristics & Rules \\n- Bullet 1 ...",
      "examTraps": "> [!WARNING]\\n> **Exam Trap & High-Yield Rules:** ...",
      "relatedTerms": ["RelatedTerm1", "RelatedTerm2"]
    }
  ]
}`

  const userPrompt = `TARGET KEYWORDS (Batch of ${normalizedItems.length} concepts):
${normalizedItems.map((it, i) => `${i + 1}. "${it.keyword}" [Branch: ${it.category}${it.subCategory ? ` > ${it.subCategory}` : ''}]`).join('\n')}

${primaryText ? `PRIMARY TEXTBOOK REFERENCE (GROUND TRUTH):\n${primaryText}\n` : ''}
${pyqText ? `AUTHORITATIVE PREVIOUS YEAR EXAM FACTS & PYQS:\n${pyqText}\n` : ''}

${questionContext ? `RELEVANT MCQS FROM THIS CHAPTER FOR CONTEXT:\n${questionContext.slice(0, 10000)}\n` : ''}
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

    // Strict whole-phrase matching with word boundaries on question stem and options
    const termsToMatch = [term, ...relatedTerms].filter(t => t && t.trim().length >= 3)
    const matchingQs = relevantQuestions.filter(q => {
      const stemAndOptions = `${q.questionText} ${q.optionA} ${q.optionB} ${q.optionC} ${q.optionD}`
      return termsToMatch.some(t => {
        const escaped = t.toLowerCase().trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`\\b${escaped}\\b`, 'i')
        return regex.test(stemAndOptions)
      })
    })

    // Enrich media via free Wikimedia REST API & YouTube practical demo link (Zero Cost)
    let media: {
      imageUrl?: string | null
      thumbnailUrl?: string | null
      imageCaption?: string | null
      sourceUrl?: string | null
      videoUrl?: string | null
    } = {}
    try {
      media = await enrichConceptTerm(term, itemCategory, itemSubCategory, chapter.name, examTraps)
    } catch (mediaErr: any) {
      console.warn(`Media enrichment skipped for "${term}":`, mediaErr?.message)
    }

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
        imageUrl: media.imageUrl,
        thumbnailUrl: media.thumbnailUrl,
        imageCaption: media.imageCaption,
        sourceUrl: media.sourceUrl,
        videoUrl: media.videoUrl,
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
        ...(media.imageUrl ? {
          imageUrl: media.imageUrl,
          thumbnailUrl: media.thumbnailUrl,
          imageCaption: media.imageCaption,
          sourceUrl: media.sourceUrl
        } : {}),
        ...(media.videoUrl ? { videoUrl: media.videoUrl } : {}),
        ...(matchingQs.length > 0 ? {
          questions: {
            connect: matchingQs.map(q => ({ id: q.id }))
          }
        } : {})
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

  // Link questions to existing concepts via case-insensitive whole-word match on stem and options
  for (const q of quiz.questions) {
    const stemAndOptions = `${q.questionText} ${q.optionA} ${q.optionB} ${q.optionC} ${q.optionD}`
    
    const matched = existingConcepts.filter(c => {
      if (!c.term || c.term.trim().length < 3) return false
      const termsToTest = [c.term, ...(c.relatedTerms || [])].filter(t => t && t.trim().length >= 3)
      return termsToTest.some(t => {
        const escaped = t.toLowerCase().trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`\\b${escaped}\\b`, 'i')
        return regex.test(stemAndOptions)
      })
    })

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
