'use server';

import { ensureInitialized } from '../../../api/init';
import { getSessionUser } from '../../../lib/server/auth';
import {
  checkLock,
  acquireLock,
  releaseLock,
  breakLock,
  type ContentLock,
} from '../../../core/content-lock';
import { userHasPermission } from '../../../auth/access';

interface LockActionResult {
  success: boolean;
  error?: string;
  lock?: ContentLock | null;
  isOwnLock?: boolean;
}

/**
 * Check if content is locked and try to acquire a lock for the current user.
 * Returns lock status and whether the current user holds it.
 */
export async function checkAndAcquireLock(
  entityType: string,
  entityId: number,
): Promise<LockActionResult> {
  await ensureInitialized();
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'Authentication required' };

  const existingLock = await checkLock(entityType, entityId);

  if (existingLock && existingLock.uid !== user.uid) {
    // Locked by another user
    return {
      success: false,
      lock: existingLock,
      isOwnLock: false,
    };
  }

  // Acquire or renew the lock
  const result = await acquireLock(entityType, entityId, user.uid, user.name);
  return {
    success: result.success,
    lock: result.lock,
    isOwnLock: true,
  };
}

/**
 * Release the current user's lock on content.
 */
export async function releaseContentLock(
  entityType: string,
  entityId: number,
): Promise<LockActionResult> {
  await ensureInitialized();
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'Authentication required' };

  await releaseLock(entityType, entityId, user.uid);
  return { success: true, lock: null };
}

/**
 * Force-break a lock (requires admin permission).
 */
export async function forceBreakLock(
  entityType: string,
  entityId: number,
): Promise<LockActionResult> {
  await ensureInitialized();
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'Authentication required' };

  const allowed = await userHasPermission(user, 'administer nodes');
  if (!allowed) return { success: false, error: 'Permission denied' };

  await breakLock(entityType, entityId);

  // Now acquire the lock for this user
  const result = await acquireLock(entityType, entityId, user.uid, user.name);
  return {
    success: true,
    lock: result.lock,
    isOwnLock: true,
  };
}
