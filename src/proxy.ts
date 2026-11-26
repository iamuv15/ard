import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const APP_SLUG = (process.env.APP_SLUG || 'ard').toLowerCase();
const BASE_PATH = `/${APP_SLUG}`;
const DASHBOARD_PATH = process.env.APP_DASHBOARD_PATH || '/';
const HUB_PROXY_SECRET = process.env.HUB_PROXY_SECRET || '';
const HUB_ORIGIN = process.env.HUB_ORIGIN || 'https://liveshala.com';
const ENFORCE_HUB_PROXY = process.env.ENFORCE_HUB_PROXY === 'true';

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function verifyHubHeaderSignature(
  expectedUid: string,
  tsRaw: string,
  sig: string
): Promise<boolean> {
  if (!HUB_PROXY_SECRET) return false;
  const ts = Number(tsRaw);
  if (!Number.isFinite(ts)) return false;
  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (ageSeconds > 60) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(HUB_PROXY_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const macBuf = await crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(`${APP_SLUG}:${expectedUid}:${ts}`)
  );
  const expectedSig = Array.from(new Uint8Array(macBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return timingSafeEqualString(sig, expectedSig);
}

export async function proxy(request: NextRequest) {
  const { pathname, search, basePath } = request.nextUrl;
  const effectiveBasePath = basePath || BASE_PATH;

  // Handle both with and without effectiveBasePath prefix
  const normalizedPath = pathname.startsWith(effectiveBasePath)
    ? pathname.slice(effectiveBasePath.length)
    : pathname;

  // Skip auth callback, logout and _next internal requests
  if (
    normalizedPath.startsWith('/api/auth/sso-callback') ||
    normalizedPath.startsWith('/api/auth/sso-logout') ||
    normalizedPath.startsWith('/_next/') ||
    normalizedPath === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const proxySecret = request.headers.get('x-hub-proxy-secret') ?? '';
  const isFromHub = Boolean(
    proxySecret &&
      HUB_PROXY_SECRET &&
      timingSafeEqualString(proxySecret, HUB_PROXY_SECRET)
  );

  if (ENFORCE_HUB_PROXY && !isFromHub) {
    return new NextResponse('Not Found', { status: 404 });
  }

  let response = NextResponse.next({ request });

  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://luqqevfwgjpmvuyeyvzv.supabase.co';
  if (supabaseUrl.includes('nvcbchefumrcdkvjvquw')) {
    supabaseUrl = 'https://luqqevfwgjpmvuyeyvzv.supabase.co';
  }
  let anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    '';

  const HARDCODED_LUQQ_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1cXFldmZ3Z2pwbXZ1eWV5dnp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDY3MDcxNiwiZXhwIjoyMTA2MjQ2NzE2fQ.1E2pDpkj4bjpRrYx25PZj_pvCIKfvPZx23-NpE722i4';
  if (!anonKey || anonKey.includes('nvcbchefumrcdkvjvquw')) {
    anonKey = HARDCODED_LUQQ_KEY;
  }

  if (!supabaseUrl || !anonKey) {
    return response;
  }

  let user = null;
  try {
    const supabase = createServerClient(
      supabaseUrl,
      anonKey,
      {
        cookieOptions: { path: effectiveBasePath },
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, {
                ...options,
                path: effectiveBasePath,
              })
            );
          },
        },
      }
    );

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;
  } catch (err) {
    console.error('[proxy] Supabase auth check error:', err);
  }

  if (isFromHub) {
    const expectedUid = request.headers.get('x-hub-expected-uid');
    const expectedTs = request.headers.get('x-hub-expected-ts');
    const expectedSig = request.headers.get('x-hub-expected-sig');

    if (
      expectedUid &&
      expectedTs &&
      expectedSig &&
      (await verifyHubHeaderSignature(expectedUid, expectedTs, expectedSig))
    ) {
      if (!user || user.id !== expectedUid) {
        const fullReturnPath = `${effectiveBasePath}${pathname === '/' ? '' : pathname}${search}`;
        const ssoLaunch = new URL('/auth/sso-launch', HUB_ORIGIN);
        ssoLaunch.searchParams.set('slug', APP_SLUG);
        ssoLaunch.searchParams.set('next', fullReturnPath);

        const healResponse = NextResponse.redirect(ssoLaunch, 302);
        for (const c of request.cookies.getAll()) {
          if (c.name.startsWith('sb-')) {
            healResponse.cookies.set(c.name, '', {
              path: effectiveBasePath,
              maxAge: 0,
            });
          }
        }
        return healResponse;
      }

      if (pathname === '/' && DASHBOARD_PATH !== '/') {
        const publicHost =
          request.headers.get('x-forwarded-host') || request.nextUrl.host;
        const publicProto = request.headers.get('x-forwarded-proto') || 'https';
        return NextResponse.redirect(
          new URL(
            `${effectiveBasePath}${DASHBOARD_PATH}`,
            `${publicProto}://${publicHost}`
          ),
          302
        );
      }
    }
  }

  // Admin protection
  const isAdminPath = pathname.startsWith('/admin');
  const isAdminPublicPath = pathname === '/admin/login';
  const adminToken =
    request.cookies.get('admin_session')?.value ||
    request.cookies.get('admin_token')?.value;

  if (
    isAdminPath &&
    !isAdminPublicPath &&
    (!adminToken || (adminToken !== 'true' && adminToken !== 'authenticated'))
  ) {
    return NextResponse.redirect(new URL(`${effectiveBasePath}/admin/login`, request.url));
  }

  if (isAdminPublicPath && adminToken) {
    return NextResponse.redirect(new URL(`${effectiveBasePath}/admin`, request.url));
  }

  // Protected student routes for standalone mode
  const protectedPaths = ['/quiz', '/redemption', '/chapter', '/bookmarks'];
  const isProtectedPath = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtectedPath) {
    const hasStandaloneToken = Boolean(request.cookies.get('auth_token')?.value);
    const hasSupabaseUser = Boolean(user);

    if (!hasStandaloneToken && !hasSupabaseUser) {
      const loginUrl = new URL(`${effectiveBasePath}/login`, request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
