import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { importSPKI, jwtVerify } from 'jose';
import { NextResponse, type NextRequest } from 'next/server';

const APP_SLUG = (process.env.APP_SLUG || 'ard').toLowerCase();
const BASE_PATH = `/${APP_SLUG}`;
const DASHBOARD_PATH = process.env.APP_DASHBOARD_PATH || '/';

let cachedPublicKey: Promise<CryptoKey> | null = null;
function getPublicKey() {
  if (!cachedPublicKey) {
    const rawKey = process.env.HUB_SSO_PUBLIC_KEY || '';
    const pem = rawKey.replace(/\\n/g, '\n').trim();
    cachedPublicKey = importSPKI(pem, 'EdDSA');
  }
  return cachedPublicKey;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const rawNext = searchParams.get('next') ?? '';

    if (!token) {
      return NextResponse.json({ error: 'Missing SSO token' }, { status: 400 });
    }

    let payload: {
      app_user_id?: string;
      jti?: string;
      exp?: number;
    };

    try {
      const publicKey = await getPublicKey();
      const verified = await jwtVerify(token, publicKey, {
        issuer: 'liveshala-hub',
        audience: APP_SLUG,
      });
      payload = verified.payload as typeof payload;
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired SSO token' },
        { status: 401 }
      );
    }

    const appUserId = payload.app_user_id;
    const jti = payload.jti;
    if (!appUserId || !jti) {
      return NextResponse.json({ error: 'Malformed SSO claims' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://luqqevfwgjpmvuyeyvzv.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || '';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || serviceRoleKey;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured in downstream app' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Enforce single-use jti replay protection
    const expiresAt = payload.exp
      ? new Date(payload.exp * 1000).toISOString()
      : new Date(Date.now() + 60_000).toISOString();

    const { error: nonceErr } = await supabaseAdmin
      .from('sso_used_nonces')
      .insert({ jti, expires_at: expiresAt });

    if (nonceErr) {
      return NextResponse.json({ error: 'SSO token already used' }, { status: 401 });
    }

    // 2. Resolve downstream user email & mint magiclink OTP
    const { data: userData, error: userErr } =
      await supabaseAdmin.auth.admin.getUserById(appUserId);

    if (userErr || !userData.user?.email) {
      return NextResponse.json(
        { error: 'Downstream user not found' },
        { status: 404 }
      );
    }

    const { data: linkData, error: linkErr } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: userData.user.email,
      });

    const tokenHash = linkData?.properties?.hashed_token;
    if (linkErr || !tokenHash) {
      return NextResponse.json(
        { error: 'Failed to create session link' },
        { status: 500 }
      );
    }

    // 3. Verify OTP and scope @supabase/ssr cookies strictly to path: '/<slug>'
    const defaultTarget =
      DASHBOARD_PATH === '/' ? BASE_PATH : `${BASE_PATH}${DASHBOARD_PATH}`;
    const safeNext =
      rawNext &&
      rawNext !== BASE_PATH &&
      rawNext !== `${BASE_PATH}/` &&
      rawNext.startsWith(BASE_PATH) &&
      !rawNext.startsWith('//')
        ? rawNext
        : defaultTarget;

    const hubHost = request.headers.get('x-forwarded-host') || request.nextUrl.host;
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const redirectUrl = new URL(safeNext, `${proto}://${hubHost}`);
    const response = NextResponse.redirect(redirectUrl, 302);

    const supabaseServer = createServerClient(supabaseUrl, anonKey, {
      cookieOptions: {
        path: BASE_PATH,
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              path: BASE_PATH,
            });
          });
        },
      },
    });

    const { error: verifyErr } = await supabaseServer.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'magiclink',
    });

    if (verifyErr) {
      return NextResponse.json({ error: verifyErr.message }, { status: 401 });
    }

    return response;
  } catch (err) {
    console.error('SSO Callback error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
