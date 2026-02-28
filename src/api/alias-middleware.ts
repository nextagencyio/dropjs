import type { Request, Response, NextFunction } from './types.js';
import { resolveAlias } from '../core/index.js';

/**
 * Middleware that resolves URL aliases to internal paths.
 * If a request path matches a stored alias, the request URL is rewritten
 * to the internal source path.
 */
export function aliasResolver() {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // Only resolve for /content/* paths (alias paths)
    if (!req.path.startsWith('/content/')) {
      return next();
    }

    try {
      const sourcePath = await resolveAlias(req.path);
      if (sourcePath) {
        req.url = sourcePath + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
      }
    } catch {
      // If alias lookup fails, continue with original path
    }

    next();
  };
}
