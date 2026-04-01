'use server';

import { ensureInitialized } from '../../api/init';
import {
  loadUserByEmail,
  createPasswordResetToken,
  resetPasswordWithToken,
  createUser,
} from '../../auth/user';
import { sendPasswordResetEmail } from '../../core/mail';

interface ActionResult {
  success: boolean;
  error?: string;
}

export async function requestPasswordReset(email: string): Promise<ActionResult> {
  await ensureInitialized();
  if (!email) return { success: false, error: 'Email is required' };

  const user = await loadUserByEmail(email);
  if (!user || !user.uid) {
    // Don't reveal whether the email exists
    return { success: true };
  }

  const token = await createPasswordResetToken(user.uid);
  await sendPasswordResetEmail(email, token);
  return { success: true };
}

export async function resetPassword(
  token: string,
  password: string
): Promise<ActionResult> {
  await ensureInitialized();
  if (!token) return { success: false, error: 'Invalid reset link' };
  if (!password || password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' };
  }

  const ok = await resetPasswordWithToken(token, password);
  if (!ok) return { success: false, error: 'Invalid or expired reset link' };
  return { success: true };
}

export async function registerAccount(
  name: string,
  email: string,
  password: string
): Promise<ActionResult> {
  await ensureInitialized();
  if (!name || !email || !password) {
    return { success: false, error: 'All fields are required' };
  }
  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' };
  }

  // Check for existing user
  const existing = await loadUserByEmail(email);
  if (existing) {
    return { success: false, error: 'An account with this email already exists' };
  }

  try {
    await createUser({ name, email, password, status: true, roles: ['authenticated'] });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Registration failed' };
  }
}
