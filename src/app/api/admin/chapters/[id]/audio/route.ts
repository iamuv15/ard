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

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        audioTracks: {
          include: {
            concepts: {
              select: { id: true, term: true, slug: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        concepts: {
          select: {
            id: true,
            term: true,
            slug: true,
            subCategory: true,
            audioTrackId: true,
            order: true
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    // Group concepts and tracks by subCategory
    const subCategoryMap: Record<string, {
      subCategory: string;
      totalConcepts: number;
      explainedConcepts: { id: number; term: string; slug: string; audioTrackId: string | null }[];
      pendingConcepts: { id: number; term: string; slug: string; audioTrackId: string | null }[];
      tracks: typeof chapter.audioTracks;
    }> = {};

    for (const c of chapter.concepts) {
      const sub = c.subCategory || 'General Concepts';
      if (!subCategoryMap[sub]) {
        subCategoryMap[sub] = {
          subCategory: sub,
          totalConcepts: 0,
          explainedConcepts: [],
          pendingConcepts: [],
          tracks: []
        };
      }

      subCategoryMap[sub].totalConcepts++;
      if (c.audioTrackId) {
        subCategoryMap[sub].explainedConcepts.push(c);
      } else {
        subCategoryMap[sub].pendingConcepts.push(c);
      }
    }

    for (const t of chapter.audioTracks) {
      const sub = t.subCategory || 'General Concepts';
      if (!subCategoryMap[sub]) {
        subCategoryMap[sub] = {
          subCategory: sub,
          totalConcepts: 0,
          explainedConcepts: [],
          pendingConcepts: [],
          tracks: []
        };
      }
      subCategoryMap[sub].tracks.push(t);
    }

    const subcategories = Object.values(subCategoryMap);

    return NextResponse.json({
      chapter: {
        id: chapter.id,
        name: chapter.name,
        cohort: chapter.cohort,
        totalConcepts: chapter.concepts.length,
        totalTracks: chapter.audioTracks.length,
        totalDurationSec: chapter.audioTracks.reduce((acc, t) => acc + t.durationSec, 0)
      },
      subcategories
    });
  } catch (error: any) {
    console.error('[API /admin/chapters/[id]/audio] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
