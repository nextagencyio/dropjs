/**
 * Core API request dispatcher — replaces Express for /api/* requests.
 *
 * Called from http.createServer in dev.ts/serve.ts.
 * Creates adapted req/res, runs middleware chain, matches route, calls handler.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import * as path from 'node:path';
import { AdaptedRequest, AdaptedResponse } from './adapter.js';
import { runMiddleware, type MiddlewareFn } from './middleware-runner.js';
import { buildRouteTable, matchRoute, type RouteEntry } from './route-table.js';
import { HttpError } from './errors.js';
import { cors } from './cors.js';
import { sanitizeMiddleware } from './sanitize.js';
import { jsonApiMiddleware } from './jsonapi.js';
import { csrfProtection } from './csrf.js';
import { ensureInitialized } from './init.js';
import {
  ensureWebhooksTable,
  ensureWatchdogTable,
  ensureAccessLogTable,
  ensureKeyValueTable,
  ensureQueueTable,
  ensureCommentTables,
  ensureParagraphsTable,
  registerParagraphHooks,
  ensurePreviewTable,
  registerPreviewCleanupCronJob,
  ensureActionTriggersTable,
  registerDefaultActions,
  registerTriggerHooks,
  ensureContactTables,
  ensureShortcutTables,
  registerDefaultTokens,
  createLogger,
} from '../core/index.js';

const logger = createLogger('api:handler');

// Lazy-built route table
let routes: RouteEntry[] | null = null;
let subsystemsEnsured = false;

/**
 * Ensure subsystem tables exist (run once, parallel, fire-and-forget like server.ts).
 */
async function ensureSubsystemTables(): Promise<void> {
  if (subsystemsEnsured) return;
  subsystemsEnsured = true;

  // These mirror the table-creation calls in createApiServer()
  const tasks = [
    ensureWebhooksTable(),
    ensureWatchdogTable(),
    ensureAccessLogTable(),
    ensureKeyValueTable(),
    ensureQueueTable(),
    ensureCommentTables(),
    ensureParagraphsTable(),
    ensurePreviewTable(),
    ensureActionTriggersTable(),
    ensureContactTables(),
    ensureShortcutTables(),
  ];

  await Promise.all(tasks.map((p) => p.catch((err) => {
    logger.error('Failed to ensure subsystem table', { error: String(err) });
  })));

  // Register hooks and default data (sync, idempotent)
  registerParagraphHooks();
  registerPreviewCleanupCronJob();
  registerDefaultActions();
  registerTriggerHooks();
  registerDefaultTokens();
}

// Global middleware instances (created once)
const corsMiddleware = cors({});
const sanitize = sanitizeMiddleware();
const csrf = csrfProtection();

// Security headers (replaces helmet)
function securityHeaders(_req: any, res: any, next: (err?: unknown) => void): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:");
  next();
}

/**
 * Handle an incoming /api/* request.
 */
export async function handleApiRequest(
  rawReq: IncomingMessage,
  rawRes: ServerResponse,
): Promise<void> {
  const req = new AdaptedRequest(rawReq);
  const res = new AdaptedResponse(rawRes);

  try {
    // Ensure DB and subsystems are initialized
    await ensureInitialized();
    await ensureSubsystemTables();

    // Build route table on first request
    if (!routes) {
      routes = buildRouteTable();
    }

    // Determine uploads directory for body parsing
    const uploadsDir = path.resolve(process.env.UPLOADS_DIR || 'data/files');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      const ok = await runMiddleware(req, res, [corsMiddleware as MiddlewareFn]);
      if (!res.isSent) res.status(204).end();
      return;
    }

    // Match route
    const match = matchRoute(req.method, req.path, routes);
    if (!match) {
      res.status(404).json({ error: { status: 404, message: 'Not found' } });
      return;
    }

    const { route, params } = match;
    req.params = params;

    // Parse body (JSON or multipart if upload route)
    await req.parseBody(uploadsDir);

    // Build global middleware chain
    const globalMw: MiddlewareFn[] = [
      securityHeaders,
      corsMiddleware as MiddlewareFn,
      sanitize as MiddlewareFn,
      jsonApiMiddleware as MiddlewareFn,
    ];

    // Add CSRF protection (skip for safe methods, exempt routes, and Bearer auth)
    if (!route.skipCsrf) {
      globalMw.push(csrf as MiddlewareFn);
    }

    // Run global middleware
    const shouldContinue = await runMiddleware(req, res, globalMw);
    if (!shouldContinue) return;

    // Run per-route middleware (auth, permissions, validation, etc.)
    if (route.middleware?.length) {
      const ok = await runMiddleware(req, res, route.middleware);
      if (!ok) return;
    }

    // Call handler
    await route.handler(req, res);

    // If handler didn't send a response, send 204
    if (!res.isSent) {
      res.status(204).end();
    }
  } catch (err: unknown) {
    if (res.isSent) return;

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

    logger.error('Unhandled API error', { error: (err as Error).message, stack: (err as Error).stack });
    res.status(500).json({ error: { status: 500, message: 'Internal server error' } });
  }
}
