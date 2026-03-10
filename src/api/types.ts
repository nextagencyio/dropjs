/**
 * Framework-agnostic request/response types used by all API handlers and middleware.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Request {
  method: string;
  url: string;
  path: string;
  params: Record<string, string>;
  query: Record<string, any>;
  body?: any;
  headers: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string>;
  user?: { uid: number; name: string; roles: string[]; [key: string]: unknown };
  file?: { originalname: string; mimetype: string; size: number; path: string; filename: string };
  ip?: string;
  isAuthenticated?: boolean;
  get(name: string): string | undefined;
}

export interface Response {
  status(code: number): Response;
  json(data: unknown): any;
  send(data?: unknown): void;
  end(data?: unknown): void;
  setHeader(name: string, value: string | string[]): void;
  redirect(url: string): void;
  redirect(status: number, url: string): void;
  cookie(name: string, value: string, options?: Record<string, unknown>): void;
  sendFile?(path: string): void;
  headersSent?: boolean;
  statusCode?: number;
}

export type NextFunction = (err?: unknown) => void;

export type RequestHandler = (req: Request, res: Response, next: NextFunction) => void;

export type MiddlewareFn = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
