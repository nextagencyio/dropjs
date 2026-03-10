/**
 * Full-text search with database-specific backends.
 *
 * - SQLite: FTS5 virtual table with porter stemming
 * - PostgreSQL: tsvector/tsquery with GIN index
 *
 * Entities are indexed on create/update and removed on delete via EventBus hooks.
 */

import { db } from '../db/index.js';
import { EventBus } from './event-bus.js';
import type { Entity } from './entity.js';
import { createLogger } from './logger.js';

const logger = createLogger('search');

// Stored on globalThis for webpack module sharing.
const gSearch = globalThis as unknown as {
  __dropjs_fts_available?: boolean;
  __dropjs_search_backend?: 'fts5' | 'pg' | 'like';
};

function getFtsAvailable(): boolean { return gSearch.__dropjs_fts_available ?? false; }
function setFtsAvailable(v: boolean) { gSearch.__dropjs_fts_available = v; }
function getSearchBackend(): 'fts5' | 'pg' | 'like' { return gSearch.__dropjs_search_backend ?? 'like'; }
function setSearchBackend(v: 'fts5' | 'pg' | 'like') { gSearch.__dropjs_search_backend = v; }

/**
 * Create the search index table appropriate for the current database.
 * Falls back to LIKE search if native FTS is not available.
 */
export async function ensureSearchIndex(): Promise<boolean> {
  try {
    const { getConnection, getDbClient } = await import('../db/index.js');
    const conn = getConnection();
    const client = getDbClient();

    if (client === 'pg') {
      // PostgreSQL: regular table with tsvector column and GIN index
      const exists = await conn.schema.hasTable('search_index');
      if (!exists) {
        await conn.schema.createTable('search_index', (table) => {
          table.string('entity_type', 128).notNullable();
          table.string('bundle', 128).notNullable();
          table.integer('entity_id').unsigned().notNullable();
          table.string('title', 512).notNullable().defaultTo('');
          table.text('body').notNullable().defaultTo('');
          table.specificType('tsv', 'tsvector');
          table.primary(['entity_type', 'entity_id']);
        });
        await conn.raw('CREATE INDEX IF NOT EXISTS search_index_tsv_idx ON search_index USING gin(tsv)');
        await conn.raw('ALTER TABLE "search_index" ENABLE ROW LEVEL SECURITY');
      }
      setFtsAvailable(true);
      setSearchBackend('pg');
      logger.info('PostgreSQL full-text search index ready');
      return true;
    }

    // SQLite: FTS5 virtual table
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
    setSearchBackend('fts5');
    logger.info('FTS5 search index ready');
    return true;
  } catch (err) {
    logger.warn('Full-text search not available, falling back to LIKE search', { error: String(err) });
    setFtsAvailable(false);
    setSearchBackend('like');
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
    const { getConnection } = await import('../db/index.js');
    const conn = getConnection();
    const backend = getSearchBackend();

    if (backend === 'pg') {
      // PostgreSQL: upsert with tsvector generation
      await conn.raw(
        `INSERT INTO search_index (entity_type, bundle, entity_id, title, body, tsv)
         VALUES (?, ?, ?, ?, ?, to_tsvector('english', ? || ' ' || ?))
         ON CONFLICT (entity_type, entity_id)
         DO UPDATE SET bundle = EXCLUDED.bundle, title = EXCLUDED.title, body = EXCLUDED.body,
                       tsv = to_tsvector('english', EXCLUDED.title || ' ' || EXCLUDED.body)`,
        [entityType, bundle, entityId, title, body ?? '', title, body ?? '']
      );
    } else {
      // SQLite FTS5: delete + insert
      await conn.raw(
        `DELETE FROM search_index WHERE entity_type = ? AND entity_id = ?`,
        [entityType, entityId]
      );
      await conn.raw(
        `INSERT INTO search_index (entity_type, bundle, entity_id, title, body) VALUES (?, ?, ?, ?, ?)`,
        [entityType, bundle, entityId, title, body ?? '']
      );
    }
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
    const { getConnection } = await import('../db/index.js');
    const conn = getConnection();
    await conn.raw(
      `DELETE FROM search_index WHERE entity_type = ? AND entity_id = ?`,
      [entityType, entityId]
    );
  } catch (err) {
    logger.error('Failed to remove entity from search index', { entityType, entityId, error: String(err) });
  }
}

/**
 * Search the full-text index. Returns matching entity references.
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
    const { getConnection } = await import('../db/index.js');
    const conn = getConnection();
    const backend = getSearchBackend();

    const safeQuery = query.replace(/['"\\]/g, ' ').trim();
    if (!safeQuery) return [];

    if (backend === 'pg') {
      // PostgreSQL: use plainto_tsquery for safe parameterized search
      let sql = `
        SELECT entity_type, bundle, entity_id, title,
               ts_rank(tsv, plainto_tsquery('english', ?)) AS rank
        FROM search_index
        WHERE tsv @@ plainto_tsquery('english', ?)
      `;
      const params: unknown[] = [safeQuery, safeQuery];

      if (options.entityType) {
        sql += ` AND entity_type = ?`;
        params.push(options.entityType);
      }
      if (options.bundle) {
        sql += ` AND bundle = ?`;
        params.push(options.bundle);
      }

      sql += ` ORDER BY rank DESC LIMIT ?`;
      params.push(limit);

      const result = await conn.raw(sql, params);
      return (result.rows as any[]).map((r: any) => ({
        entity_type: r.entity_type,
        bundle: r.bundle,
        entity_id: parseInt(r.entity_id, 10),
        title: r.title,
        rank: r.rank,
      }));
    }

    // SQLite FTS5
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
    logger.error('Full-text search failed', { query, error: String(err) });
    return [];
  }
}

/**
 * Check if full-text search is available.
 */
export function isFtsAvailable(): boolean {
  return getFtsAvailable();
}

/**
 * Get the active search backend name ('fts5', 'pg', or 'like').
 */
export function getActiveSearchBackend(): string {
  return getSearchBackend();
}

/**
 * Rebuild the entire search index from entity data.
 */
export async function rebuildSearchIndex(): Promise<number> {
  if (!getFtsAvailable()) return 0;

  const { getConnection } = await import('../db/index.js');
  const conn = getConnection();

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
    await indexEntity('node', node.type, node.nid, node.title, '');
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
