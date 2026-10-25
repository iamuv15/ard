import { NextRequest, NextResponse } from 'next/server';
import { removeAudioTrack } from '@/lib/audioService';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string; trackId: string }> }
) {
  try {
    const { trackId } = await context.params;
    if (!trackId) {
      return NextResponse.json({ error: 'trackId is required' }, { status: 400 });
    }

    const result = await removeAudioTrack(trackId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /admin/chapters/[id]/audio/[trackId]] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete audio track' }, { status: 500 });
  }
}
