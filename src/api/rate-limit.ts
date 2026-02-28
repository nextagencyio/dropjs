import rateLimit from 'express-rate-limit';

/**
 * Strict rate limit for auth endpoints (login, register): 5 requests per minute.
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: { status: 429, message: 'Too many requests, please try again later' },
  },
});

/**
 * Moderate rate limit for mutation endpoints (POST/PATCH/PUT/DELETE): 30 requests per minute.
 */
export const mutationLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: { status: 429, message: 'Too many requests, please try again later' },
  },
});

/**
 * Light rate limit for read endpoints (GET): 100 requests per minute.
 */
export const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: { status: 429, message: 'Too many requests, please try again later' },
  },
});
