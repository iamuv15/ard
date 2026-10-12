import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verifyQuestionWithGemini } from '@/lib/geminiVerification'

async function checkAdminAuth() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('admin_session')
  return sessionCookie && (sessionCookie.value === 'true' || sessionCookie.value === 'authenticated')
}

export async function GET(request: Request) {
  try {
    const isAdmin = await checkAdminAuth()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'auto' | 'review' | 'resolved' | 'all'

    const where: any = {}
    if (type === 'auto') {
      where.status = 'AUTO_CORRECTED'
    } else if (type === 'review') {
      where.status = { in: ['NEEDS_ADMIN_REVIEW', 'PENDING_AI'] }
    } else if (type === 'resolved') {
      where.status = { in: ['ADMIN_RESOLVED', 'DISMISSED'] }
    }

    const reports = await prisma.questionReport.findMany({
      where,
      include: {
        question: {
          include: {
            quiz: {
              select: { id: true, name: true, chapter: { select: { id: true, name: true } } }
            }
          }
        },
        reportedBy: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const autoCorrectedCount = await prisma.questionReport.count({
      where: { status: 'AUTO_CORRECTED' }
    })
    const needsReviewCount = await prisma.questionReport.count({
      where: { status: { in: ['NEEDS_ADMIN_REVIEW', 'PENDING_AI'] } }
    })
    const resolvedCount = await prisma.questionReport.count({
      where: { status: { in: ['ADMIN_RESOLVED', 'DISMISSED'] } }
    })

    return NextResponse.json({
      success: true,
      counts: {
        autoCorrected: autoCorrectedCount,
        needsReview: needsReviewCount,
        resolved: resolvedCount,
        total: autoCorrectedCount + needsReviewCount + resolvedCount
      },
      reports
    })
  } catch (error: any) {
    console.error('Error fetching admin reports:', error)
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const isAdmin = await checkAdminAuth()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { reportId, action, customData } = body

    if (!reportId || !action) {
      return NextResponse.json({ error: 'reportId and action are required' }, { status: 400 })
    }

    const report = await prisma.questionReport.findUnique({
      where: { id: reportId },
      include: { question: true }
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    if (action === 'accept_ai') {
      if (!report.suggestedAnswer) {
        return NextResponse.json({ error: 'No AI suggested answer to accept' }, { status: 400 })
      }

      await prisma.question.update({
        where: { id: report.questionId },
        data: {
          correctAnswer: report.suggestedAnswer.toUpperCase(),
          ...(report.suggestedExplanation ? { explanation: report.suggestedExplanation } : {})
        }
      })

      const updated = await prisma.questionReport.update({
        where: { id: reportId },
        data: {
          status: 'ADMIN_RESOLVED',
          resolvedByAdmin: true,
          resolvedAt: new Date()
        }
      })

      return NextResponse.json({ success: true, report: updated, message: 'Question updated with AI suggestion' })
    }

    if (action === 'revert') {
      if (!report.previousAnswer) {
        return NextResponse.json({ error: 'No previous answer recorded to revert to' }, { status: 400 })
      }

      await prisma.question.update({
        where: { id: report.questionId },
        data: {
          correctAnswer: report.previousAnswer.toUpperCase()
        }
      })

      const updated = await prisma.questionReport.update({
        where: { id: reportId },
        data: {
          status: 'ADMIN_RESOLVED',
          resolvedByAdmin: true,
          resolvedAt: new Date()
        }
      })

      return NextResponse.json({ success: true, report: updated, message: `Reverted question answer back to ${report.previousAnswer}` })
    }

    if (action === 'dismiss') {
      const updated = await prisma.questionReport.update({
        where: { id: reportId },
        data: {
          status: 'DISMISSED',
          resolvedByAdmin: true,
          resolvedAt: new Date()
        }
      })

      return NextResponse.json({ success: true, report: updated, message: 'Report dismissed' })
    }

    if (action === 'custom_update') {
      if (!customData || !customData.correctAnswer) {
        return NextResponse.json({ error: 'Valid custom correctAnswer is required' }, { status: 400 })
      }

      await prisma.question.update({
        where: { id: report.questionId },
        data: {
          questionText: customData.questionText || report.question.questionText,
          optionA: customData.optionA || report.question.optionA,
          optionB: customData.optionB || report.question.optionB,
          optionC: customData.optionC || report.question.optionC,
          optionD: customData.optionD || report.question.optionD,
          optionE: customData.optionE !== undefined ? customData.optionE : report.question.optionE,
          correctAnswer: customData.correctAnswer.toUpperCase(),
          explanation: customData.explanation !== undefined ? customData.explanation : report.question.explanation
        }
      })

      const updated = await prisma.questionReport.update({
        where: { id: reportId },
        data: {
          status: 'ADMIN_RESOLVED',
          resolvedByAdmin: true,
          resolvedAt: new Date()
        }
      })

      return NextResponse.json({ success: true, report: updated, message: 'Question updated successfully' })
    }

    if (action === 'retry_ai') {
      const verification = await verifyQuestionWithGemini(report.questionId, report.reason, report.userNote)
      const updated = await prisma.questionReport.update({
        where: { id: reportId },
        data: {
          status: verification.status,
          aiConfidence: verification.confidence,
          aiReasoning: verification.reasoning,
          suggestedAnswer: verification.suggestedAnswer || null,
          suggestedExplanation: verification.suggestedExplanation || null
        }
      })

      return NextResponse.json({ success: true, report: updated, message: 'Re-verified with AI' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error updating admin report:', error)
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 })
  }
}
