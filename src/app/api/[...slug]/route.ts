/**
 * Catch-all Next.js Route Handler for /api/* requests.
 *
 * Bridges the Web API Request/Response to the Node.js
 * handleApiRequest() dispatcher. All API traffic flows through
 * this route — there is no separate custom HTTP server.
 */

import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { handleApiRequest } from '@/api/request-handler.js';

/** Convert a Web API Request into a Node.js IncomingMessage-like object. */
function toIncomingMessage(request: Request, slug: string[], bodyBuffer: Buffer): IncomingMessage {
  const url = new URL(request.url);
  const apiPath = '/api/' + slug.join('/') + url.search;
  const headers = Object.fromEntries(request.headers.entries());

  // Minimal object with the properties AdaptedRequest reads.
  // The __body property is used by readBody() to skip stream-based reading.
  const msg = {
    method: request.method,
    url: apiPath,
    headers,
    socket: { remoteAddress: headers['x-forwarded-for']?.split(',')[0]?.trim() || '127.0.0.1' },
    httpVersion: '1.1',
    httpVersionMajor: 1,
    httpVersionMinor: 1,
    connection: new Socket(),
    aborted: false,
    complete: true,
    rawHeaders: [] as string[],
    trailers: {} as Record<string, string>,
    rawTrailers: [] as string[],
    __body: bodyBuffer,
  };

  return msg as unknown as IncomingMessage;
}

/** Collect a ServerResponse into a Web API Response. */
function collectResponse(): { res: ServerResponse; promise: Promise<Response> } {
  // Create a minimal ServerResponse that collects output in memory
  // instead of writing to a real socket.
  const socket = new Socket();
  const res = new ServerResponse({} as any);

  const chunks: Buffer[] = [];
  let statusCode = 200;
  const collectedHeaders: Record<string, string | string[]> = {};

  // Intercept writeHead — capture status + headers without writing to socket
  (res as any).writeHead = (code: number, headersOrReason?: any, maybeHeaders?: any) => {
    statusCode = code;
    const hdrs = maybeHeaders || (typeof headersOrReason === 'object' ? headersOrReason : undefined);
    if (hdrs) {
      for (const [k, v] of Object.entries(hdrs)) {
        collectedHeaders[k] = v as string | string[];
      }
    }
    return res;
  };

  // Intercept write/end to collect body
  (res as any).write = (chunk: any, _encoding?: any, cb?: any) => {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    if (typeof cb === 'function') cb();
    return true;
  };

  const promise = new Promise<Response>((resolve) => {
    (res as any).end = (chunk?: any, _encoding?: any, cb?: any) => {
      if (typeof chunk === 'function') { cb = chunk; chunk = undefined; }
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));

      // Collect headers from both setHeader() calls and writeHead() overrides
      const responseHeaders = new Headers();
      for (const name of res.getHeaderNames()) {
        const val = res.getHeader(name);
        if (val === undefined) continue;
        if (Array.isArray(val)) {
          for (const v of val) responseHeaders.append(name, v);
        } else {
          responseHeaders.set(name, String(val));
        }
      }
      for (const [name, val] of Object.entries(collectedHeaders)) {
        if (Array.isArray(val)) {
          for (const v of val) responseHeaders.append(name, v);
        } else {
          responseHeaders.set(name, val);
        }
      }

      const body = chunks.length > 0 ? Buffer.concat(chunks) : null;
      resolve(new Response(body, { status: statusCode, headers: responseHeaders }));
      if (typeof cb === 'function') cb();
    };
  });

  // Intercept socket writes for pipe/sendFile support
  socket.writable = true;
  (socket as any).write = (chunk: any) => {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return true;
  };
  (socket as any).end = (chunk?: any) => {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  };
  (res as any).socket = socket;
  (res as any).connection = socket;

  return { res, promise };
}

async function handler(request: Request, context: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await context.params;

  // Pre-read the request body to avoid stream consumption issues in serverless
  let bodyBuffer = Buffer.alloc(0);
  if (request.body) {
    const arrayBuffer = await request.arrayBuffer();
    bodyBuffer = Buffer.from(arrayBuffer);
  }

  const req = toIncomingMessage(request, slug, bodyBuffer);
  const { res, promise } = collectResponse();

  await handleApiRequest(req, res);

  return promise;
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;

// Allow long-running requests (cold start init + file uploads)
export const maxDuration = 60;
