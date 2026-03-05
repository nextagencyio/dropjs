/**
 * In-memory sliding window rate limiter.
 *
 * Replaces the old express-rate-limit dependency with a native implementation
 * compatible with the custom HTTP server's middleware pattern.
 *
 * Rate limits (per IP):
 *   - Auth endpoints:     5 req/min
 *   - Mutation endpoints: 30 req/min
 *   - Read endpoints:     100 req/min
 *
 * Set DROP_DISABLE_RATE_LIMIT=1 to bypass all rate limiting (useful for tests).
 */

type MiddlewareFn = (req: any, res: any, next: (err?: unknown) => void) => void;

interface WindowEntry {
  timestamps: number[];
}

/**
 * Create a rate limiter middleware using a sliding window algorithm.
 *
 * @param windowMs  - Window duration in milliseconds
 * @param maxRequests - Maximum requests allowed within the window
 */
export function createRateLimiter(windowMs: number, maxRequests: number): MiddlewareFn {
  const store = new Map<string, WindowEntry>();

  // Auto-clean expired entries every 60 seconds to prevent memory leaks.
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
      if (entry.timestamps.length === 0) {
        store.delete(ip);
      }
    }
  }, 60_000);

  // Allow the timer to not keep the process alive.
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return function rateLimitMiddleware(req: any, res: any, next: (err?: unknown) => void): void {
    // Skip when disabled via env var
    if (process.env.DROP_DISABLE_RATE_LIMIT === '1') {
      return next();
    }

    const ip: string =
      req.ip ||
      (typeof req.headers?.['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0].trim()
        : null) ||
      req.socket?.remoteAddress ||
      '127.0.0.1';

    const now = Date.now();
    let entry = store.get(ip);

    if (!entry) {
      entry = { timestamps: [] };
      store.set(ip, entry);
    }

    // Remove timestamps outside the current window
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

    // Calculate reset time (end of window from the oldest relevant request, or now + windowMs)
    const resetTime = entry.timestamps.length > 0
      ? entry.timestamps[0] + windowMs
      : now + windowMs;

    const remaining = Math.max(0, maxRequests - entry.timestamps.length);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, remaining - 1)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)));

    if (entry.timestamps.length >= maxRequests) {
      // Rate limit exceeded
      res.setHeader('Retry-After', String(Math.ceil((resetTime - now) / 1000)));
      res.status(429).json({
        error: {
          status: 429,
          message: 'Too many requests, please try again later',
        },
      });
      return;
    }

    // Record this request
    entry.timestamps.push(now);

    // Update remaining header now that we've recorded the request
    res.setHeader('X-RateLimit-Remaining', String(maxRequests - entry.timestamps.length));

    next();
  };
}

/**
 * Strict rate limit for auth endpoints (login, register): 5 requests per minute.
 */
export const authLimiter = createRateLimiter(60 * 1000, 5);

/**
 * Moderate rate limit for mutation endpoints (POST/PATCH/PUT/DELETE): 30 requests per minute.
 */
export const mutationLimiter = createRateLimiter(60 * 1000, 30);

/**
 * Light rate limit for read endpoints (GET): 100 requests per minute.
 */
export const readLimiter = createRateLimiter(60 * 1000, 100);
