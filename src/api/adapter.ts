/**
 * Adapter layer for Node.js http.IncomingMessage / ServerResponse.
 *
 * Provides req.params, req.query, req.body, req.cookies, req.user, req.file,
 * res.json(), res.status(), res.send(), res.sendFile(), res.redirect(), res.cookie()
 * matching the Request/Response interfaces in types.ts.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Query-string parser (handles bracket notation: filter[status]=1, page[limit]=10)
// ---------------------------------------------------------------------------

function parseQueryString(qs: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!qs) return result;

  for (const pair of qs.split('&')) {
    const eqIdx = pair.indexOf('=');
    const rawKey = eqIdx >= 0 ? pair.slice(0, eqIdx) : pair;
    const rawVal = eqIdx >= 0 ? pair.slice(eqIdx + 1) : '';

    const key = decodeURIComponent(rawKey);
    const value = decodeURIComponent(rawVal);

    // Handle bracket notation: filter[status], page[limit], filter[field][operator]
    const bracketMatch = key.match(/^([^[]+)(\[.*)$/);
    if (bracketMatch) {
      const root = bracketMatch[1];
      const brackets = bracketMatch[2];
      const keys = brackets.match(/\[([^\]]*)\]/g)!.map((b) => b.slice(1, -1));

      if (!result[root] || typeof result[root] !== 'object') {
        result[root] = {};
      }

      let current = result[root] as Record<string, unknown>;
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!current[k] || typeof current[k] !== 'object') {
          current[k] = {};
        }
        current = current[k] as Record<string, unknown>;
      }
      current[keys[keys.length - 1]] = value;
    } else {
      result[key] = value;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Cookie parser
// ---------------------------------------------------------------------------

function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;

  for (const pair of header.split(';')) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx < 0) continue;
    const name = pair.slice(0, eqIdx).trim();
    const value = pair.slice(eqIdx + 1).trim();
    cookies[name] = decodeURIComponent(value);
  }

  return cookies;
}

// ---------------------------------------------------------------------------
// Read raw body from IncomingMessage
// ---------------------------------------------------------------------------

function readBody(req: IncomingMessage): Promise<Buffer> {
  // Support pre-buffered body (used by Next.js catch-all route handler)
  const preBuffered = (req as any).__body as Buffer | undefined;
  if (preBuffered !== undefined) {
    return Promise.resolve(preBuffered);
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Multipart form-data parser (minimal, handles single file + fields)
// ---------------------------------------------------------------------------

interface ParsedFile {
  fieldname: string;
  originalname: string;
  mimetype: string;
  path: string;
  size: number;
}

function getBoundary(contentType: string): string | null {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^\s;]+))/);
  return match ? (match[1] || match[2]) : null;
}

async function parseMultipart(
  body: Buffer,
  boundary: string,
  uploadsDir: string,
): Promise<{ fields: Record<string, string>; file?: ParsedFile }> {
  const fields: Record<string, string> = {};
  let file: ParsedFile | undefined;

  const boundaryBuf = Buffer.from(`--${boundary}`);
  const parts: Buffer[] = [];
  let start = 0;

  // Split body by boundary
  while (true) {
    const idx = body.indexOf(boundaryBuf, start);
    if (idx < 0) break;
    if (start > 0) {
      // Strip leading \r\n and trailing \r\n
      let partStart = idx;
      // Previous part ends at idx
      let partEnd = idx;
      const part = body.subarray(start + boundaryBuf.length, partEnd);
      if (part.length > 4) { // skip empty parts
        parts.push(part);
      }
    }
    start = idx + boundaryBuf.length;
    // Skip \r\n after boundary
    if (body[start] === 0x0d && body[start + 1] === 0x0a) {
      start += 2;
    } else if (body[start] === 0x2d && body[start + 1] === 0x2d) {
      // Terminal boundary --boundary--
      break;
    }
  }

  // Re-parse: simpler approach — split by boundary delimiter
  const delimiter = `--${boundary}`;
  const terminator = `--${boundary}--`;
  const bodyStr = body.toString('binary');
  const rawParts = bodyStr.split(delimiter).slice(1); // skip preamble

  for (const rawPart of rawParts) {
    if (rawPart.startsWith('--') || rawPart.trim() === '') continue;

    // Split headers from body at double CRLF
    const sepIdx = rawPart.indexOf('\r\n\r\n');
    if (sepIdx < 0) continue;

    const headerSection = rawPart.slice(0, sepIdx);
    // Part body: strip leading \r\n and trailing \r\n
    let partBody = rawPart.slice(sepIdx + 4);
    if (partBody.endsWith('\r\n')) {
      partBody = partBody.slice(0, -2);
    }

    const headers: Record<string, string> = {};
    for (const line of headerSection.split('\r\n')) {
      if (!line.startsWith('\r\n') && line.includes(':')) {
        const colonIdx = line.indexOf(':');
        const name = line.slice(0, colonIdx).trim().toLowerCase();
        const value = line.slice(colonIdx + 1).trim();
        headers[name] = value;
      }
    }

    const disposition = headers['content-disposition'] || '';
    const nameMatch = disposition.match(/name="([^"]+)"/);
    const filenameMatch = disposition.match(/filename="([^"]+)"/);
    const fieldName = nameMatch?.[1] || '';

    if (filenameMatch && fieldName) {
      // File field — save to disk
      const originalname = filenameMatch[1];
      const contentType = headers['content-type'] || 'application/octet-stream';

      // Date-based directory (matching multer config)
      const dateDir = new Date().toISOString().slice(0, 7);
      const destDir = path.join(uploadsDir, dateDir);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // Sanitize filename
      const ext = path.extname(originalname);
      const base = path.basename(originalname, ext)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 100);
      const filename = `${base}-${Date.now()}${ext}`;
      const filePath = path.join(destDir, filename);

      // Write binary data
      const fileBuffer = Buffer.from(partBody, 'binary');
      fs.writeFileSync(filePath, fileBuffer);

      file = {
        fieldname: fieldName,
        originalname,
        mimetype: contentType,
        path: filePath,
        size: fileBuffer.length,
      };
    } else if (fieldName) {
      // Regular form field
      fields[fieldName] = partBody;
    }
  }

  return { fields, file };
}

// ---------------------------------------------------------------------------
// MIME type lookup for sendFile
// ---------------------------------------------------------------------------

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.xml': 'application/xml',
  '.zip': 'application/zip',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

// ---------------------------------------------------------------------------
// AdaptedRequest
// ---------------------------------------------------------------------------

export class AdaptedRequest {
  public method: string;
  public url: string;
  public path: string;
  public headers: Record<string, string | string[] | undefined>;
  public params: Record<string, string> = {};
  public query: Record<string, unknown> = {};
  public body: any = {};
  public cookies: Record<string, string> = {};
  public user: any = null;
  public isAuthenticated = false;
  public file?: ParsedFile;

  private _raw: IncomingMessage;

  constructor(raw: IncomingMessage) {
    this._raw = raw;
    this.method = raw.method || 'GET';
    this.url = raw.url || '/';

    // Parse path and query string
    const qIdx = this.url.indexOf('?');
    this.path = qIdx >= 0 ? this.url.slice(0, qIdx) : this.url;
    const queryString = qIdx >= 0 ? this.url.slice(qIdx + 1) : '';
    this.query = parseQueryString(queryString);

    // Parse cookies
    this.cookies = parseCookies(raw.headers.cookie);

    // Headers
    this.headers = raw.headers as Record<string, string | string[] | undefined>;
  }

  /** Read and parse the request body (JSON or multipart). */
  async parseBody(uploadsDir: string): Promise<void> {
    const contentType = this._raw.headers['content-type'] || '';

    if (contentType.includes('application/json')) {
      const buf = await readBody(this._raw);
      const text = buf.toString('utf-8');
      if (text) {
        try {
          this.body = JSON.parse(text);
        } catch {
          this.body = {};
        }
      }
    } else if (contentType.includes('multipart/form-data')) {
      const boundary = getBoundary(contentType);
      if (boundary) {
        const buf = await readBody(this._raw);
        const { fields, file } = await parseMultipart(buf, boundary, uploadsDir);
        this.body = fields;
        this.file = file;
      }
    }
  }

  /** Header accessor. */
  get(name: string): string | undefined {
    const val = this.headers[name.toLowerCase()];
    return typeof val === 'string' ? val : Array.isArray(val) ? val[0] : undefined;
  }

  /** Client IP address. */
  get ip(): string {
    const forwarded = this._raw.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    return this._raw.socket?.remoteAddress || '127.0.0.1';
  }
}

// ---------------------------------------------------------------------------
// AdaptedResponse
// ---------------------------------------------------------------------------

export class AdaptedResponse {
  private _raw: ServerResponse;
  private _statusCode = 200;
  private _sent = false;
  private _headers: Record<string, string> = {};

  constructor(raw: ServerResponse) {
    this._raw = raw;
  }

  /** Whether a response has already been sent. */
  get isSent(): boolean {
    return this._sent;
  }

  /** Set status code (chainable). */
  status(code: number): this {
    this._statusCode = code;
    return this;
  }

  /** Set a response header. */
  setHeader(name: string, value: string): void {
    this._headers[name.toLowerCase()] = value;
    this._raw.setHeader(name, value);
  }

  /** Set a cookie. */
  cookie(name: string, value: string, options?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    path?: string;
    maxAge?: number;
  }): void {
    const parts = [`${name}=${encodeURIComponent(value)}`];
    if (options?.httpOnly) parts.push('HttpOnly');
    if (options?.secure) parts.push('Secure');
    if (options?.sameSite) parts.push(`SameSite=${options.sameSite}`);
    parts.push(`Path=${options?.path ?? '/'}`);
    if (options?.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);

    // Append to existing Set-Cookie headers
    const existing = this._raw.getHeader('Set-Cookie');
    const cookies = Array.isArray(existing) ? existing : existing ? [String(existing)] : [];
    cookies.push(parts.join('; '));
    this._raw.setHeader('Set-Cookie', cookies);
  }

  /** Send JSON response. */
  json(data: unknown): void {
    if (this._sent) return;
    this._sent = true;

    const body = JSON.stringify(data);
    this._raw.writeHead(this._statusCode, {
      ...this._collectHeaders(),
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    });
    this._raw.end(body);
  }

  /** Send a string/buffer response. */
  send(data?: string | Buffer): void {
    if (this._sent) return;
    this._sent = true;

    if (data === undefined || data === '') {
      this._raw.writeHead(this._statusCode, this._collectHeaders());
      this._raw.end();
      return;
    }

    const isBuffer = Buffer.isBuffer(data);
    const body = isBuffer ? data : String(data);
    const contentType = isBuffer ? 'application/octet-stream' : 'text/plain';

    this._raw.writeHead(this._statusCode, {
      ...this._collectHeaders(),
      'Content-Type': this._headers['content-type'] || contentType,
      'Content-Length': isBuffer ? data.length : Buffer.byteLength(body as string),
    });
    this._raw.end(body);
  }

  /** End the response. */
  end(): void {
    if (this._sent) return;
    this._sent = true;
    this._raw.writeHead(this._statusCode, this._collectHeaders());
    this._raw.end();
  }

  /** Stream a file as the response. */
  sendFile(filePath: string): void {
    if (this._sent) return;
    this._sent = true;

    const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
      this._raw.writeHead(404, { 'Content-Type': 'application/json' });
      this._raw.end(JSON.stringify({ error: { status: 404, message: 'File not found' } }));
      return;
    }

    const stat = fs.statSync(absPath);
    const etag = `"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;
    const isStyleDerivative = absPath.includes('/styles/');

    this._raw.writeHead(this._statusCode, {
      ...this._collectHeaders(),
      'Content-Type': getMimeType(absPath),
      'Content-Length': stat.size,
      'ETag': etag,
      'Cache-Control': isStyleDerivative
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=86400',
      'Last-Modified': stat.mtime.toUTCString(),
    });

    const stream = fs.createReadStream(absPath);
    stream.pipe(this._raw);
  }

  /** Redirect to a URL. */
  redirect(url: string): void;
  redirect(status: number, url: string): void;
  redirect(statusOrUrl: number | string, maybeUrl?: string): void {
    if (this._sent) return;
    this._sent = true;

    const status = typeof statusOrUrl === 'number' ? statusOrUrl : 302;
    const url = typeof statusOrUrl === 'string' ? statusOrUrl : maybeUrl!;

    this._raw.writeHead(status, {
      ...this._collectHeaders(),
      Location: url,
    });
    this._raw.end();
  }

  /** Collect headers that were set via setHeader/cookie. */
  private _collectHeaders(): Record<string, string | string[]> {
    const headers: Record<string, string | string[]> = {};
    // Include any headers already set on the raw response
    for (const name of this._raw.getHeaderNames()) {
      const val = this._raw.getHeader(name);
      if (val !== undefined) {
        headers[name] = val as string | string[];
      }
    }
    return headers;
  }
}
