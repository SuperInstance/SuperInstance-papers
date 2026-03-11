import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { type Env } from '../env.d.ts'

// Token interface
export interface TokenPayload {
  userId: string
  email: string
  iat: number
  exp: number
}

// Session interface
export interface Session {
  userId: string
  email: string
  createdAt: number
  lastActive: number
  userAgent?: string
  ip?: string
}

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// JWT token generation and verification
export function generateToken(userId: string, email: string, env: Env): string {
  const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
    userId,
    email,
  }

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '7d',
    issuer: 'superinstance-api',
    audience: 'superinstance-web',
  })
}

export function verifyToken(token: string, env: Env): TokenPayload | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'superinstance-api',
      audience: 'superinstance-web',
    }) as TokenPayload

    return payload
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload
  } catch (error) {
    console.error('Token decoding failed:', error)
    return null
  }
}

// Session management with KV
export async function createSession(
  sessionId: string,
  session: Session,
  env: Env
): Promise<void> {
  // Store session in KV with 7-day TTL
  await env.SESSIONS.put(sessionId, JSON.stringify(session), {
    expirationTtl: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function getSession(sessionId: string, env: Env): Promise<Session | null> {
  const sessionData = await env.SESSIONS.get(sessionId)

  if (!sessionData) {
    return null
  }

  try {
    const session = JSON.parse(sessionData) as Session
    // Update last active timestamp
    session.lastActive = Date.now()
    await env.SESSIONS.put(sessionId, JSON.stringify(session), {
      expirationTtl: 60 * 60 * 24 * 7, // Refresh TTL
    })

    return session
  } catch (error) {
    console.error('Failed to parse session data:', error)
    return null
  }
}

export async function deleteSession(sessionId: string, env: Env): Promise<void> {
  await env.SESSIONS.delete(sessionId)
}

// Authentication middleware
export function requireAuth() {
  return async (c: any, next: Function) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
      }, 401)
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token, c.env)

    if (!payload) {
      return c.json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      }, 401)
    }

    // Verify session exists
    const session = await getSession(`session:${payload.userId}:${payload.iat}`, c.env)

    if (!session) {
      return c.json({
        error: 'Unauthorized',
        message: 'Session not found or expired',
      }, 401)
    }

    // Add user to context
    c.set('user', {
      id: payload.userId,
      email: payload.email,
      sessionId: `session:${payload.userId}:${payload.iat}`,
    })

    await next()
  }
}

// Rate limiting helper
export async function checkRateLimit(
  key: string,
  limit: number,
  window: number,
  env: Env
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const now = Math.floor(Date.now() / 1000)
  const windowStart = Math.floor(now / window) * window
  const rateLimitKey = `ratelimit:${key}:${windowStart}`

  const current = await env.CACHE.get(rateLimitKey)
  const count = current ? parseInt(current, 10) : 0

  if (count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      reset: windowStart + window,
    }
  }

  // Increment counter
  await env.CACHE.put(rateLimitKey, (count + 1).toString(), {
    expirationTtl: window,
  })

  return {
    allowed: true,
    remaining: limit - (count + 1),
    reset: windowStart + window,
  }
}