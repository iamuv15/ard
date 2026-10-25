import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const chapterId = parseInt(id, 10);
    if (isNaN(chapterId)) {
      return NextResponse.json({ error: 'Invalid chapter ID' }, { status: 400 });
    }

    const tracks = await prisma.chapterAudioTrack.findMany({
      where: { chapterId, status: 'COMPLETED' },
      include: {
        concepts: {
          select: { id: true, term: true, slug: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ tracks });
  } catch (error: any) {
    console.error('[API /chapters/[id]/audio] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch tracks' }, { status: 500 });
  }
}
