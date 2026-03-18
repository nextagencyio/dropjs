/**
 * URL Redirect management — 301/302 redirect rules.
 *
 * Similar to Drupal's redirect module. Stores redirect mappings
 * and auto-creates redirects when pathauto aliases change.
 */

import { db, schema as dbSchema } from '../db/index.js';
import type { TableDefinition } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { EventBus } from './event-bus.js';
import { getAliasForSource } from './url-alias.js';
import { createLogger } from './logger.js';

const logger = createLogger('redirect');

const REDIRECT_TABLE = 'redirect';

const REDIRECT_SCHEMA: TableDefinition = {
  fields: {
    id: { type: 'serial', primary: true },
    uuid: { type: 'varchar', length: 128, nullable: false, unique: true },
    source_path: { type: 'varchar', length: 255, nullable: false },
    redirect_path: { type: 'varchar', length: 255, nullable: false },
    status_code: { type: 'int', unsigned: true, nullable: false, default: 301 },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
    enabled: { type: 'int', unsigned: true, nullable: false, default: 1 },
    count: { type: 'int', unsigned: true, nullable: false, default: 0 },
    created: { type: 'int', unsigned: true, nullable: true },
    changed: { type: 'int', unsigned: true, nullable: true },
  },
  indexes: {
    redirect__source_path: ['source_path'],
    redirect__redirect_path: ['redirect_path'],
  },
};

export interface Redirect {
  id: number;
  uuid: string;
  source_path: string;
  redirect_path: string;
  status_code: number;
  langcode: string;
  enabled: number;
  count: number;
  created: number | null;
  changed: number | null;
}

export async function ensureRedirectTable(): Promise<void> {
  await dbSchema.createTable(REDIRECT_TABLE, REDIRECT_SCHEMA);
}

/**
 * Create a redirect from source to destination.
 */
export async function createRedirect(
  sourcePath: string,
  redirectPath: string,
  statusCode = 301,
  langcode = 'en',
): Promise<Redirect> {
  // Don't create self-referencing redirects
  if (sourcePath === redirectPath) {
    throw new Error('Source and redirect paths must be different');
  }

  const now = Math.floor(Date.now() / 1000);
  const uuid = uuidv4();

  const [id] = await db.insert(REDIRECT_TABLE).values({
    uuid,
    source_path: sourcePath,
    redirect_path: redirectPath,
    status_code: statusCode,
    langcode,
    enabled: 1,
    count: 0,
    created: now,
    changed: now,
  }).execute();

  logger.info(`Created redirect: ${sourcePath} → ${redirectPath} (${statusCode})`);

  return {
    id,
    uuid,
    source_path: sourcePath,
    redirect_path: redirectPath,
    status_code: statusCode,
    langcode,
    enabled: 1,
    count: 0,
    created: now,
    changed: now,
  };
}

/**
 * Update an existing redirect.
 */
export async function updateRedirect(
  id: number,
  updates: Partial<Pick<Redirect, 'source_path' | 'redirect_path' | 'status_code' | 'langcode' | 'enabled'>>,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db.update(REDIRECT_TABLE)
    .set({ ...updates, changed: now })
    .condition('id', id)
    .execute();
}

/**
 * Delete a redirect by ID.
 */
export async function deleteRedirect(id: number): Promise<void> {
  await db.delete(REDIRECT_TABLE).condition('id', id).execute();
}

/**
 * Resolve a redirect for a given path. Returns null if no redirect found.
 * Increments the hit count when a redirect is matched.
 */
export async function resolveRedirect(
  path: string,
  langcode = 'en',
): Promise<Redirect | null> {
  const rows = await db.select(REDIRECT_TABLE)
    .condition('source_path', path)
    .condition('enabled', 1)
    .execute<Redirect>();

  // Prefer language-specific match, fall back to any
  const match = rows.find(r => r.langcode === langcode) ?? rows[0] ?? null;

  if (match) {
    // Increment count
    try {
      await db.update(REDIRECT_TABLE)
        .set({ count: match.count + 1 })
        .condition('id', match.id)
        .execute();
    } catch {
      // Non-critical — don't fail the redirect
    }
  }

  return match;
}

/**
 * List redirects with pagination and optional search.
 */
export async function listRedirects(
  options?: { limit?: number; offset?: number; search?: string },
): Promise<{ redirects: Redirect[]; total: number }> {
  // Count query
  const countQuery = db.select(REDIRECT_TABLE).fields(['id']);
  if (options?.search) {
    countQuery.condition('source_path', `%${options.search}%`, 'LIKE');
  }
  const allRows = await countQuery.execute<{ id: number }>();
  const total = allRows.length;

  // Data query
  const query = db.select(REDIRECT_TABLE)
    .orderBy('id', 'DESC');

  if (options?.search) {
    query.condition('source_path', `%${options.search}%`, 'LIKE');
  }

  if (options?.limit) {
    query.range(options.offset ?? 0, options.limit);
  }

  const redirects = await query.execute<Redirect>();
  return { redirects, total };
}

/**
 * Register hooks that auto-create redirects when URL aliases change.
 * When a pathauto alias is updated (old alias → new alias), a redirect
 * is created from the old alias to the new one.
 */
export function registerRedirectHooks(): void {
  if ((globalThis as any).__dropjs_redirect_hooks_initialized) return;
  (globalThis as any).__dropjs_redirect_hooks_initialized = true;

  // Before entity update, snapshot the current alias
  const aliasSnapshots = new Map<string, string>();

  EventBus.on('entity:presave', async (data: unknown) => {
    const entity = data as any;
    if (!entity.nid || !entity.entityType || !entity.bundle) return;

    try {
      const sourcePath = `/api/${entity.entityType}/${entity.bundle}/${entity.nid}`;
      const currentAlias = await getAliasForSource(sourcePath);
      if (currentAlias) {
        aliasSnapshots.set(`${entity.entityType}:${entity.nid}`, currentAlias);
      }
    } catch {
      // Ignore errors during snapshot
    }
  }, { priority: 5 });

  EventBus.on('entity:update', async (data: unknown) => {
    const entity = data as any;
    if (!entity.nid || !entity.entityType || !entity.bundle) return;

    const key = `${entity.entityType}:${entity.nid}`;
    const oldAlias = aliasSnapshots.get(key);
    aliasSnapshots.delete(key);

    if (!oldAlias) return;

    try {
      const sourcePath = `/api/${entity.entityType}/${entity.bundle}/${entity.nid}`;
      const newAlias = await getAliasForSource(sourcePath);

      // If alias changed, create a redirect from old → new
      if (newAlias && oldAlias !== newAlias) {
        // Check if redirect already exists
        const existing = await db.select(REDIRECT_TABLE)
          .condition('source_path', oldAlias)
          .condition('redirect_path', newAlias)
          .execute<Redirect>();

        if (existing.length === 0) {
          await createRedirect(oldAlias, newAlias, 301);
          logger.info(`Auto-redirect: ${oldAlias} → ${newAlias}`);
        }
      }
    } catch (err) {
      logger.warn(`Failed to create auto-redirect for ${key}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, { priority: 95 });
}
