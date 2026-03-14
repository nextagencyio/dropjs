/**
 * Catch-all Next.js Route Handler for /api/* requests.
 *
 * Bridges the Web API Request/Response to the existing Node.js
 * handleApiRequest() dispatcher. Used on Vercel where the custom
 * HTTP server is not available.
 */

import { Readable } from 'node:stream';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { handleApiRequest } from '@/api/request-handler.js';

/** Convert a Web API Request into a Node.js IncomingMessage. */
function toIncomingMessage(request: Request, slug: string[], bodyBuffer: Buffer): IncomingMessage {
  const url = new URL(request.url);
  const path = '/api/' + slug.join('/') + url.search;

  // Create a readable stream from the pre-read body buffer
  const bodyStream = Readable.from(bodyBuffer.length > 0 ? [bodyBuffer] : []);

  // Attach IncomingMessage-like properties
  const msg = Object.assign(bodyStream, {
    method: request.method,
    url: path,
    headers: Object.fromEntries(request.headers.entries()),
    socket: { remoteAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1' } as any,
    httpVersion: '1.1',
    httpVersionMajor: 1,
    httpVersionMinor: 1,
    connection: new Socket(),
    aborted: false,
    complete: true,
    rawHeaders: [] as string[],
    trailers: {} as Record<string, string>,
    rawTrailers: [] as string[],
    statusCode: undefined,
    statusMessage: undefined,
  }) as unknown as IncomingMessage;

  return msg;
}

/** Collect a ServerResponse into a Web API Response. */
function collectResponse(): { res: ServerResponse; promise: Promise<Response> } {
  const socket = new Socket();
  const res = new ServerResponse({} as any);
  // Prevent actual socket writes
  (res as any).socket = socket;
  (res as any).connection = socket;

  const chunks: Buffer[] = [];
  let statusCode = 200;
  let headersWritten: Record<string, string | string[]> = {};

  // Intercept writeHead
  const origWriteHead = res.writeHead.bind(res);
  (res as any).writeHead = (code: number, headersOrReason?: any, maybeHeaders?: any) => {
    statusCode = code;
    const hdrs = maybeHeaders || (typeof headersOrReason === 'object' ? headersOrReason : undefined);
    if (hdrs) {
      headersWritten = { ...headersWritten, ...hdrs };
    }
    return origWriteHead(code, headersOrReason, maybeHeaders);
  };

  // Intercept write/end to collect body
  (res as any).write = (chunk: any) => {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return true;
  };

  const promise = new Promise<Response>((resolve) => {
    (res as any).end = (chunk?: any) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));

      // Collect all headers
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
      for (const [name, val] of Object.entries(headersWritten)) {
        if (Array.isArray(val)) {
          for (const v of val) responseHeaders.append(name, v);
        } else {
          responseHeaders.set(name, val);
        }
      }

      const body = chunks.length > 0 ? Buffer.concat(chunks) : null;
      resolve(new Response(body, { status: statusCode, headers: responseHeaders }));
    };
  });

  // Intercept pipe for sendFile
  socket.writable = true;
  (socket as any).write = (chunk: any) => {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return true;
  };
  (socket as any).end = (chunk?: any) => {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  };

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
