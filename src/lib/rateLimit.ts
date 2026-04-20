/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window approach per IP address.
 * 
 * NOTE: This works per-instance. In serverless (Vercel), each cold start
 * gets its own memory, so this provides "best effort" protection.
 * For production-grade limiting, consider Vercel KV or Upstash Redis.
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const store = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now

  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime) {
      store.delete(key)
    }
  }
}

/**
 * Check if a request should be rate limited.
 * 
 * @param identifier - Unique key (usually IP address)
 * @param limit - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns { limited: boolean, remaining: number, resetIn: number }
 */
export function rateLimit(
  identifier: string,
  limit: number = 30,
  windowMs: number = 60 * 1000
): { limited: boolean; remaining: number; resetIn: number } {
  cleanup()

  const now = Date.now()
  const entry = store.get(identifier)

  if (!entry || now > entry.resetTime) {
    // First request or window expired — start fresh
    store.set(identifier, { count: 1, resetTime: now + windowMs })
    return { limited: false, remaining: limit - 1, resetIn: windowMs }
  }

  entry.count++

  if (entry.count > limit) {
    return {
      limited: true,
      remaining: 0,
      resetIn: entry.resetTime - now,
    }
  }

  return {
    limited: false,
    remaining: limit - entry.count,
    resetIn: entry.resetTime - now,
  }
}

/**
 * Extract client IP from a NextRequest.
 * Works on Vercel (x-forwarded-for) and locally.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return '127.0.0.1'
}
