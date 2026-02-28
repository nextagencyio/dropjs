/**
 * Scheduled Publishing system — schedule content to be published or unpublished
 * at a specific date/time.
 *
 * Integrates with the existing workflow/moderation and cron systems.
 * Uses the State API (key_value table) to store schedule entries as runtime data.
 */

import { db } from '../db/index.js';
import { stateGet, stateSet, stateDelete } from './state.js';
import { Entity } from './entity.js';
import { registerCronJob } from './cron.js';
import { createLogger } from './logger.js';
import { unserialize } from 'php-serialize';

const logger = createLogger('scheduler');

const SCHEDULER_COLLECTION = 'scheduler';

export interface ScheduledTransition {
  entity_type: string;
  entity_id: number;
  transition: 'publish' | 'unpublish';
  scheduled_date: string; // ISO 8601 date string
  user_id?: number;
  created: string; // ISO 8601 date string when the schedule was created
}

/**
 * Build the state key for a scheduled transition.
 */
function scheduleKey(entityType: string, entityId: number): string {
  return `scheduler.${entityType}.${entityId}`;
}

/**
 * Schedule a workflow transition for an entity at a future date/time.
 */
export async function scheduleTransition(
  entityType: string,
  entityId: number,
  transition: 'publish' | 'unpublish',
  scheduledDate: Date | string,
  userId?: number
): Promise<ScheduledTransition> {
  // Validate the entity exists
  const entity = await Entity.load(entityType, entityId);
  if (!entity) {
    throw new Error(`Entity ${entityType}:${entityId} not found`);
  }

  const dateStr = typeof scheduledDate === 'string'
    ? scheduledDate
    : scheduledDate.toISOString();

  // Validate the date is in the future
  if (new Date(dateStr) <= new Date()) {
    throw new Error('Scheduled date must be in the future');
  }

  const entry: ScheduledTransition = {
    entity_type: entityType,
    entity_id: entityId,
    transition,
    scheduled_date: dateStr,
    user_id: userId,
    created: new Date().toISOString(),
  };

  const key = scheduleKey(entityType, entityId);
  await stateSet(key, entry, SCHEDULER_COLLECTION);

  logger.info(`Scheduled ${transition} for ${entityType}:${entityId} at ${dateStr}`);
  return entry;
}

/**
 * Cancel a scheduled transition for an entity.
 */
export async function cancelScheduledTransition(
  entityType: string,
  entityId: number
): Promise<boolean> {
  const key = scheduleKey(entityType, entityId);
  const existing = await stateGet<ScheduledTransition>(key, undefined, SCHEDULER_COLLECTION);

  if (!existing) {
    return false;
  }

  await stateDelete(key, SCHEDULER_COLLECTION);
  logger.info(`Cancelled scheduled transition for ${entityType}:${entityId}`);
  return true;
}

/**
 * Get the scheduled transition for an entity.
 */
export async function getScheduledTransition(
  entityType: string,
  entityId: number
): Promise<ScheduledTransition | null> {
  const key = scheduleKey(entityType, entityId);
  const entry = await stateGet<ScheduledTransition>(key, undefined, SCHEDULER_COLLECTION);
  return entry ?? null;
}

/**
 * Get all upcoming scheduled transitions sorted by scheduled date.
 */
export async function getUpcomingScheduledTransitions(
  limit: number = 50
): Promise<ScheduledTransition[]> {
  // Query all scheduler entries from key_value table
  const rows = await db
    .select('key_value')
    .fields(['name', 'value'])
    .condition('collection', SCHEDULER_COLLECTION)
    .condition('name', 'scheduler.%', 'LIKE')
    .execute<{ name: string; value: Buffer | string | null }>();

  const entries: ScheduledTransition[] = [];
  for (const row of rows) {
    if (row.value === null) continue;
    const str = typeof row.value === 'string' ? row.value : row.value.toString('utf-8');
    try {
      const entry = unserialize(str) as ScheduledTransition;
      // Only include future transitions
      if (new Date(entry.scheduled_date) > new Date()) {
        entries.push(entry);
      }
    } catch {
      // Skip undeserializable values
    }
  }

  // Sort by scheduled_date ascending
  entries.sort((a, b) =>
    new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
  );

  return entries.slice(0, limit);
}

/**
 * Process all scheduled transitions that are due (scheduledDate <= now).
 * For each due transition:
 *   - Load the entity
 *   - Set entity.status based on transition type
 *   - Save the entity
 *   - Delete the schedule entry
 */
export async function processScheduledTransitions(): Promise<{
  processed: string[];
  errors: string[];
}> {
  const now = new Date();
  const processed: string[] = [];
  const errors: string[] = [];

  // Query all scheduler entries from key_value table
  const rows = await db
    .select('key_value')
    .fields(['name', 'value'])
    .condition('collection', SCHEDULER_COLLECTION)
    .condition('name', 'scheduler.%', 'LIKE')
    .execute<{ name: string; value: Buffer | string | null }>();

  for (const row of rows) {
    if (row.value === null) continue;
    const str = typeof row.value === 'string' ? row.value : row.value.toString('utf-8');

    let entry: ScheduledTransition;
    try {
      entry = unserialize(str) as ScheduledTransition;
    } catch {
      continue;
    }

    // Only process entries where scheduled_date <= now
    if (new Date(entry.scheduled_date) > now) {
      continue;
    }

    try {
      // Load the entity
      const entity = await Entity.load(entry.entity_type, entry.entity_id);
      if (!entity) {
        const msg = `Entity ${entry.entity_type}:${entry.entity_id} not found, removing schedule`;
        logger.warn(msg);
        await stateDelete(row.name, SCHEDULER_COLLECTION);
        errors.push(msg);
        continue;
      }

      // Apply the transition
      if (entry.transition === 'publish') {
        entity.status = true;
      } else if (entry.transition === 'unpublish') {
        entity.status = false;
      }

      await entity.save();

      // Delete the schedule entry
      await stateDelete(row.name, SCHEDULER_COLLECTION);

      const key = `${entry.entity_type}:${entry.entity_id}`;
      processed.push(key);
      logger.info(
        `Processed scheduled ${entry.transition} for ${key}`
      );
    } catch (err) {
      const msg = `Failed to process scheduled transition for ${entry.entity_type}:${entry.entity_id}: ${err instanceof Error ? err.message : String(err)}`;
      logger.error(msg);
      errors.push(msg);
    }
  }

  if (processed.length > 0) {
    logger.info(`Scheduler processed ${processed.length} transition(s)`);
  }

  return { processed, errors };
}

/**
 * Register the scheduler cron job that runs every minute to process due transitions.
 */
export function registerSchedulerCronJob(): void {
  registerCronJob('scheduler', 60 * 1000, async () => {
    await processScheduledTransitions();
  });
}
