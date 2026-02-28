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

  return { sid, uid, token, created, expires: expiresStr };
}

export async function validateToken(token: string): Promise<Session | null> {
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

export async function destroySession(token: string): Promise<void> {
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
