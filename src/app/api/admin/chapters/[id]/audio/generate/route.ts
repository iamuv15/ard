import { NextRequest, NextResponse } from 'next/server';
import { generateAudioForCluster } from '@/lib/audioService';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const chapterId = parseInt(id, 10);
    if (isNaN(chapterId)) {
      return NextResponse.json({ error: 'Invalid chapter ID' }, { status: 400 });
    }

    const body = await req.json();
    const { subCategory, title, conceptIds } = body;

    if (!subCategory || !title || !Array.isArray(conceptIds) || conceptIds.length === 0) {
      return NextResponse.json(
        { error: 'subCategory, title, and a non-empty array of conceptIds are required' },
        { status: 400 }
      );
    }

    const result = await generateAudioForCluster({
      chapterId,
      subCategory,
      title,
      conceptIds
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /admin/chapters/[id]/audio/generate] Error:', error);
    return NextResponse.json({ error: error.message || 'Audio generation failed' }, { status: 500 });
  }
}
