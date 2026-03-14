import 'server-only';
import { redirect } from 'next/navigation';
import { auth } from '../../../auth';
import { ensureInitialized } from '../../api/init';
import { loadUser, type UserData } from '../../auth/user';
import { userHasPermission } from '../../auth/access';

export type { UserData } from '../../auth/user';

/**
 * Get the current session user via NextAuth.
 * Returns null if not authenticated.
 */
export async function getSessionUser(): Promise<UserData | null> {
  const session = await auth();
  if (!session?.user?.uid) return null;

  await ensureInitialized();
  const user = await loadUser(session.user.uid);
  if (!user || user.status === false) return null;
  return user;
}

/**
 * Require an authenticated user. Redirects to /login if not authenticated.
 */
export async function requireAuth(): Promise<UserData> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}

/**
 * Require admin permission. Redirects to /login or throws on access denied.
 */
export async function requireAdmin(): Promise<UserData> {
  const user = await requireAuth();
  const isAdmin = await userHasPermission(user, 'administer site');
  if (!isAdmin) {
    throw new Error('Access denied');
  }
  return user;
}

/**
 * Require a specific permission. Redirects to /login or throws on access denied.
 */
export async function requirePermission(permission: string): Promise<UserData> {
  const user = await requireAuth();
  const allowed = await userHasPermission(user, permission);
  if (!allowed) {
    throw new Error('Access denied');
  }
  return user;
}
