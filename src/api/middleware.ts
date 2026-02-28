import type { Request, Response, NextFunction, RequestHandler } from './types.js';
import { HttpError } from './errors.js';
import { createLogger } from '../core/index.js';

/**
 * Wraps async route handlers to catch errors and forward to Express error handler.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/**
 * Express error handler middleware.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: {
        status: err.status,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  const logger = createLogger('api');
  logger.error('Unhandled API error', { error: err.message, stack: err.stack });
  res.status(500).json({
    error: { status: 500, message: 'Internal server error' },
  });
}
