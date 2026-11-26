import { jwtVerify, SignJWT } from 'jose'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET || 'fallback-secret-key-change-me'
  return new TextEncoder().encode(secret)
}

export type TokenPayload = {
  id: number
  email: string
  name: string
  role: string
}

export async function verifyAuth(token: string) {
  try {
    const verified = await jwtVerify(token, getJwtSecretKey())
    return verified.payload as TokenPayload
  } catch {
    return null
  }
}

export async function generateToken(payload: TokenPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getJwtSecretKey())
  return token
}

export async function getUserSession(): Promise<TokenPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  
  if (token) {
    const payload = await verifyAuth(token)
    if (payload) return payload
  }

  // Check Supabase Auth session (SSO via Liveshala Hub)
  const HARDCODED_LUQQ_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1cXFldmZ3Z2pwbXZ1eWV5dnp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDY3MDcxNiwiZXhwIjoyMTA2MjQ2NzE2fQ.1E2pDpkj4bjpRrYx25PZj_pvCIKfvPZx23-NpE722i4'

  let supabaseUrl = 'https://luqqevfwgjpmvuyeyvzv.supabase.co'
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('nvcbchefumrcdkvjvquw')
  ) {
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  }

  let anonKey = HARDCODED_LUQQ_KEY
  const envAnon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE
  if (envAnon && envAnon.includes('luqqevfwgjpmvuyeyvzv')) {
    anonKey = envAnon
  }

  if (anonKey) {
    try {
      const APP_SLUG = (process.env.APP_SLUG || 'ard').toLowerCase()
      const supabase = createServerClient(supabaseUrl, anonKey, {
        cookieOptions: { path: `/${APP_SLUG}` },
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      })
      const { data: { user } } = await supabase.auth.getUser()
      if (user && user.email) {
        const { default: prisma } = await import('@/lib/prisma')
        let dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        })
        if (!dbUser) {
          const name = (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || user.email.split('@')[0]
          dbUser = await prisma.user.create({
            data: {
              email: user.email,
              name,
              password: '',
              role: 'USER',
            },
          })
        }
        return {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
        }
      }
    } catch (e) {
      console.error('Error resolving Supabase session in getUserSession:', e)
    }
  }

  return null
}
