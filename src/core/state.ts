/**
 * State API — runtime key-value store.
 *
 * Unlike Config (which is PHP-serialized and designed for deployment-synced
 * settings), State stores runtime values that are specific to this
 * environment: last cron run, system flags, temporary counters, etc.
 *
 * Backed by the Drupal-compatible `key_value` table.
 */

import { db, schema as dbSchema } from '../db/index.js';
import { DRUPAL_KEY_VALUE_TABLE } from './drupal-schema.js';
import { serialize, unserialize } from 'php-serialize';

const DEFAULT_COLLECTION = 'state';

export async function ensureKeyValueTable(): Promise<void> {
  await dbSchema.createTable('key_value', DRUPAL_KEY_VALUE_TABLE);
}

/**
 * Get a state value. Returns the default if not set.
 */
export async function stateGet<T = unknown>(
  key: string,
  defaultValue?: T,
  collection: string = DEFAULT_COLLECTION
): Promise<T | undefined> {
  const rows = await db
    .select('key_value')
    .fields(['value'])
    .condition('collection', collection)
    .condition('name', key)
    .execute<{ value: Buffer | string | null }>();

  if (rows.length === 0 || rows[0].value === null) {
    return defaultValue;
  }

  const raw = rows[0].value;
  const str = typeof raw === 'string' ? raw : raw.toString('utf-8');
  try {
    return unserialize(str) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Set a state value.
 */
export async function stateSet(
  key: string,
  value: unknown,
  collection: string = DEFAULT_COLLECTION
): Promise<void> {
  const serialized = Buffer.from(serialize(value));

  const existing = await db
    .select('key_value')
    .fields(['name'])
    .condition('collection', collection)
    .condition('name', key)
    .execute<{ name: string }>();

  if (existing.length > 0) {
    await db
      .update('key_value')
      .set({ value: serialized })
      .condition('collection', collection)
      .condition('name', key)
      .execute();
  } else {
    await db.insert('key_value').values({
      collection,
      name: key,
      value: serialized,
    }).execute();
  }
}

/**
 * Delete a state value.
 */
export async function stateDelete(
  key: string,
  collection: string = DEFAULT_COLLECTION
): Promise<void> {
  await db
    .delete('key_value')
    .condition('collection', collection)
    .condition('name', key)
    .execute();
}

/**
 * Get multiple state values at once.
 */
export async function stateGetMultiple(
  keys: string[],
  collection: string = DEFAULT_COLLECTION
): Promise<Record<string, unknown>> {
  if (keys.length === 0) return {};

  const rows = await db
    .select('key_value')
    .fields(['name', 'value'])
    .condition('collection', collection)
    .condition('name', keys, 'IN')
    .execute<{ name: string; value: Buffer | string | null }>();

  const result: Record<string, unknown> = {};
  for (const row of rows) {
    if (row.value === null) continue;
    const str = typeof row.value === 'string' ? row.value : row.value.toString('utf-8');
    try {
      result[row.name] = unserialize(str);
    } catch {
      // skip undeserializable values
    }
  }
  return result;
}

/**
 * Delete all state values in a collection with a given prefix.
 */
export async function stateDeletePrefix(
  prefix: string,
  collection: string = DEFAULT_COLLECTION
): Promise<void> {
  await db
    .delete('key_value')
    .condition('collection', collection)
    .condition('name', `${prefix}%`, 'LIKE')
    .execute();
}
