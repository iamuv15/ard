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
    const chapterId = parseInt(chapterIdStr, 10)

    if (!files || files.length === 0 || isNaN(chapterId)) {
      return NextResponse.json({ error: 'Files and Chapter ID are required' }, { status: 400 })
    }

    const targetChapter = await prisma.chapter.findUnique({ where: { id: chapterId } })
    if (!targetChapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
    }

    let totalQuestionsInserted = 0
    let totalQuizzesCreated = 0

    for (const file of files) {
      let mappedQuestions: any[] = []
      let customQuizName: string | null = null
      const fileName = file.name.replace(/\.[^/.]+$/, "") // Remove extension

      if (file.name.toLowerCase().endsWith('.json')) {
        const text = await file.text()
        const jsonData = JSON.parse(text)
        customQuizName = jsonData.title || null

        if (Array.isArray(jsonData.questions)) {

          mappedQuestions = jsonData.questions.map((q: any) => {
            const optA = String(q.options?.a || '').trim()
            const optB = String(q.options?.b || '').trim()
            const optC = String(q.options?.c || '').trim()
            const optD = String(q.options?.d || '').trim()
            const optE = q.options?.e ? String(q.options.e).trim() : null
            
            const rawAns = String(q.correct_option || '').trim().toUpperCase()
            const correctKey = ['A','B','C','D','E'].includes(rawAns) ? rawAns : parseCorrectAnswer(rawAns, { A: optA, B: optB, C: optC, D: optD, E: optE || '' })

            return {
              questionText: String(q.question || '').trim(),
              optionA: optA,
              optionB: optB,
              optionC: optC,
              optionD: optD,
              optionE: optE,
              explanationA: null,
              explanationB: null,
              explanationC: null,
              explanationD: null,
              explanationE: null,
              topic: q.topic ? String(q.topic).trim() : null,
              explanation: q.explanation ? String(q.explanation).trim() : null,
              correctAnswer: correctKey,
            }
          }).filter((q: any) => q.questionText && q.optionA && q.optionB && q.correctAnswer)
        }
      } else {
        const buffer = await file.arrayBuffer()
        const workbook = xlsx.read(buffer, { type: 'buffer' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const data = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1 })

        if (data.length > 1) {
          mappedQuestions = data.slice(1).map((row) => {
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
          }).filter((q: any) => q.questionText && q.optionA && q.optionB && q.correctAnswer)
        }
      }

      if (mappedQuestions.length === 0) continue

      const quizName = customQuizName || fileName

      const quiz = await prisma.quiz.create({
        data: {
          name: quizName,
          chapterId: targetChapter.id,
        }
      })

      // Add questions to quiz
      const questionsToInsert = mappedQuestions.map(q => ({
        ...q,
        quizId: quiz.id
      }))

      await prisma.question.createMany({
        data: questionsToInsert
      })

      totalQuestionsInserted += mappedQuestions.length
      totalQuizzesCreated++
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
