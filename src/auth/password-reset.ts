import crypto from 'node:crypto';
import { db, schema as dbSchema } from '../db/index.js';
import { PASSWORD_RESET_TABLE } from './schemas.js';
import { loadUserByEmail } from './user.js';
import { hashPassword } from './password.js';

const RESET_TOKEN_LENGTH = 32;
const RESET_EXPIRY_HOURS = 1;

export async function ensurePasswordResetTable(): Promise<void> {
  await dbSchema.createTable('password_resets', PASSWORD_RESET_TABLE);
}

export async function createPasswordResetToken(
  email: string
): Promise<{ token: string; uid: number } | null> {
  const user = await loadUserByEmail(email);
  if (!user || !user.uid) {
    return null;
  }

  const token = crypto.randomBytes(RESET_TOKEN_LENGTH).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + RESET_EXPIRY_HOURS * 60 * 60 * 1000);

  await db
    .insert('password_resets')
    .values({
      uid: user.uid,
      token,
      created: now.toISOString(),
      expires: expires.toISOString(),
      used: false,
    })
    .execute();

  return { token, uid: user.uid };
}

export async function validateResetToken(
  token: string
): Promise<{ uid: number } | null> {
  const now = new Date().toISOString();

  const rows = await db
    .select('password_resets')
    .fields(['id', 'uid', 'token', 'expires', 'used'])
    .condition('token', token)
    .execute<Record<string, unknown>>();

  if (rows.length === 0) return null;

  const row = rows[0];

  // Check if already used
  if (row.used) return null;

  // Check expiration
  if (String(row.expires) < now) {
    return null;
  }

  return { uid: row.uid as number };
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<boolean> {
  const result = await validateResetToken(token);
  if (!result) return false;

  const passwordHash = await hashPassword(newPassword);

  // Update the user's password in users_field_data (Drupal schema)
  await db
    .update('users_field_data')
    .set({ pass: passwordHash, changed: Math.floor(Date.now() / 1000) })
    .condition('uid', result.uid)
    .execute();

  // Mark token as used
  await db
    .update('password_resets')
    .set({ used: true })
    .condition('token', token)
    .execute();

  // Destroy all existing sessions for this user (force re-login)
  await db.delete('sessions').condition('uid', result.uid).execute();

  return true;
}

export async function cleanExpiredResetTokens(): Promise<number> {
  const now = new Date().toISOString();
  const conn = await import('../db/index.js').then((m) => m.getConnection());
  const result = await conn('password_resets').where('expires', '<', now).del();
  return result;
}
