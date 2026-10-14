import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserSession } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await getUserSession()
    const body = await request.json()
    const { conceptId, reportedUrl, reason, details } = body

    if (!conceptId || typeof conceptId !== 'number') {
      return NextResponse.json({ error: 'Valid conceptId is required' }, { status: 400 })
    }

    if (!reason || typeof reason !== 'string') {
      return NextResponse.json({ error: 'Report reason is required' }, { status: 400 })
    }

    const concept = await prisma.chapterConcept.findUnique({
      where: { id: conceptId }
    })

    if (!concept) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 })
    }

    const report = await prisma.conceptMediaReport.create({
      data: {
        conceptId,
        reportedByUserId: session?.id || null,
        mediaType: body.mediaType || (concept.imageUrl ? 'IMAGE' : 'VIDEO'),
        flaggedUrl: reportedUrl || concept.imageUrl || concept.videoUrl || null,
        reason: reason.trim(),
        userNote: details ? details.trim() : null,
        status: 'PENDING'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Media report submitted successfully. Our agronomy moderation team will review this shortly.',
      reportId: report.id
    })
  } catch (error: any) {
    console.error('Error submitting concept media report:', error)
    return NextResponse.json({ error: error.message || 'Failed to submit report' }, { status: 500 })
  }
}
