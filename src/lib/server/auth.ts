import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ensureInitialized } from '../../api/init';
import { validateToken } from '../../auth/session';
import { loadUser, type UserData } from '../../auth/user';
import { userHasPermission } from '../../auth/access';

export type { UserData } from '../../auth/user';

/**
 * Get the current session user from the HttpOnly cookie.
 * Returns null if not authenticated.
 */
export async function getSessionUser(): Promise<UserData | null> {
  await ensureInitialized();
  const cookieStore = await cookies();
  const token = cookieStore.get('dropjs_session')?.value;
  if (!token) return null;

  const session = await validateToken(token);
  if (!session) return null;

  const user = await loadUser(session.uid);
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
