import type { Request, Response, NextFunction } from './types.js';

export interface CorsOptions {
  /** Allowed origins. Use '*' for any origin, or provide specific origins. Default: '*' */
  origins?: string | string[];
  /** Allowed HTTP methods. Default: common REST methods */
  methods?: string[];
  /** Allowed request headers. Default: common headers */
  allowedHeaders?: string[];
  /** Headers exposed to the browser. Default: none */
  exposedHeaders?: string[];
  /** Allow credentials (cookies, auth headers). Default: true */
  credentials?: boolean;
  /** Preflight cache duration in seconds. Default: 86400 (24h) */
  maxAge?: number;
}

const DEFAULT_METHODS = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'];
const DEFAULT_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-CSRF-Token',
  'X-Requested-With',
  'Accept',
];

export function cors(options: CorsOptions = {}) {
  const origins = options.origins ?? '*';
  const methods = options.methods ?? DEFAULT_METHODS;
  const allowedHeaders = options.allowedHeaders ?? DEFAULT_HEADERS;
  const exposedHeaders = options.exposedHeaders ?? [];
  const credentials = options.credentials ?? true;
  const maxAge = options.maxAge ?? 86400;

  function getOrigin(req: Request): string | null {
    const requestOrigin = req.headers.origin as string | undefined;
    if (!requestOrigin) return null;

    if (origins === '*') {
      // When credentials are enabled, can't use wildcard — reflect origin
      return credentials ? requestOrigin : '*';
    }

    const allowedList = Array.isArray(origins) ? origins : [origins];
    if (allowedList.includes(requestOrigin)) {
      return requestOrigin;
    }

    return null;
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const origin = getOrigin(req);

    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    if (credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    if (origin && origin !== '*') {
      res.setHeader('Vary', 'Origin');
    }

    if (exposedHeaders.length > 0) {
      res.setHeader('Access-Control-Expose-Headers', exposedHeaders.join(', '));
    }

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
      res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
      res.setHeader('Access-Control-Max-Age', String(maxAge));
      res.status(204).end();
      return;
    }

    next();
  };
}
