import { validateToken } from './session.js';
import { loadUser, type UserData } from './user.js';
import { userHasPermission } from './access.js';

// Framework-agnostic types for auth middleware
interface AuthRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: UserData | null;
  isAuthenticated?: boolean;
}

interface AuthResponse {
  status(code: number): AuthResponse;
  json(data: unknown): void;
}

type NextFn = (err?: unknown) => void;

/**
 * Middleware that extracts Bearer token from Authorization header,
 * validates it, and attaches user to req.user.
 * Does NOT reject unauthenticated requests.
 */
export function authenticate() {
  return async (req: AuthRequest, _res: AuthResponse, next: NextFn): Promise<void> => {
    req.user = null;
    req.isAuthenticated = false;

    const authHeader = req.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const session = await validateToken(token);
      if (session) {
        const user = await loadUser(session.uid);
        if (user && user.status !== false) {
          req.user = user;
          req.isAuthenticated = true;
        }
      }
    }
    next();
  };
}

/**
 * Middleware that rejects requests without a valid authenticated user.
 */
export function requireAuth() {
  return (req: AuthRequest, res: AuthResponse, next: NextFn): void => {
    if (!req.isAuthenticated) {
      res.status(401).json({
        error: { status: 401, message: 'Authentication required' },
      });
      return;
    }
    next();
  };
}

/**
 * Middleware that checks for a specific permission.
 */
export function requirePermission(permission: string) {
  return async (req: AuthRequest, res: AuthResponse, next: NextFn): Promise<void> => {
    const allowed = await userHasPermission(req.user ?? null, permission);
    if (!allowed) {
      res.status(403).json({
        error: { status: 403, message: 'Access denied' },
      });
      return;
    }
    next();
  };
}
