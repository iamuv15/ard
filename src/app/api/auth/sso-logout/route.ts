import crypto from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

const HUB_PROXY_SECRET = process.env.HUB_PROXY_SECRET || '';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-hub-proxy-secret') ?? '';
  const valid =
    Boolean(HUB_PROXY_SECRET) &&
    secret.length === HUB_PROXY_SECRET.length &&
    crypto.timingSafeEqual(
      Buffer.from(secret, 'utf8'),
      Buffer.from(HUB_PROXY_SECRET, 'utf8')
    );

  if (!valid) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
