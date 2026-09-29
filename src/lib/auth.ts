import { jwtVerify, SignJWT } from 'jose'
import { cookies } from 'next/headers'

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
  } catch (err) {
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

export async function getUserSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  
  if (!token) return null
  return await verifyAuth(token)
}
