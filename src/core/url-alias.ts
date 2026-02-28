import { db, schema as dbSchema } from '../db/index.js';
import type { TableDefinition } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Drupal-compatible path_alias table schema.
 * Matches Drupal 10/11 path_alias entity storage.
 */
const PATH_ALIAS_TABLE: TableDefinition = {
  fields: {
    id: { type: 'serial', primary: true },
    revision_id: { type: 'int', unsigned: true, nullable: true },
    uuid: { type: 'varchar', length: 128, nullable: false, unique: true },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
    path: { type: 'varchar', length: 255, nullable: false },
    alias: { type: 'varchar', length: 255, nullable: false },
    status: { type: 'int', unsigned: true, nullable: false, default: 1 },
  },
  indexes: {
    path_alias__path: ['path'],
    path_alias__alias: ['alias'],
  },
  unique: {
    path_alias__alias_lang: ['alias', 'langcode'],
  },
};

export async function ensureUrlAliasTable(): Promise<void> {
  await dbSchema.createTable('path_alias', PATH_ALIAS_TABLE);
}

export interface UrlAlias {
  id: number;
  revision_id: number | null;
  uuid: string;
  path: string;
  alias: string;
  langcode: string;
  status: number;
}

/**
 * Create a URL alias mapping.
 */
export async function createAlias(
  sourcePath: string,
  aliasPath: string,
  langcode = 'en'
): Promise<UrlAlias> {
  // Remove existing alias for this source path + langcode
  await db.delete('path_alias')
    .condition('path', sourcePath)
    .condition('langcode', langcode)
    .execute();

  const uuid = uuidv4();
  const [id] = await db.insert('path_alias').values({
    uuid,
    path: sourcePath,
    alias: aliasPath,
    langcode,
    status: 1,
  }).execute();

  // Set revision_id = id (self-referencing for initial revision)
  await db.update('path_alias')
    .set({ revision_id: id })
    .condition('id', id)
    .execute();

  return { id, revision_id: id, uuid, path: sourcePath, alias: aliasPath, langcode, status: 1 };
}

/**
 * Look up the internal source path for an alias.
 */
export async function resolveAlias(
  aliasPath: string,
  langcode = 'en'
): Promise<string | null> {
  const rows = await db.select('path_alias')
    .fields(['path'])
    .condition('alias', aliasPath)
    .condition('langcode', langcode)
    .condition('status', 1)
    .execute<{ path: string }>();

  return rows.length > 0 ? rows[0].path : null;
}

/**
 * Look up the alias for an internal source path.
 */
export async function getAliasForSource(
  sourcePath: string,
  langcode = 'en'
): Promise<string | null> {
  const rows = await db.select('path_alias')
    .fields(['alias'])
    .condition('path', sourcePath)
    .condition('langcode', langcode)
    .condition('status', 1)
    .execute<{ alias: string }>();

  return rows.length > 0 ? rows[0].alias : null;
}

/**
 * Delete an alias by ID.
 */
export async function deleteAlias(id: number): Promise<void> {
  await db.delete('path_alias').condition('id', id).execute();
}

/**
 * Delete aliases by source path.
 */
export async function deleteAliasesBySource(sourcePath: string): Promise<void> {
  await db.delete('path_alias').condition('path', sourcePath).execute();
}

/**
 * List all aliases, with optional filtering.
 */
export async function listAliases(
  options?: { limit?: number; offset?: number }
): Promise<{ aliases: UrlAlias[]; total: number }> {
  const allRows = await db.select('path_alias')
    .fields(['id'])
    .execute<{ id: number }>();
  const total = allRows.length;

  let query = db.select('path_alias')
    .fields(['id', 'revision_id', 'uuid', 'path', 'alias', 'langcode', 'status'])
    .orderBy('id', 'DESC');

  if (options?.limit) {
    query = query.range(options.offset ?? 0, options.limit);
  }

  const aliases = await query.execute<UrlAlias>();
  return { aliases, total };
}

/**
 * Generate a URL-safe slug from a title.
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 200);
}

/**
 * Auto-generate an alias for an entity.
 */
export async function autoGenerateAlias(
  entityType: string,
  bundle: string,
  entityId: number,
  title: string,
  langcode = 'en'
): Promise<UrlAlias | null> {
  if (!title) return null;

  const sourcePath = `/api/${entityType}/${bundle}/${entityId}`;
  let slug = slugify(title);
  if (!slug) return null;

  let aliasPath = `/content/${slug}`;

  // Check for duplicate and append suffix if needed
  let attempt = 0;
  while (true) {
    const existing = await db.select('path_alias')
      .fields(['id', 'path'])
      .condition('alias', aliasPath)
      .condition('langcode', langcode)
      .execute<{ id: number; path: string }>();

    if (existing.length === 0) break;
    // If alias already points to this source, just reuse it
    if (existing[0].path === sourcePath) break;

    attempt++;
    aliasPath = `/content/${slug}-${attempt}`;
  }

  return createAlias(sourcePath, aliasPath, langcode);
}
