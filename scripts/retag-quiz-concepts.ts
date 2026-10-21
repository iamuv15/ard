import 'dotenv/config'
import prisma from '../src/lib/prisma'
import { callGemini } from '../src/lib/terminologyEngine'

async function main() {
  const quizId = parseInt(process.argv[2] || '43', 10)
  console.log(`\n======================================================`)
  console.log(`🚀 AI Semantic Concept Retagging for Quiz ID: ${quizId}`)
  console.log(`======================================================\n`)

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      chapter: {
        include: {
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
      },
      questions: {
        orderBy: { id: 'asc' },
        include: {
          concepts: { select: { id: true, term: true, slug: true } }
        }
      }
    }
  })

  if (!quiz) {
    console.error(`❌ Quiz ${quizId} not found.`)
    process.exit(1)
  }

  const chapterConcepts = quiz.chapter?.concepts || []
  if (chapterConcepts.length === 0) {
    console.error(`❌ No concepts found for Chapter "${quiz.chapter?.name}". Please generate concepts first.`)
    process.exit(1)
  }

  console.log(`📚 Chapter: ${quiz.chapter?.name} (Concepts available: ${chapterConcepts.length})`)
  console.log(`📝 Total Questions in Quiz: ${quiz.questions.length}\n`)

  // Prepare Taxonomy Context
  const grouped: Record<string, string[]> = {}
  for (const c of chapterConcepts) {
    const branch = c.subCategory ? `${c.category} - ${c.subCategory}` : (c.category || 'General')
    if (!grouped[branch]) grouped[branch] = []
    grouped[branch].push(`${c.term} [slug: "${c.slug}"]`)
  }

  const taxonomyPromptSection = Object.entries(grouped)
    .map(([branch, list]) => `• ${branch}:\n  ${list.join(', ')}`)
    .join('\n')

  const slugMap = new Map<string, number>()
  for (const c of chapterConcepts) {
    slugMap.set(c.slug.toLowerCase().trim(), c.id)
    slugMap.set(c.term.toLowerCase().trim(), c.id)
  }

  const batchSize = 10
  let totalRetagged = 0

  for (let i = 0; i < quiz.questions.length; i += batchSize) {
    const batch = quiz.questions.slice(i, i + batchSize)
    const batchIdx = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(quiz.questions.length / batchSize)

    process.stdout.write(`⚡ Processing Batch [${batchIdx}/${totalBatches}] (Questions ${i + 1} to ${Math.min(i + batchSize, quiz.questions.length)})... `)

    const batchDigest = batch.map((q, idx) => `
[QUESTION_${idx + 1}]
ID: ${q.id}
Stem: ${q.questionText}
Ans: ${q.correctAnswer}
Options: A: ${q.optionA} | B: ${q.optionB} | C: ${q.optionC} | D: ${q.optionD}
Explanation: ${q.explanation ? q.explanation.slice(0, 300) : 'None'}
`).join('\n')

    const prompt = `You are an expert exam concept classifier for Indian agricultural examinations.
Analyze these multiple-choice questions and attribute 1 to 3 directly tested concept slugs from the CHAPTER CONCEPT TAXONOMY below.

STRICT GUIDELINES:
1. Base attribution strictly on the core concept tested by the question stem and correct answer.
2. CRITICAL NEGATIVE CONSTRAINT: Do NOT tag a concept merely because an English word (e.g. "full", "hand", "milk", "stage", "system", "body") appears casually as an adjective or distractor.
3. If no concept in the taxonomy directly applies, return an empty array [].

CHAPTER CONCEPT TAXONOMY:
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
${batchDigest}`

    try {
      const parsed: any = await callGemini({
        systemPrompt: 'You are an expert exam concept classifier for Indian agricultural examinations. Output valid JSON matching {"results": [{"id": number, "testedConceptSlugs": string[]}]}.',
        userPrompt: prompt,
        allowThinking: false,
        temperature: 0.1
      })

      if (parsed && Array.isArray(parsed.results)) {
        for (const item of parsed.results) {
          const matchedConceptIds: number[] = []
          if (Array.isArray(item.testedConceptSlugs)) {
            for (const s of item.testedConceptSlugs) {
              const id = slugMap.get(String(s).toLowerCase().trim())
              if (id && !matchedConceptIds.includes(id)) {
                matchedConceptIds.push(id)
              }
            }
          }

          await prisma.question.update({
            where: { id: item.id },
            data: {
              concepts: {
                set: matchedConceptIds.map(id => ({ id }))
              }
            }
          })
          totalRetagged++
        }
        console.log(`✅ Done (${parsed.results.length} questions updated)`)
      } else {
        console.log(`⚠️ Unexpected response format`)
      }
    } catch (err: any) {
      console.log(`❌ Error: ${err.message}`)
    }

    // Small delay to protect API limits
    await new Promise(r => setTimeout(r, 1200))
  }

  console.log(`\n🎉 Retagging complete! Successfully re-evaluated and updated ${totalRetagged} questions.`)
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
