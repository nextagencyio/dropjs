import crypto from 'node:crypto';
import { db, getConnection } from '../db/index.js';

export interface Session {
  sid: string;
  uid: number;
  token: string;
  created: string;
  expires: string | null;
}

const DEFAULT_EXPIRY_HOURS = 24 * 7; // 1 week

// HMAC session signing — use globalThis to share the secret across webpack module
// boundaries (Next.js server components get a separate module instance)
const g = globalThis as unknown as { __dropjs_session_secret?: string };

function getSessionSecret(): string {
  if (g.__dropjs_session_secret) return g.__dropjs_session_secret;
  const envSecret = process.env.SESSION_SECRET;
  if (envSecret) {
    g.__dropjs_session_secret = envSecret;
    return envSecret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set in production. Sessions will not work without it.');
  }
  console.warn(
    '[dropjs] WARNING: SESSION_SECRET is not set. Using a random secret — sessions will not survive restarts. Set SESSION_SECRET in .env for production.'
  );
  g.__dropjs_session_secret = crypto.randomBytes(32).toString('hex');
  return g.__dropjs_session_secret;
}

function hmacSign(token: string): string {
  return crypto.createHmac('sha256', getSessionSecret()).update(token).digest('hex');
}

function signToken(token: string): string {
  return token + '.' + hmacSign(token);
}

function verifyAndExtractToken(signedToken: string): string | null {
  const dotIndex = signedToken.indexOf('.');
  if (dotIndex === -1) {
    // Unsigned legacy token — allow fallthrough for backwards compatibility
    return signedToken;
  }
  const token = signedToken.substring(0, dotIndex);
  const signature = signedToken.substring(dotIndex + 1);
  const expected = hmacSign(token);
  if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
    return null;
  }
  return token;
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createSession(
  uid: number,
  expiryHours: number = DEFAULT_EXPIRY_HOURS
): Promise<Session> {
  const sid = crypto.randomBytes(32).toString('base64url');
  const token = generateToken();
  const now = new Date();
  const expires = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);

  const created = now.toISOString();
  const expiresStr = expires.toISOString();

  await db
    .insert('sessions')
    .values({
      sid,
      uid,
      token,
      created,
      expires: expiresStr,
    })
    .execute();

  return { sid, uid, token: signToken(token), created, expires: expiresStr };
}

export async function validateToken(signedToken: string): Promise<Session | null> {
  const token = verifyAndExtractToken(signedToken);
  if (token === null) return null;

  const conn = getConnection();
  const now = new Date().toISOString();

  const rows = await db
    .select('sessions')
    .fields(['sid', 'uid', 'token', 'created', 'expires'])
    .condition('token', token)
    .execute<Record<string, unknown>>();

  if (rows.length === 0) return null;

  const row = rows[0];

  // Check expiration
  if (row.expires && String(row.expires) < now) {
    // Token expired — clean it up
    await db.delete('sessions').condition('sid', row.sid).execute();
    return null;
  }

  return {
    sid: row.sid as string,
    uid: row.uid as number,
    token: row.token as string,
    created: row.created as string,
    expires: (row.expires as string) ?? null,
  };
}

export async function destroySession(signedToken: string): Promise<void> {
  const token = verifyAndExtractToken(signedToken);
  if (token === null) return;
  await db.delete('sessions').condition('token', token).execute();
}

export async function destroyUserSessions(uid: number): Promise<void> {
  await db.delete('sessions').condition('uid', uid).execute();
}

export async function cleanExpiredSessions(): Promise<number> {
  const now = new Date().toISOString();
  const conn = getConnection();

  // Use raw query for timestamp comparison compatibility
  const result = await conn('sessions').where('expires', '<', now).del();
  return result;
}
