/**
 * Queue system — deferred task processing.
 *
 * Provides a simple, persistent queue backed by SQLite. Queue items are
 * stored in the `queue` table and processed by workers.
 *
 * Compatible with Drupal's Queue API concepts:
 * - createItem(): Add work to the queue
 * - claimItem(): Claim the next item for processing (with lease time)
 * - deleteItem(): Remove a completed item
 * - releaseItem(): Return an item to the queue after failure
 */

import { db, schema as dbSchema } from '../db/index.js';
import { createLogger } from './logger.js';

const logger = createLogger('queue');

const QUEUE_TABLE = {
  fields: {
    item_id: { type: 'serial' as const, primary: true },
    name: { type: 'varchar' as const, length: 255, nullable: false },
    data: { type: 'text' as const, nullable: true },
    expire: { type: 'int' as const, nullable: false, default: 0 },
    created: { type: 'int' as const, nullable: false },
  },
  indexes: {
    queue_name_expire: ['name', 'expire'],
  },
};

export interface QueueItem {
  item_id: number;
  name: string;
  data: unknown;
  expire: number;
  created: number;
}

export type QueueWorker = (data: unknown) => Promise<void>;

const workers = new Map<string, QueueWorker>();
let processingInterval: ReturnType<typeof setInterval> | null = null;

export async function ensureQueueTable(): Promise<void> {
  await dbSchema.createTable('queue', QUEUE_TABLE);
}

/**
 * Add an item to a named queue.
 */
export async function createQueueItem(
  name: string,
  data: unknown
): Promise<number> {
  const serialized = JSON.stringify(data);
  const created = Math.floor(Date.now() / 1000);

  const result = await db.insert('queue').values({
    name,
    data: serialized,
    expire: 0,
    created,
  }).execute();

  return result[0] as number;
}

/**
 * Claim the next available item from a queue.
 * Sets an expiry lease so other workers won't pick it up.
 */
export async function claimQueueItem(
  name: string,
  leaseSeconds: number = 30
): Promise<QueueItem | null> {
  const now = Math.floor(Date.now() / 1000);
  const expire = now + leaseSeconds;

  // Find the oldest unclaimed item (expire = 0 or expired lease)
  const rows = await db
    .select('queue')
    .fields(['item_id', 'name', 'data', 'expire', 'created'])
    .condition('name', name)
    .condition('expire', now, '<=')
    .orderBy('created', 'ASC')
    .range(0, 1)
    .execute<{ item_id: number; name: string; data: string | null; expire: number; created: number }>();

  if (rows.length === 0) return null;

  const row = rows[0];

  // Claim it by setting the expire
  await db
    .update('queue')
    .set({ expire })
    .condition('item_id', row.item_id)
    .execute();

  return {
    item_id: row.item_id,
    name: row.name,
    data: row.data ? JSON.parse(row.data) : null,
    expire,
    created: row.created,
  };
}

/**
 * Delete a queue item after successful processing.
 */
export async function deleteQueueItem(itemId: number): Promise<void> {
  await db.delete('queue').condition('item_id', itemId).execute();
}

/**
 * Release a claimed item back to the queue (on failure).
 */
export async function releaseQueueItem(itemId: number): Promise<void> {
  await db.update('queue').set({ expire: 0 }).condition('item_id', itemId).execute();
}

/**
 * Get the number of items in a named queue.
 */
export async function getQueueCount(name: string): Promise<number> {
  const rows = await db
    .select('queue')
    .fields(['item_id'])
    .condition('name', name)
    .execute<{ item_id: number }>();
  return rows.length;
}

/**
 * Delete all items from a named queue.
 */
export async function purgeQueue(name: string): Promise<void> {
  await db.delete('queue').condition('name', name).execute();
}

/**
 * List all queue names with their item counts.
 */
export async function listQueues(): Promise<Array<{ name: string; count: number }>> {
  const rows = await db
    .select('queue')
    .fields(['name', 'item_id'])
    .execute<{ name: string; item_id: number }>();

  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.name, (counts.get(row.name) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
}

// ── Worker registration ──────────────────────────────────────────────────

/**
 * Register a worker function for a named queue.
 */
export function registerQueueWorker(name: string, worker: QueueWorker): void {
  workers.set(name, worker);
}

/**
 * Unregister a queue worker.
 */
export function unregisterQueueWorker(name: string): void {
  workers.delete(name);
}

/**
 * Process one item from a named queue using its registered worker.
 * Returns true if an item was processed.
 */
export async function processQueueItem(name: string): Promise<boolean> {
  const worker = workers.get(name);
  if (!worker) return false;

  const item = await claimQueueItem(name);
  if (!item) return false;

  try {
    await worker(item.data);
    await deleteQueueItem(item.item_id);
    return true;
  } catch (err) {
    logger.error(`Queue worker "${name}" failed for item ${item.item_id}`, { error: String(err) });
    await releaseQueueItem(item.item_id);
    return false;
  }
}

/**
 * Process all available items in a named queue.
 * Returns the number of items processed.
 */
export async function processQueue(name: string, maxItems: number = 100): Promise<number> {
  let processed = 0;
  while (processed < maxItems) {
    const didWork = await processQueueItem(name);
    if (!didWork) break;
    processed++;
  }
  return processed;
}

/**
 * Start the background queue processor.
 * Periodically checks all registered queues and processes items.
 */
export function startQueueProcessor(intervalMs: number = 10_000): void {
  if (processingInterval) return;

  processingInterval = setInterval(async () => {
    for (const name of workers.keys()) {
      try {
        await processQueue(name, 10);
      } catch (err) {
        logger.error(`Queue processor error for "${name}"`, { error: String(err) });
      }
    }
  }, intervalMs);

  logger.info(`Queue processor started (interval: ${intervalMs}ms)`);
}

/**
 * Stop the background queue processor.
 */
export function stopQueueProcessor(): void {
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
    logger.info('Queue processor stopped');
  }
}
