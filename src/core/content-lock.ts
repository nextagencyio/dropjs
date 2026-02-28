/**
 * Content Lock API — prevents simultaneous editing conflicts.
 *
 * Uses the State API (key_value table) with key pattern
 * `content_lock.{entity_type}.{entity_id}` to store lock data.
 *
 * Default lock duration is 15 minutes. Expired locks are automatically
 * cleaned up via a registered cron job.
 */

import { stateGet, stateSet, stateDelete, stateDeletePrefix } from './state.js';
import { registerCronJob } from './cron.js';
import { createLogger } from './logger.js';

const logger = createLogger('content-lock');

const LOCK_COLLECTION = 'content_lock';
const DEFAULT_LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export interface ContentLock {
  uid: number;
  name: string;
  locked: number;   // unix timestamp (seconds)
  expires: number;   // unix timestamp (seconds)
}

export interface LockResult {
  success: boolean;
  lock: ContentLock;
}

function lockKey(entityType: string, entityId: number): string {
  return `${entityType}.${entityId}`;
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Acquire an edit lock on a piece of content.
 *
 * Returns `{ success: true, lock }` if the lock was acquired (or an existing
 * lock by this user was renewed). Returns `{ success: false, lock }` if the
 * content is currently locked by another user and the lock has not expired.
 */
export async function acquireLock(
  entityType: string,
  entityId: number,
  uid: number,
  userName: string,
  durationMs: number = DEFAULT_LOCK_DURATION_MS,
): Promise<LockResult> {
  const key = lockKey(entityType, entityId);
  const existing = await stateGet<ContentLock>(key, undefined, LOCK_COLLECTION);
  const now = nowSeconds();

  // If there's an existing, non-expired lock by a different user, reject.
  if (existing && existing.expires > now && existing.uid !== uid) {
    return { success: false, lock: existing };
  }

  const lock: ContentLock = {
    uid,
    name: userName,
    locked: now,
    expires: now + Math.floor(durationMs / 1000),
  };

  await stateSet(key, lock, LOCK_COLLECTION);
  return { success: true, lock };
}

/**
 * Release an edit lock. Only the lock owner can release their own lock.
 * Returns `true` if the lock was released, `false` if no lock exists or
 * the caller is not the owner.
 */
export async function releaseLock(
  entityType: string,
  entityId: number,
  uid: number,
): Promise<boolean> {
  const key = lockKey(entityType, entityId);
  const existing = await stateGet<ContentLock>(key, undefined, LOCK_COLLECTION);

  if (!existing) return false;
  if (existing.uid !== uid) return false;

  await stateDelete(key, LOCK_COLLECTION);
  return true;
}

/**
 * Check if content is currently locked.
 * Returns the lock if active and not expired, or `null` otherwise.
 */
export async function checkLock(
  entityType: string,
  entityId: number,
): Promise<ContentLock | null> {
  const key = lockKey(entityType, entityId);
  const existing = await stateGet<ContentLock>(key, undefined, LOCK_COLLECTION);

  if (!existing) return null;
  if (existing.expires <= nowSeconds()) {
    // Lock has expired — clean it up
    await stateDelete(key, LOCK_COLLECTION);
    return null;
  }

  return existing;
}

/**
 * Renew (extend) an existing lock. Only the lock owner can renew.
 * Returns the updated lock, or `null` if no lock exists / caller is not the owner.
 */
export async function renewLock(
  entityType: string,
  entityId: number,
  uid: number,
  durationMs: number = DEFAULT_LOCK_DURATION_MS,
): Promise<ContentLock | null> {
  const key = lockKey(entityType, entityId);
  const existing = await stateGet<ContentLock>(key, undefined, LOCK_COLLECTION);

  if (!existing) return null;
  if (existing.uid !== uid) return null;

  const now = nowSeconds();
  const updated: ContentLock = {
    ...existing,
    expires: now + Math.floor(durationMs / 1000),
  };

  await stateSet(key, updated, LOCK_COLLECTION);
  return updated;
}

/**
 * Force-break a lock (admin operation).
 * Returns the broken lock info, or `null` if no lock exists.
 */
export async function breakLock(
  entityType: string,
  entityId: number,
): Promise<ContentLock | null> {
  const key = lockKey(entityType, entityId);
  const existing = await stateGet<ContentLock>(key, undefined, LOCK_COLLECTION);

  if (!existing) return null;

  await stateDelete(key, LOCK_COLLECTION);
  logger.info(`Lock broken for ${entityType}:${entityId} (was held by uid ${existing.uid})`);
  return existing;
}

/**
 * Get all active (non-expired) content locks for monitoring.
 */
export async function getActiveLocks(): Promise<Array<ContentLock & { entity_type: string; entity_id: number }>> {
  // We need to scan the key_value table for all content_lock entries.
  // The State API doesn't expose a "get all in collection" so we query directly.
  const { db } = await import('../db/index.js');
  const { unserialize } = await import('php-serialize');

  const rows = await db
    .select('key_value')
    .fields(['name', 'value'])
    .condition('collection', LOCK_COLLECTION)
    .execute<{ name: string; value: Buffer | string | null }>();

  const now = nowSeconds();
  const locks: Array<ContentLock & { entity_type: string; entity_id: number }> = [];

  for (const row of rows) {
    if (!row.value) continue;
    const str = typeof row.value === 'string' ? row.value : row.value.toString('utf-8');
    try {
      const lock = unserialize(str) as ContentLock;
      if (lock.expires > now) {
        // Parse entity_type and entity_id from the key (e.g. "node.123")
        const dotIndex = row.name.lastIndexOf('.');
        if (dotIndex === -1) continue;
        const entityType = row.name.substring(0, dotIndex);
        const entityId = parseInt(row.name.substring(dotIndex + 1), 10);
        if (isNaN(entityId)) continue;

        locks.push({
          ...lock,
          entity_type: entityType,
          entity_id: entityId,
        });
      }
    } catch {
      // Skip undeserializable values
    }
  }

  return locks;
}

/**
 * Remove all expired locks (cron cleanup).
 */
export async function cleanExpiredLocks(): Promise<number> {
  const { db } = await import('../db/index.js');
  const { unserialize } = await import('php-serialize');

  const rows = await db
    .select('key_value')
    .fields(['name', 'value'])
    .condition('collection', LOCK_COLLECTION)
    .execute<{ name: string; value: Buffer | string | null }>();

  const now = nowSeconds();
  let cleaned = 0;

  for (const row of rows) {
    if (!row.value) {
      await stateDelete(row.name, LOCK_COLLECTION);
      cleaned++;
      continue;
    }
    const str = typeof row.value === 'string' ? row.value : row.value.toString('utf-8');
    try {
      const lock = unserialize(str) as ContentLock;
      if (lock.expires <= now) {
        await stateDelete(row.name, LOCK_COLLECTION);
        cleaned++;
      }
    } catch {
      // Remove corrupted entries
      await stateDelete(row.name, LOCK_COLLECTION);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.info(`Cleaned ${cleaned} expired content locks`);
  }

  return cleaned;
}

/**
 * Register the cron job that cleans up expired content locks every 5 minutes.
 */
export function registerLockCleanupCronJob(): void {
  registerCronJob('content_lock_cleanup', 5 * 60 * 1000, async () => {
    await cleanExpiredLocks();
  });
}
