import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import * as xlsx from 'xlsx'

function parseCorrectAnswer(rawAnswer: string, options: {A: string, B: string, C: string, D: string, E: string}): string {
  let ans = String(rawAnswer).toUpperCase().trim();
  if (['A', 'B', 'C', 'D', 'E'].includes(ans)) return ans;
  if (ans.startsWith('OPTION A') || ans === '1') return 'A';
  if (ans.startsWith('OPTION B') || ans === '2') return 'B';
  if (ans.startsWith('OPTION C') || ans === '3') return 'C';
  if (ans.startsWith('OPTION D') || ans === '4') return 'D';
  if (ans.startsWith('OPTION E') || ans === '5') return 'E';
  
  // Exact match
  if (ans === options.A.trim().toUpperCase()) return 'A';
  if (ans === options.B.trim().toUpperCase()) return 'B';
  if (ans === options.C.trim().toUpperCase()) return 'C';
  if (ans === options.D.trim().toUpperCase()) return 'D';
  if (options.E && ans === options.E.trim().toUpperCase()) return 'E';
  
  return ans; // fallback
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const chapterIdStr = formData.get('chapterId') as string
    const chunkSizeStr = formData.get('chunkSize') as string

    const chapterId = parseInt(chapterIdStr, 10)
    let chunkSize = parseInt(chunkSizeStr, 10)
    if (isNaN(chunkSize) || chunkSize <= 0) chunkSize = 40 // Default to 40 if not provided or invalid

    if (!files || files.length === 0 || isNaN(chapterId)) {
      return NextResponse.json({ error: 'Files and Chapter ID are required' }, { status: 400 })
    }

    const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } })
    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
    }

    let totalQuestionsInserted = 0
    let totalQuizzesCreated = 0

    for (const file of files) {
      const buffer = await file.arrayBuffer()
      const workbook = xlsx.read(buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const data = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1 })

      if (data.length <= 1) continue // empty or just headers

      // Map raw data to new schema based on exact column indices
      // 0: Q.No, 1: Question, 2: Opt A, 3: Opt B, 4: Opt C, 5: Opt D, 6: Opt E
      // 7: Correct Answer, 8: Exp A, 9: Exp B, 10: Exp C, 11: Exp D, 12: Exp E
      // 13: Topic, 14: Overall Explanation
      const mappedQuestions = data.slice(1).map((row) => {
        const qText = String(row[1] || '').trim();
        const optA = String(row[2] || '').trim();
        const optB = String(row[3] || '').trim();
        const optC = String(row[4] || '').trim();
        const optD = String(row[5] || '').trim();
        const optE = row[6] ? String(row[6]).trim() : null;
        const rawAns = String(row[7] || '').trim();
        
        const expA = row[8] || null;
        const expB = row[9] || null;
        const expC = row[10] || null;
        const expD = row[11] || null;
        const expE = row[12] || null;
        const topic = row[13] || null;
        const overallExp = row[14] || null;

        const correctKey = parseCorrectAnswer(rawAns, { A: optA, B: optB, C: optC, D: optD, E: optE || '' });

        return {
          questionText: qText,
          optionA: optA,
          optionB: optB,
          optionC: optC,
          optionD: optD,
          optionE: optE,
          explanationA: expA ? String(expA).trim() : null,
          explanationB: expB ? String(expB).trim() : null,
          explanationC: expC ? String(expC).trim() : null,
          explanationD: expD ? String(expD).trim() : null,
          explanationE: expE ? String(expE).trim() : null,
          topic: topic ? String(topic).trim() : null,
          explanation: overallExp ? String(overallExp).trim() : null,
          correctAnswer: correctKey,
        }
      }).filter(q => q.questionText && q.optionA && q.optionB && q.correctAnswer)

      if (mappedQuestions.length === 0) continue

      // Chunk the questions
      const numChunks = Math.ceil(mappedQuestions.length / chunkSize)
      
      const fileName = file.name.replace(/\.[^/.]+$/, "") // Remove extension

      for (let i = 0; i < numChunks; i++) {
        const chunk = mappedQuestions.slice(i * chunkSize, (i + 1) * chunkSize)
        
        const quizName = numChunks > 1 ? `${fileName} (Part ${i + 1})` : fileName

        // Create Quiz
        const quiz = await prisma.quiz.create({
          data: {
            name: quizName,
            chapterId: chapter.id,
          }
        })

        // Add questions to quiz
        const questionsToInsert = chunk.map(q => ({
          ...q,
          quizId: quiz.id
        }))

        await prisma.question.createMany({
          data: questionsToInsert
        })

        totalQuestionsInserted += chunk.length
        totalQuizzesCreated++
      }
    }

    if (totalQuestionsInserted === 0) {
      return NextResponse.json({ error: 'No valid questions found across all files.' }, { status: 400 })
    }

    return NextResponse.json({ success: true, count: totalQuestionsInserted, quizCount: totalQuizzesCreated })
  } catch (error: any) {
    console.error('Upload Error:', error)
    return NextResponse.json({ error: 'Failed to process files' }, { status: 500 })
  }
}
