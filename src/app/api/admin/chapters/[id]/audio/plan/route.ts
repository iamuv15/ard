import { NextRequest, NextResponse } from 'next/server';
import { planSubCategoryClusters } from '@/lib/audioService';

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
    const { subCategory } = body;

    if (!subCategory) {
      return NextResponse.json({ error: 'subCategory is required' }, { status: 400 });
    }

    const clusters = await planSubCategoryClusters(chapterId, subCategory);
    return NextResponse.json({ clusters });
  } catch (error: any) {
    console.error('[API /admin/chapters/[id]/audio/plan] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to plan clusters' }, { status: 500 });
  }
}
