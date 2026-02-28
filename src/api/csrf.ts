import crypto from 'node:crypto';
import type { Request, Response, NextFunction, RequestHandler } from './types.js';

const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = 'dropjs_csrf';
const TOKEN_LENGTH = 32;

function generateCsrfToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * GET /api/csrf-token — returns a new CSRF token and sets it as a cookie.
 */
export function csrfTokenHandler(req: Request, res: Response): void {
  const token = generateCsrfToken();
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false, // JS needs to read it
    sameSite: 'strict',
    path: '/',
  });
  res.json({ csrfToken: token });
}

/**
 * Middleware that validates the CSRF token on state-changing requests.
 * Compares the X-CSRF-Token header against the csrf cookie (double-submit pattern).
 * Skips validation for GET, HEAD, OPTIONS requests.
 */
export function csrfProtection(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const method = req.method.toUpperCase();

    // Safe methods don't need CSRF validation
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      next();
      return;
    }

    // Auth endpoints are exempt — they accept credentials in the body
    // and return bearer tokens, so CSRF is not applicable.
    if (req.path.startsWith('/auth/')) {
      next();
      return;
    }

    // Requests with Bearer token auth are exempt — the Authorization header
    // is never automatically sent by browsers, so CSRF is not possible.
    const authHeader = req.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const headerToken = req.headers[CSRF_HEADER] as string | undefined;
    const cookieToken = req.cookies?.[CSRF_COOKIE] as string | undefined;

    if (!headerToken || !cookieToken) {
      res.status(403).json({
        error: { status: 403, message: 'CSRF token missing' },
      });
      return;
    }

    if (headerToken !== cookieToken) {
      res.status(403).json({
        error: { status: 403, message: 'CSRF token mismatch' },
      });
      return;
    }

    next();
  };
}
