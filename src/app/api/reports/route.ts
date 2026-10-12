import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserSession } from '@/lib/auth'
import { verifyQuestionWithGemini } from '@/lib/geminiVerification'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const questionIdStr = searchParams.get('questionId')

    if (questionIdStr) {
      const qId = parseInt(questionIdStr, 10)
      if (isNaN(qId)) return NextResponse.json({ error: 'Invalid questionId' }, { status: 400 })

      const report = await prisma.questionReport.findFirst({
        where: {
          questionId: qId,
          status: { in: ['PENDING_AI', 'NEEDS_ADMIN_REVIEW', 'AUTO_CORRECTED'] }
        },
        orderBy: { createdAt: 'desc' }
      })

      return NextResponse.json({ success: true, isReported: !!report, report })
    }

    // Get all reported question IDs for current user
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ success: true, reportedQuestionIds: [] })
    }

    const reports = await prisma.questionReport.findMany({
      where: { reportedByUserId: session.id },
      select: { questionId: true, status: true }
    })

    const reportedIds = reports.map(r => r.questionId)
    return NextResponse.json({ success: true, reportedQuestionIds: reportedIds })
  } catch (error: any) {
    console.error('Error fetching reports:', error)
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getUserSession()
    const body = await request.json()
    const { questionId, reason, userNote } = body

    if (!questionId || typeof questionId !== 'number') {
      return NextResponse.json({ error: 'Valid questionId is required' }, { status: 400 })
    }

    if (!reason || typeof reason !== 'string') {
      return NextResponse.json({ error: 'Report reason is required' }, { status: 400 })
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId }
    })

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // Create the initial report record
    const report = await prisma.questionReport.create({
      data: {
        questionId,
        reportedByUserId: session?.id || null,
        reason,
        userNote: userNote || null,
        status: 'PENDING_AI',
        previousAnswer: question.correctAnswer
      }
    })

    // Run verification with Gemini
    let verification
    try {
      verification = await verifyQuestionWithGemini(questionId, reason, userNote)
    } catch (err: any) {
      console.error('Gemini verification execution error:', err)
      verification = {
        status: 'NEEDS_ADMIN_REVIEW' as const,
        confidence: 'LOW' as const,
        reasoning: `Verification failed to complete: ${err?.message || 'Unknown error'}. Forwarded to admin queue.`
      }
    }

    // Update the report with verification findings
    const updatedReport = await prisma.questionReport.update({
      where: { id: report.id },
      data: {
        status: verification.status,
        aiConfidence: verification.confidence,
        aiReasoning: verification.reasoning,
        suggestedAnswer: verification.suggestedAnswer || null,
        suggestedExplanation: verification.suggestedExplanation || null,
        previousAnswer: question.correctAnswer
      }
    })

    return NextResponse.json({
      success: true,
      report: updatedReport,
      message:
        updatedReport.status === 'AUTO_CORRECTED'
          ? 'Question verified and auto-corrected by AI.'
          : 'Report received and queued for admin review.'
    })
  } catch (error: any) {
    console.error('Error submitting question report:', error)
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
  }
}
