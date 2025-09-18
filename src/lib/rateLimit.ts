import { NextRequest } from 'next/server'
import { redis, getCacheKey } from './redis'

// Rate limiting configuration
const RATE_LIMITS = {
  USER_TICKET_CLAIM: {
    attempts: 3,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many ticket claim attempts. Please wait before trying again.'
  },
  IP_GENERAL: {
    requests: 10,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests from this IP. Please slow down.'
  }
}

export interface RateLimitResult {
  success: boolean
  remaining?: number
  resetTime?: number
  error?: string
}

// Rate limit for user ticket claims (3 attempts per minute)
export async function rateLimitUserTicketClaim(userId: string): Promise<RateLimitResult> {
  const key = getCacheKey.rateLimitUser(userId)
  const limit = RATE_LIMITS.USER_TICKET_CLAIM
  
  try {
    const current = await redis.incr(key)
    
    if (current === null) {
      // Redis not available - FAIL CLOSED during high-traffic events
      console.error('Redis unavailable for rate limiting - denying request for safety')
      return { 
        success: false, 
        error: 'Service temporarily unavailable. Please try again later.',
        remaining: 0,
        resetTime: Date.now() + limit.windowMs
      }
    }
    
    if (current === 1) {
      // First request, set expiration
      await redis.expire(key, Math.ceil(limit.windowMs / 1000))
    }
    
    if (current <= limit.attempts) {
      return {
        success: true,
        remaining: limit.attempts - current,
        resetTime: Date.now() + limit.windowMs
      }
    }
    
    // Rate limit exceeded
    return {
      success: false,
      remaining: 0,
      resetTime: Date.now() + limit.windowMs,
      error: `${limit.message} Reset in ${Math.ceil(limit.windowMs / 1000)} seconds.`
    }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    // FAIL CLOSED on error for safety
    return { 
      success: false,
      error: 'Rate limiting service unavailable. Please try again later.',
      remaining: 0,
      resetTime: Date.now() + limit.windowMs
    }
  }
}

// Rate limit for IP-based requests (10 requests per minute)
export async function rateLimitByIP(ip: string): Promise<RateLimitResult> {
  const key = getCacheKey.rateLimitIP(ip)
  const limit = RATE_LIMITS.IP_GENERAL
  
  try {
    const current = await redis.incr(key)
    
    if (current === null) {
      // Redis not available - FAIL CLOSED for IP rate limiting
      console.error('Redis unavailable for IP rate limiting - denying request for safety')
      return { 
        success: false, 
        error: 'Service temporarily unavailable. Please try again later.',
        remaining: 0,
        resetTime: Date.now() + limit.windowMs
      }
    }
    
    if (current === 1) {
      // First request, set expiration
      await redis.expire(key, Math.ceil(limit.windowMs / 1000))
    }
    
    if (current <= limit.requests) {
      return {
        success: true,
        remaining: limit.requests - current,
        resetTime: Date.now() + limit.windowMs
      }
    }
    
    // Rate limit exceeded
    const resetIn = Math.ceil(limit.windowMs / 1000)
    return {
      success: false,
      remaining: 0,
      resetTime: Date.now() + limit.windowMs,
      error: `${limit.message} Try again in ${resetIn} seconds.`
    }
  } catch (error) {
    console.error('IP rate limit check failed:', error)
    // FAIL CLOSED on error for safety
    return { 
      success: false,
      error: 'Rate limiting service unavailable. Please try again later.',
      remaining: 0,
      resetTime: Date.now() + limit.windowMs
    }
  }
}

// Helper to get client IP from NextJS request
export function getClientIP(req: NextRequest): string {
  // Check various headers for the real client IP
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  const cfConnectingIP = req.headers.get('cf-connecting-ip')
  
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()
  
  return req.ip || '127.0.0.1'
}

// Rate limiting middleware factory
export function createRateLimitResponse(result: RateLimitResult, status = 429) {
  if (result.success) return null
  
  const headers = new Headers()
  if (result.remaining !== undefined) {
    headers.set('X-RateLimit-Remaining', result.remaining.toString())
  }
  if (result.resetTime) {
    headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString())
  }
  
  return new Response(
    JSON.stringify({ 
      error: result.error || 'Rate limit exceeded',
      retryAfter: result.resetTime ? Math.ceil((result.resetTime - Date.now()) / 1000) : 60
    }),
    { 
      status, 
      headers: {
        ...Object.fromEntries(headers),
        'Content-Type': 'application/json'
      }
    }
  )
}

// Reset rate limit (for testing or admin override)
export async function resetRateLimit(key: string): Promise<boolean> {
  try {
    return await redis.del(key)
  } catch (error) {
    console.error('Failed to reset rate limit:', error)
    return false
  }
}