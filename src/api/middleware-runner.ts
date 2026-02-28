/**
 * Sequential middleware executor matching Express (req, res, next) semantics.
 *
 * Runs each middleware in order. If a middleware calls res.json()/send()/sendFile()
 * (marking the response as sent), the chain short-circuits.
 */

import type { AdaptedRequest, AdaptedResponse } from './adapter.js';

export type MiddlewareFn = (req: any, res: any, next: (err?: unknown) => void) => void | Promise<void>;

/**
 * Run an array of middleware functions sequentially.
 * Returns true if the chain completed without sending a response,
 * false if a middleware short-circuited (response already sent).
 */
export async function runMiddleware(
  req: AdaptedRequest,
  res: AdaptedResponse,
  middlewares: MiddlewareFn[],
): Promise<boolean> {
  for (const mw of middlewares) {
    if (res.isSent) return false;
    await runSingle(req, res, mw);
    if (res.isSent) return false;
  }
  return true;
}

function runSingle(
  req: AdaptedRequest,
  res: AdaptedResponse,
  mw: MiddlewareFn,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const next = (err?: unknown) => {
      if (err) reject(err);
      else resolve();
    };

    try {
      const result = mw(req as any, res as any, next);
      // Handle async middleware that returns a promise
      if (result && typeof (result as any).then === 'function') {
        (result as Promise<void>).catch(reject);
      }
    } catch (err) {
      reject(err);
    }
  });
}
