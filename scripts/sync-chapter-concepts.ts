import 'dotenv/config'
import prisma from '../src/lib/prisma'
import { generateChapterMindMap, generateConceptCapsulesBatch } from '../src/lib/terminologyEngine'

async function main() {
  const targetChapterName = process.argv[2] || 'Animal Husbandry'
  console.log(`\n======================================================`)
  console.log(`🚀 Starting Terminology Engine Sync for "${targetChapterName}"`)
  console.log(`======================================================\n`)

  const chapter = await prisma.chapter.findFirst({
    where: {
      name: { contains: targetChapterName, mode: 'insensitive' }
    },
    include: {
      quizzes: {
        include: {
          _count: { select: { questions: true } }
        }
      },
      concepts: true,
      mindMap: true
    }
  })

  if (!chapter) {
    console.error(`❌ Chapter matching "${targetChapterName}" not found.`)
    process.exit(1)
  }

  const totalQuestions = chapter.quizzes.reduce((acc, q) => acc + q._count.questions, 0)
  console.log(`📚 Chapter: ${chapter.name} (ID: ${chapter.id})`)
  console.log(`📝 Total MCQs across ${chapter.quizzes.length} quizzes: ${totalQuestions}`)
  console.log(`⚡ Existing Concepts in Database: ${chapter.concepts.length}\n`)

  // STEP 1: Generate or load Mind Map & Taxonomy (THINKING ON)
  let mindMapTree: any = chapter.mindMap?.treeData

  if (!mindMapTree) {
    console.log(`🧠 Step 1: Mind Map not found. Synthesizing Chapter Mind Map...`)
    console.log(`   (Thinking ALLOWED: Reasoning through taxonomy, categories & relations)`)
    
    try {
      mindMapTree = await generateChapterMindMap(chapter.id, {
        maxQuestionsSample: 120
      })
      console.log(`✅ Mind Map successfully constructed!`)
      console.log(`   Total Unique Keywords Extracted: ${mindMapTree.allKeywords?.length || 0}`)
      console.log(`   Categories: ${mindMapTree.categories?.map((c: any) => c.name).join(', ')}\n`)
    } catch (err: any) {
      console.error(`❌ Failed to generate Mind Map:`, err.message)
      process.exit(1)
    }
  } else {
    console.log(`ℹ️ Existing Mind Map found in database with ${mindMapTree.allKeywords?.length || 0} keywords.`)
  }

  // STEP 2: Collect keywords that need concept capsules
  const tasks: { keyword: string; category: string; subCategory: string }[] = []
  if (mindMapTree.categories && Array.isArray(mindMapTree.categories)) {
    mindMapTree.categories.forEach((cat: any) => {
      (cat.subCategories || []).forEach((sub: any) => {
        (sub.keywords || []).forEach((kw: string) => {
          if (kw && kw.trim()) {
            tasks.push({
              keyword: kw.trim(),
              category: cat.name,
              subCategory: sub.name
            })
          }
        })
      })
    })
  }

  const existingConceptTerms = new Set(chapter.concepts.map(c => c.term.toLowerCase().trim()))
  const pendingTasks = tasks.filter(t => !existingConceptTerms.has(t.keyword.toLowerCase().trim()))

  console.log(`📊 Total Keywords in Mind Map: ${tasks.length}`)
  console.log(`✅ Already Published Capsules: ${chapter.concepts.length}`)
  console.log(`⏳ Pending Capsules to Generate: ${pendingTasks.length}\n`)

  if (pendingTasks.length === 0) {
    console.log(`🎉 All keywords already have concept capsules generated! Nothing to do.`)
    return
  }

  // STEP 3: Batch Generate Concept Capsules (THINKING OFF)
  console.log(`⚡ Step 2: Batch Generating ${pendingTasks.length} Concept Capsules...`)
  console.log(`   (Thinking DISABLED: Formatting GFM tables, matrices & exam traps at maximum speed & zero reasoning cost)`)
  console.log(`   (Free-Tier Pacing: 4 terms per batch with ~1.5s delay to stay comfortably under 15 RPM)\n`)

  const chunkSize = 4
  let completed = 0

  for (let i = 0; i < pendingTasks.length; i += chunkSize) {
    const chunk = pendingTasks.slice(i, i + chunkSize)
    const keywords = chunk.map(c => c.keyword)
    const primaryCat = chunk[0].category
    const primarySub = chunk[0].subCategory

    process.stdout.write(`   [Batch ${Math.floor(i / chunkSize) + 1}/${Math.ceil(pendingTasks.length / chunkSize)}] Generating: ${keywords.join(', ')} ... `)

    try {
      const capsules = await generateConceptCapsulesBatch({
        chapterId: chapter.id,
        keywords,
        category: primaryCat,
        subCategory: primarySub,
        delayBetweenCallsMs: 1500 // Free tier pacing
      })
      completed += capsules.length
      console.log(`✅ Done (${capsules.length} capsules saved)`)
    } catch (err: any) {
      console.log(`⚠️ Batch failed: ${err.message}`)
    }
  }

  console.log(`\n🎉 Sync complete! Total generated in this run: ${completed}`)
  console.log(`Check out the result at: /chapter/${chapter.id}/concepts\n`)
}

main()
  .catch((e) => {
    console.error('Fatal sync error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
