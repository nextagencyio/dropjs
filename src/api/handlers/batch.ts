import type { Request, Response } from '../types.js';
import type { BatchOperation, BatchResult, BatchResponse } from '../../core/index.js';
import { createLogger } from '../../core/index.js';
import { BadRequestError, HttpError } from '../errors.js';
import { buildRouteTable, matchRoute, type RouteEntry } from '../route-table.js';
import { runMiddleware, type MiddlewareFn } from '../middleware-runner.js';

const logger = createLogger('api:batch');

const MAX_OPERATIONS = 25;

// Lazily cached route table for batch sub-dispatching
let batchRoutes: RouteEntry[] | null = null;

function getRoutes(): RouteEntry[] {
  if (!batchRoutes) {
    batchRoutes = buildRouteTable();
  }
  return batchRoutes;
}

/**
 * Execute a single sub-operation by internally matching the route and calling
 * the handler directly.  Inherits the caller's auth context and skips CSRF
 * (the parent request already passed CSRF validation).
 */
async function executeOperation(
  operation: BatchOperation,
  parentReq: Request,
): Promise<BatchResult> {
  const opPath = operation.path.split('?')[0];
  const match = matchRoute(operation.method, opPath, getRoutes());

  if (!match) {
    return {
      status: 404,
      body: { error: { status: 404, message: 'Not found' } },
      error: 'Not found',
    };
  }

  const { route, params } = match;

  // Build a lightweight mock request inheriting caller's auth context
  const mockReq: any = {
    method: operation.method,
    url: operation.path,
    path: opPath,
    body: operation.body ?? {},
    headers: {
      ...parentReq.headers,
      ...(operation.headers ?? {}),
    },
    params,
    query: {} as Record<string, string>,
    cookies: (parentReq as any).cookies ?? {},
    user: (parentReq as any).user,
    isAuthenticated: (parentReq as any).isAuthenticated,
    get(name: string): string | undefined {
      return this.headers[name.toLowerCase()] as string | undefined;
    },
    ip: (parentReq as any).ip ?? '127.0.0.1',
  };

  // Parse query string from path
  const qIdx = operation.path.indexOf('?');
  if (qIdx !== -1) {
    const qs = operation.path.substring(qIdx + 1);
    for (const pair of qs.split('&')) {
      const [key, val] = pair.split('=');
      if (key) {
        mockReq.query[decodeURIComponent(key)] = val ? decodeURIComponent(val) : '';
      }
    }
  }

  // Build a mock response that captures status + body
  let statusCode = 200;
  let responseBody: unknown = null;
  let sent = false;

  const mockRes: any = {
    isSent: false,
    status(code: number) {
      statusCode = code;
      return mockRes;
    },
    json(body: unknown) {
      responseBody = body;
      sent = true;
      mockRes.isSent = true;
      return mockRes;
    },
    send(body?: unknown) {
      if (body !== undefined && body !== '') responseBody = body;
      sent = true;
      mockRes.isSent = true;
      return mockRes;
    },
    end() {
      sent = true;
      mockRes.isSent = true;
      return mockRes;
    },
    setHeader() { return mockRes; },
    cookie() {},
    sendFile() { return mockRes; },
    redirect() { return mockRes; },
  };

  try {
    // Run per-route middleware (auth, permissions, etc.) — skip CSRF since parent handled it
    if (route.middleware?.length) {
      const ok = await runMiddleware(mockReq, mockRes, route.middleware);
      if (!ok) {
        const failed = statusCode >= 400;
        return {
          status: statusCode,
          body: responseBody,
          ...(failed ? { error: (responseBody as any)?.error?.message ?? `HTTP ${statusCode}` } : {}),
        };
      }
    }

    await route.handler(mockReq, mockRes);

    // If handler didn't explicitly send, treat as 204
    if (!sent) statusCode = 204;

    const failed = statusCode >= 400;
    return {
      status: statusCode,
      body: responseBody,
      ...(failed ? { error: (responseBody as any)?.error?.message ?? `HTTP ${statusCode}` } : {}),
    };
  } catch (err: any) {
    if (err instanceof HttpError) {
      return {
        status: err.status,
        body: { error: { status: err.status, message: err.message } },
        error: err.message,
      };
    }
    logger.error('Batch sub-operation error', { path: operation.path, error: String(err) });
    return {
      status: 500,
      body: { error: { status: 500, message: err.message ?? 'Internal error' } },
      error: err.message ?? 'Internal error',
    };
  }
}

/**
 * POST /api/batch
 *
 * Execute multiple API operations in a single request.
 */
export async function handleBatch(
  req: Request,
  res: Response,
): Promise<void> {
  const { operations, sequential } = req.body as {
    operations?: BatchOperation[];
    sequential?: boolean;
  };

  if (!Array.isArray(operations) || operations.length === 0) {
    throw new BadRequestError('operations must be a non-empty array');
  }

  if (operations.length > MAX_OPERATIONS) {
    throw new BadRequestError(
      `Maximum ${MAX_OPERATIONS} operations per batch request (got ${operations.length})`,
    );
  }

  // Validate each operation
  const validMethods = new Set(['GET', 'POST', 'PATCH', 'DELETE']);
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    if (!op.method || !validMethods.has(op.method)) {
      throw new BadRequestError(
        `Operation ${i}: method must be one of GET, POST, PATCH, DELETE`,
      );
    }
    if (!op.path || typeof op.path !== 'string' || !op.path.startsWith('/api/')) {
      throw new BadRequestError(
        `Operation ${i}: path must be a string starting with /api/`,
      );
    }
    // Prevent recursive batch calls
    if (op.path === '/api/batch' || op.path.startsWith('/api/batch?')) {
      throw new BadRequestError(
        `Operation ${i}: cannot nest batch requests`,
      );
    }
  }

  const results: BatchResult[] = [];
  let succeeded = 0;
  let failed = 0;

  if (sequential) {
    // Sequential: stop on first error
    let stopped = false;
    for (const op of operations) {
      if (stopped) {
        results.push({ status: 0, body: null, error: 'Skipped (previous operation failed)' });
        continue;
      }

      const result = await executeOperation(op, req);
      results.push(result);

      if (result.status >= 400) {
        failed++;
        stopped = true;
      } else {
        succeeded++;
      }
    }
  } else {
    // Parallel execution
    const promises = operations.map((op) => executeOperation(op, req));
    const settled = await Promise.all(promises);

    for (const result of settled) {
      results.push(result);
      if (result.status >= 400) {
        failed++;
      } else {
        succeeded++;
      }
    }
  }

  const response: BatchResponse = {
    results,
    meta: {
      total: operations.length,
      succeeded,
      failed,
    },
  };

  res.json(response);
}
