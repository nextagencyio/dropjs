/**
 * Shortcuts — user-specific admin shortcut links for DropJS.
 *
 * Inspired by Drupal's Shortcut module. Each user can have a personal set
 * of shortcut links displayed in the admin toolbar for quick access to
 * frequently-used pages.
 *
 * Tables: `shortcuts`, `shortcut_sets`
 */

import { db, schema as dbSchema } from '../db/index.js';
import type { TableDefinition } from '../db/index.js';
import { createLogger } from './logger.js';

const logger = createLogger('core:shortcuts');

// ── Table Definitions ──────────────────────────────────────────────────────

const SHORTCUT_SETS_TABLE = 'shortcut_sets';
const SHORTCUTS_TABLE = 'shortcuts';

const SHORTCUT_SETS_TABLE_DEFINITION: TableDefinition = {
  fields: {
    id: { type: 'serial', primary: true },
    name: { type: 'varchar', length: 128, nullable: false, unique: true },
    label: { type: 'varchar', length: 255, nullable: false },
  },
  indexes: {},
};

const SHORTCUTS_TABLE_DEFINITION: TableDefinition = {
  fields: {
    id: { type: 'serial', primary: true },
    uid: { type: 'int', nullable: false },
    title: { type: 'varchar', length: 255, nullable: false },
    path: { type: 'varchar', length: 512, nullable: false },
    weight: { type: 'int', nullable: false, default: 0 },
  },
  indexes: {
    shortcuts__uid: ['uid'],
    shortcuts__weight: ['weight'],
  },
};

// ── Types ──────────────────────────────────────────────────────────────────

export interface ShortcutSet {
  id: number;
  name: string;
  label: string;
}

export interface Shortcut {
  id: number;
  uid: number;
  title: string;
  path: string;
  weight: number;
}

// ── Schema Setup ───────────────────────────────────────────────────────────

/**
 * Ensure both shortcut tables exist in the database.
 */
export async function ensureShortcutTables(): Promise<void> {
  await dbSchema.createTable(SHORTCUT_SETS_TABLE, SHORTCUT_SETS_TABLE_DEFINITION);
  await dbSchema.createTable(SHORTCUTS_TABLE, SHORTCUTS_TABLE_DEFINITION);
  logger.debug('Shortcut tables ensured');
}

// ── Shortcut Sets ──────────────────────────────────────────────────────────

/**
 * Create a new shortcut set.
 */
export async function createShortcutSet(name: string, label: string): Promise<ShortcutSet> {
  const [id] = await db.insert(SHORTCUT_SETS_TABLE).values({ name, label }).execute();
  logger.debug('Shortcut set created', { id, name });
  return { id, name, label };
}

/**
 * List all shortcut sets.
 */
export async function listShortcutSets(): Promise<ShortcutSet[]> {
  const rows = await db
    .select(SHORTCUT_SETS_TABLE)
    .fields(['id', 'name', 'label'])
    .orderBy('name', 'ASC')
    .execute<ShortcutSet>();

  return rows;
}

/**
 * Delete a shortcut set by machine name.
 */
export async function deleteShortcutSet(name: string): Promise<void> {
  await db.delete(SHORTCUT_SETS_TABLE).condition('name', name).execute();
  logger.debug('Shortcut set deleted', { name });
}

// ── Shortcuts CRUD ─────────────────────────────────────────────────────────

/**
 * Add a shortcut for a user.
 */
export async function addShortcut(
  uid: number,
  title: string,
  path: string,
  weight: number = 0,
): Promise<Shortcut> {
  const [id] = await db.insert(SHORTCUTS_TABLE).values({
    uid,
    title,
    path,
    weight,
  }).execute();

  logger.debug('Shortcut added', { id, uid, path });
  return { id, uid, title, path, weight };
}

/**
 * List all shortcuts for a user, ordered by weight.
 */
export async function listShortcuts(uid: number): Promise<Shortcut[]> {
  const rows = await db
    .select(SHORTCUTS_TABLE)
    .fields(['id', 'uid', 'title', 'path', 'weight'])
    .condition('uid', uid)
    .orderBy('weight', 'ASC')
    .execute<Shortcut>();

  return rows;
}

/**
 * Update a shortcut's properties.
 */
export async function updateShortcut(
  id: number,
  data: Partial<{ title: string; path: string; weight: number }>,
): Promise<Shortcut | null> {
  const existing = await db
    .select(SHORTCUTS_TABLE)
    .fields(['id', 'uid', 'title', 'path', 'weight'])
    .condition('id', id)
    .execute<Shortcut>();

  if (existing.length === 0) return null;

  const updateFields: Record<string, unknown> = {};
  if (data.title !== undefined) updateFields.title = data.title;
  if (data.path !== undefined) updateFields.path = data.path;
  if (data.weight !== undefined) updateFields.weight = data.weight;

  if (Object.keys(updateFields).length > 0) {
    await db
      .update(SHORTCUTS_TABLE)
      .set(updateFields)
      .condition('id', id)
      .execute();
  }

  // Reload and return the updated record
  const updated = await db
    .select(SHORTCUTS_TABLE)
    .fields(['id', 'uid', 'title', 'path', 'weight'])
    .condition('id', id)
    .execute<Shortcut>();

  logger.debug('Shortcut updated', { id });
  return updated.length > 0 ? updated[0] : null;
}

/**
 * Delete a shortcut by ID.
 */
export async function deleteShortcut(id: number): Promise<void> {
  await db.delete(SHORTCUTS_TABLE).condition('id', id).execute();
  logger.debug('Shortcut deleted', { id });
}

/**
 * Reorder a user's shortcuts. Sets the weight of each shortcut ID in the
 * provided array to its index position.
 */
export async function reorderShortcuts(uid: number, orderedIds: number[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(SHORTCUTS_TABLE)
      .set({ weight: i })
      .condition('id', orderedIds[i])
      .condition('uid', uid)
      .execute();
  }

  logger.debug('Shortcuts reordered', { uid, count: orderedIds.length });
}

// ── Default Shortcuts ──────────────────────────────────────────────────────

/**
 * Returns the default shortcuts that should be created for new users.
 */
export function getDefaultShortcuts(): Array<{ title: string; path: string }> {
  return [
    { title: 'Dashboard', path: '/' },
    { title: 'Content', path: '/content' },
    { title: 'Add content', path: '/node/add' },
    { title: 'Structure', path: '/structure/types' },
  ];
}
