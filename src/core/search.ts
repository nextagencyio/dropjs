/**
 * Full-text search using SQLite FTS5.
 *
 * Maintains an FTS5 virtual table that indexes entity titles and body text.
 * Entities are indexed on create/update and removed on delete via EventBus hooks.
 */

import { db } from '../db/index.js';
import { EventBus } from './event-bus.js';
import type { Entity } from './entity.js';
import { createLogger } from './logger.js';

const logger = createLogger('search');

// Stored on globalThis for webpack module sharing.
const gSearch = globalThis as unknown as { __dropjs_fts_available?: boolean };

function getFtsAvailable(): boolean { return gSearch.__dropjs_fts_available ?? false; }
function setFtsAvailable(v: boolean) { gSearch.__dropjs_fts_available = v; }

/**
 * Create the FTS5 virtual table if it doesn't already exist.
 * Falls back gracefully if FTS5 is not available.
 */
export async function ensureSearchIndex(): Promise<boolean> {
  try {
    const conn = (await import('../db/index.js')).getConnection();
    await conn.raw(`
      CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
        entity_type,
        bundle,
        entity_id,
        title,
        body,
        tokenize='porter unicode61'
      )
    `);
    setFtsAvailable(true);
    logger.info('FTS5 search index ready');
    return true;
  } catch (err) {
    logger.warn('FTS5 not available, falling back to LIKE search', { error: String(err) });
    setFtsAvailable(false);
    return false;
  }
}

/**
 * Index a single entity in the search index.
 */
export async function indexEntity(
  entityType: string,
  bundle: string,
  entityId: number,
  title: string,
  body?: string
): Promise<void> {
  if (!getFtsAvailable()) return;

  try {
    const conn = (await import('../db/index.js')).getConnection();
    // Remove existing entry
    await conn.raw(
      `DELETE FROM search_index WHERE entity_type = ? AND entity_id = ?`,
      [entityType, entityId]
    );
    // Insert new entry
    await conn.raw(
      `INSERT INTO search_index (entity_type, bundle, entity_id, title, body) VALUES (?, ?, ?, ?, ?)`,
      [entityType, bundle, entityId, title, body ?? '']
    );
  } catch (err) {
    logger.error('Failed to index entity', { entityType, entityId, error: String(err) });
  }
}

/**
 * Remove an entity from the search index.
 */
export async function removeFromIndex(
  entityType: string,
  entityId: number
): Promise<void> {
  if (!getFtsAvailable()) return;

  try {
    const conn = (await import('../db/index.js')).getConnection();
    await conn.raw(
      `DELETE FROM search_index WHERE entity_type = ? AND entity_id = ?`,
      [entityType, entityId]
    );
  } catch (err) {
    logger.error('Failed to remove entity from search index', { entityType, entityId, error: String(err) });
  }
}

/**
 * Search the FTS5 index. Returns matching entity references.
 */
export async function searchIndex(
  query: string,
  options: {
    entityType?: string;
    bundle?: string;
    limit?: number;
  } = {}
): Promise<Array<{
  entity_type: string;
  bundle: string;
  entity_id: number;
  title: string;
  rank: number;
}>> {
  if (!getFtsAvailable()) return [];

  const limit = options.limit ?? 20;

  try {
    const conn = (await import('../db/index.js')).getConnection();

    // Build FTS5 query — escape special characters
    const safeQuery = query.replace(/['"\\]/g, ' ').trim();
    if (!safeQuery) return [];

    let sql = `
      SELECT entity_type, bundle, entity_id, title, rank
      FROM search_index
      WHERE search_index MATCH ?
    `;
    const params: unknown[] = [safeQuery + '*'];

    if (options.entityType) {
      sql += ` AND entity_type = ?`;
      params.push(options.entityType);
    }
    if (options.bundle) {
      sql += ` AND bundle = ?`;
      params.push(options.bundle);
    }

    sql += ` ORDER BY rank LIMIT ?`;
    params.push(limit);

    const rows = await conn.raw(sql, params);
    return (rows as any[]).map((r) => ({
      entity_type: r.entity_type,
      bundle: r.bundle,
      entity_id: parseInt(r.entity_id, 10),
      title: r.title,
      rank: r.rank,
    }));
  } catch (err) {
    logger.error('FTS5 search failed', { query, error: String(err) });
    return [];
  }
}

/**
 * Check if FTS5 is available.
 */
export function isFtsAvailable(): boolean {
  return getFtsAvailable();
}

/**
 * Rebuild the entire search index from entity data.
 */
export async function rebuildSearchIndex(): Promise<number> {
  if (!getFtsAvailable()) return 0;

  const conn = (await import('../db/index.js')).getConnection();

  // Clear existing index
  await conn.raw('DELETE FROM search_index');

  let count = 0;

  // Index all nodes
  const nodes = await db
    .select('node_field_data')
    .fields(['nid', 'type', 'title'])
    .condition('langcode', 'en')
    .execute<{ nid: number; type: string; title: string }>();

  for (const node of nodes) {
    // Try to get body text from text_long or text_with_summary fields
    let body = '';
    try {
      const bodyRows = await conn.raw(
        `SELECT * FROM sqlite_master WHERE type='table' AND name LIKE 'node__field_%'`
      );
      // Just index the title for now, body extraction is best-effort
    } catch {
      // ignore
    }

    await indexEntity('node', node.type, node.nid, node.title, body);
    count++;
  }

  // Index all taxonomy terms
  const terms = await db
    .select('taxonomy_term_field_data')
    .fields(['tid', 'type', 'name'])
    .condition('langcode', 'en')
    .execute<{ tid: number; type: string; name: string }>();

  for (const term of terms) {
    await indexEntity('taxonomy_term', term.type, term.tid, term.name);
    count++;
  }

  logger.info(`Search index rebuilt: ${count} entities indexed`);
  return count;
}

/**
 * Register EventBus hooks to keep the search index in sync.
 */
export function registerSearchHooks(): void {
  EventBus.on('entity:insert', async (data: unknown) => {
    const entity = data as Entity;
    const json = entity.toJSON();
    const id = json.nid ?? json.tid;
    const title = (json.title ?? json.name ?? '') as string;
    const bundle = (json.type ?? '') as string;
    const entityType = entity.entityType;

    // Extract body from text fields
    let body = '';
    for (const [key, val] of Object.entries(json)) {
      if (key.startsWith('field_') && typeof val === 'object' && val !== null) {
        const v = val as Record<string, unknown>;
        if (typeof v.value === 'string') {
          body += ' ' + v.value;
        }
      }
    }

    if (id) {
      await indexEntity(entityType, bundle, id as number, title, body.trim());
    }
  }, { priority: 80 });

  EventBus.on('entity:update', async (data: unknown) => {
    const entity = data as Entity;
    const json = entity.toJSON();
    const id = json.nid ?? json.tid;
    const title = (json.title ?? json.name ?? '') as string;
    const bundle = (json.type ?? '') as string;
    const entityType = entity.entityType;

    let body = '';
    for (const [key, val] of Object.entries(json)) {
      if (key.startsWith('field_') && typeof val === 'object' && val !== null) {
        const v = val as Record<string, unknown>;
        if (typeof v.value === 'string') {
          body += ' ' + v.value;
        }
      }
    }

    if (id) {
      await indexEntity(entityType, bundle, id as number, title, body.trim());
    }
  }, { priority: 80 });

  EventBus.on('entity:delete', async (data: unknown) => {
    const entity = data as Entity;
    const json = entity.toJSON();
    const id = json.nid ?? json.tid;
    if (id) {
      await removeFromIndex(entity.entityType, id as number);
    }
  }, { priority: 80 });
}
