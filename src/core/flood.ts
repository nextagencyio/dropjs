/**
 * Flood control service — Drupal-compatible rate limiting.
 *
 * Uses the `flood` table to track events per identifier (IP, user, etc.)
 * and enforce limits. Matches Drupal's flood API:
 *   - flood.register(event, identifier)
 *   - flood.isAllowed(event, threshold, window, identifier)
 *   - flood.clear(event, identifier)
 */

import { db, schema as dbSchema } from '../db/index.js';
import { DRUPAL_FLOOD_TABLE } from './drupal-schema.js';
import { createLogger } from './logger.js';

const logger = createLogger('flood');

/**
 * Ensure the flood table exists.
 */
export async function ensureFloodTable(): Promise<void> {
  await dbSchema.createTable('flood', DRUPAL_FLOOD_TABLE);
}

/**
 * Register a flood event for a given identifier.
 * @param event  Event name (e.g. 'user.failed_login_ip')
 * @param identifier  Usually IP address or uid
 * @param window  Time window in seconds (default 3600 = 1 hour)
 */
export async function floodRegister(
  event: string,
  identifier: string,
  window: number = 3600,
): Promise<void> {
  try {
    const now = Math.floor(Date.now() / 1000);
    await db.insert('flood').values({
      event,
      identifier,
      timestamp: now,
      expiration: now + window,
    }).execute();
  } catch (err: any) {
    if (err?.message?.includes('no such table')) {
      logger.warn('Flood table not found — skipping register');
      return;
    }
    throw err;
  }
}

/**
 * Check if an event is allowed for the given identifier.
 * @param event  Event name
 * @param threshold  Max number of events in the window
 * @param window  Time window in seconds (default 3600)
 * @param identifier  Usually IP address or uid
 * @returns true if allowed (under threshold), false if blocked
 */
export async function floodIsAllowed(
  event: string,
  threshold: number,
  window: number = 3600,
  identifier?: string,
): Promise<boolean> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const cutoff = now - window;

    let query = db
      .select('flood')
      .fields(['fid'])
      .condition('event', event)
      .condition('timestamp', cutoff, '>');

    if (identifier) {
      query = query.condition('identifier', identifier);
    }

    const results = await query.execute<{ fid: number }>();
    return results.length < threshold;
  } catch (err: any) {
    if (err?.message?.includes('no such table')) {
      // Table not yet created — allow the request
      return true;
    }
    throw err;
  }
}

/**
 * Clear flood events for a specific event+identifier combination.
 */
export async function floodClear(
  event: string,
  identifier?: string,
): Promise<void> {
  try {
    let query = db.delete('flood').condition('event', event);
    if (identifier) {
      query = query.condition('identifier', identifier);
    }
    await query.execute();
  } catch (err: any) {
    if (err?.message?.includes('no such table')) {
      return;
    }
    throw err;
  }
}

/**
 * Purge expired flood entries. Should be called by cron.
 */
export async function floodPurgeExpired(): Promise<number> {
  const now = Math.floor(Date.now() / 1000);
  const result = await db
    .delete('flood')
    .condition('expiration', now, '<')
    .execute();
  const count = typeof result === 'number' ? result : 0;
  if (count > 0) {
    logger.info(`Purged ${count} expired flood entries`);
  }
  return count;
}

/**
 * Register a cron job to purge expired flood entries.
 */
export function registerFloodCronJob(): void {
  // Import dynamically to avoid circular deps
  import('./cron.js').then(({ registerCronJob }) => {
    registerCronJob('flood_cleanup', 15 * 60 * 1000, async () => {
      await floodPurgeExpired();
    });
  });
}
