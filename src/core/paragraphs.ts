/**
 * Paragraphs — structured content entity type system.
 *
 * Provides reusable content components (paragraph types) that can be
 * composed within entities, similar to Drupal's Paragraphs module.
 *
 * Paragraph types are stored in config as `paragraphs.type.<id>`.
 * Paragraph items are stored in the `paragraphs` table.
 */

import { db, schema as dbSchema } from '../db/index.js';
import type { TableDefinition } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { saveConfig, loadConfig, loadAllConfig, deleteConfig } from './config-storage.js';
import { createLogger } from './logger.js';
import { EventBus } from './event-bus.js';

const logger = createLogger('core:paragraphs');

// ─── Table Constants ──────────────────────────────────────────

export const PARAGRAPHS_TABLE = 'paragraphs';

// ─── Table Definition ─────────────────────────────────────────

export const PARAGRAPHS_TABLE_DEFINITION: TableDefinition = {
  fields: {
    id: { type: 'serial', primary: true },
    uuid: { type: 'varchar', length: 128, nullable: false, unique: true },
    type: { type: 'varchar', length: 255, nullable: false },
    parent_entity_type: { type: 'varchar', length: 255, nullable: false },
    parent_entity_id: { type: 'int', nullable: false },
    parent_field_name: { type: 'varchar', length: 255, nullable: false },
    delta: { type: 'int', nullable: false, default: 0 },
    data: { type: 'text', nullable: true },
    created: { type: 'int', nullable: false },
    changed: { type: 'int', nullable: false },
  },
  indexes: {
    paragraphs__type: ['type'],
    paragraphs__parent: ['parent_entity_type', 'parent_entity_id'],
    paragraphs__parent_field: ['parent_entity_type', 'parent_entity_id', 'parent_field_name'],
    paragraphs__delta: ['parent_entity_type', 'parent_entity_id', 'parent_field_name', 'delta'],
  },
};

// ─── Types ────────────────────────────────────────────────────

export interface ParagraphTypeFieldDefinition {
  type: string;
  label: string;
  required?: boolean;
  description?: string;
  settings?: Record<string, unknown>;
}

export interface ParagraphType {
  id: string;
  label: string;
  description: string;
  fields: Record<string, ParagraphTypeFieldDefinition>;
}

export interface ParagraphItem {
  id: number;
  uuid: string;
  type: string;
  parent_entity_type: string;
  parent_entity_id: number;
  parent_field_name: string;
  delta: number;
  data: Record<string, unknown>;
  created: number;
  changed: number;
}

// ─── Schema Setup ─────────────────────────────────────────────

/**
 * Ensure the paragraphs table exists in the database.
 */
export async function ensureParagraphsTable(): Promise<void> {
  await dbSchema.createTable(PARAGRAPHS_TABLE, PARAGRAPHS_TABLE_DEFINITION);
  logger.debug('Paragraphs table ensured');
}

// ─── Paragraph Type Management (Config) ───────────────────────

/**
 * Register a paragraph type, storing it in config.
 */
export async function registerParagraphType(type: ParagraphType): Promise<void> {
  const configName = `paragraphs.type.${type.id}`;
  await saveConfig(configName, {
    id: type.id,
    label: type.label,
    description: type.description,
    fields: type.fields,
  });
  logger.debug('Paragraph type registered', { id: type.id });
}

/**
 * Get a single paragraph type by id.
 */
export async function getParagraphType(id: string): Promise<ParagraphType | null> {
  const configName = `paragraphs.type.${id}`;
  const data = await loadConfig(configName);
  if (!data) return null;

  return {
    id: data.id as string,
    label: data.label as string,
    description: (data.description as string) ?? '',
    fields: (data.fields as Record<string, ParagraphTypeFieldDefinition>) ?? {},
  };
}

/**
 * Get all registered paragraph types.
 */
export async function getAllParagraphTypes(): Promise<ParagraphType[]> {
  const configs = await loadAllConfig('paragraphs.type.');
  return Object.values(configs).map((data) => ({
    id: data.id as string,
    label: data.label as string,
    description: (data.description as string) ?? '',
    fields: (data.fields as Record<string, ParagraphTypeFieldDefinition>) ?? {},
  }));
}

/**
 * Delete a paragraph type from config.
 */
export async function deleteParagraphType(id: string): Promise<boolean> {
  const configName = `paragraphs.type.${id}`;
  const deleted = await deleteConfig(configName);
  if (deleted) {
    logger.debug('Paragraph type deleted', { id });
  }
  return deleted;
}

// ─── Paragraph Item CRUD ──────────────────────────────────────

/**
 * Parse a raw database row into a ParagraphItem.
 */
function rowToParagraphItem(row: Record<string, unknown>): ParagraphItem {
  let parsedData: Record<string, unknown> = {};
  if (row.data) {
    try {
      parsedData = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data as Record<string, unknown>);
    } catch {
      parsedData = {};
    }
  }

  return {
    id: row.id as number,
    uuid: row.uuid as string,
    type: row.type as string,
    parent_entity_type: row.parent_entity_type as string,
    parent_entity_id: row.parent_entity_id as number,
    parent_field_name: row.parent_field_name as string,
    delta: row.delta as number,
    data: parsedData,
    created: row.created as number,
    changed: row.changed as number,
  };
}

/**
 * Create a paragraph item attached to a parent entity.
 */
export async function createParagraph(
  parentEntityType: string,
  parentEntityId: number,
  parentFieldName: string,
  paragraphType: string,
  data: Record<string, unknown>,
  delta?: number
): Promise<ParagraphItem> {
  const now = Math.floor(Date.now() / 1000);
  const uuid = uuidv4();

  // If no delta provided, auto-calculate next delta
  let actualDelta = delta;
  if (actualDelta === undefined) {
    const existing = await db
      .select(PARAGRAPHS_TABLE)
      .fields(['delta'])
      .condition('parent_entity_type', parentEntityType)
      .condition('parent_entity_id', parentEntityId)
      .condition('parent_field_name', parentFieldName)
      .orderBy('delta', 'DESC')
      .range(0, 1)
      .execute<{ delta: number }>();

    actualDelta = existing.length > 0 ? existing[0].delta + 1 : 0;
  }

  const serializedData = JSON.stringify(data);

  const [id] = await db.insert(PARAGRAPHS_TABLE).values({
    uuid,
    type: paragraphType,
    parent_entity_type: parentEntityType,
    parent_entity_id: parentEntityId,
    parent_field_name: parentFieldName,
    delta: actualDelta,
    data: serializedData,
    created: now,
    changed: now,
  }).execute();

  logger.debug('Paragraph created', {
    id,
    type: paragraphType,
    parent: `${parentEntityType}:${parentEntityId}`,
    field: parentFieldName,
  });

  await EventBus.emit('paragraph:insert', {
    id,
    type: paragraphType,
    parent_entity_type: parentEntityType,
    parent_entity_id: parentEntityId,
    parent_field_name: parentFieldName,
  });

  return {
    id,
    uuid,
    type: paragraphType,
    parent_entity_type: parentEntityType,
    parent_entity_id: parentEntityId,
    parent_field_name: parentFieldName,
    delta: actualDelta,
    data,
    created: now,
    changed: now,
  };
}

/**
 * Load all paragraphs for a parent entity, optionally filtered by field name.
 * Results are ordered by delta (position).
 */
export async function loadParagraphs(
  parentEntityType: string,
  parentEntityId: number,
  parentFieldName?: string
): Promise<ParagraphItem[]> {
  let query = db
    .select(PARAGRAPHS_TABLE)
    .fields(['id', 'uuid', 'type', 'parent_entity_type', 'parent_entity_id', 'parent_field_name', 'delta', 'data', 'created', 'changed'])
    .condition('parent_entity_type', parentEntityType)
    .condition('parent_entity_id', parentEntityId)
    .orderBy('parent_field_name', 'ASC')
    .orderBy('delta', 'ASC');

  if (parentFieldName) {
    query = query.condition('parent_field_name', parentFieldName);
  }

  const rows = await query.execute<Record<string, unknown>>();
  return rows.map(rowToParagraphItem);
}

/**
 * Load a single paragraph by its ID.
 */
export async function loadParagraph(id: number): Promise<ParagraphItem | null> {
  const rows = await db
    .select(PARAGRAPHS_TABLE)
    .fields(['id', 'uuid', 'type', 'parent_entity_type', 'parent_entity_id', 'parent_field_name', 'delta', 'data', 'created', 'changed'])
    .condition('id', id)
    .execute<Record<string, unknown>>();

  if (rows.length === 0) return null;
  return rowToParagraphItem(rows[0]);
}

/**
 * Update a paragraph's field data.
 */
export async function updateParagraph(
  id: number,
  data: Record<string, unknown>
): Promise<ParagraphItem | null> {
  const now = Math.floor(Date.now() / 1000);
  const serializedData = JSON.stringify(data);

  await db
    .update(PARAGRAPHS_TABLE)
    .set({ data: serializedData, changed: now })
    .condition('id', id)
    .execute();

  logger.debug('Paragraph updated', { id });

  await EventBus.emit('paragraph:update', { id });

  return loadParagraph(id);
}

/**
 * Delete a single paragraph by ID.
 */
export async function deleteParagraph(id: number): Promise<void> {
  await EventBus.emit('paragraph:delete', { id });

  await db
    .delete(PARAGRAPHS_TABLE)
    .condition('id', id)
    .execute();

  logger.debug('Paragraph deleted', { id });
}

/**
 * Reorder paragraphs within a parent entity + field by setting delta values
 * based on the provided array of paragraph IDs (in desired order).
 */
export async function reorderParagraphs(
  parentEntityType: string,
  parentEntityId: number,
  parentFieldName: string,
  ids: number[]
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);

  for (let i = 0; i < ids.length; i++) {
    await db
      .update(PARAGRAPHS_TABLE)
      .set({ delta: i, changed: now })
      .condition('id', ids[i])
      .condition('parent_entity_type', parentEntityType)
      .condition('parent_entity_id', parentEntityId)
      .condition('parent_field_name', parentFieldName)
      .execute();
  }

  logger.debug('Paragraphs reordered', {
    parent: `${parentEntityType}:${parentEntityId}`,
    field: parentFieldName,
    order: ids,
  });
}

// ─── Cascade Delete Hook ──────────────────────────────────────

/**
 * Delete all paragraphs belonging to a parent entity.
 * Called when an entity is deleted.
 */
export async function deleteParagraphsByParent(
  parentEntityType: string,
  parentEntityId: number
): Promise<number> {
  const rows = await db
    .select(PARAGRAPHS_TABLE)
    .fields(['id'])
    .condition('parent_entity_type', parentEntityType)
    .condition('parent_entity_id', parentEntityId)
    .execute<{ id: number }>();

  if (rows.length === 0) return 0;

  await db
    .delete(PARAGRAPHS_TABLE)
    .condition('parent_entity_type', parentEntityType)
    .condition('parent_entity_id', parentEntityId)
    .execute();

  logger.debug('Cascade deleted paragraphs for entity', {
    parent: `${parentEntityType}:${parentEntityId}`,
    count: rows.length,
  });

  return rows.length;
}

/**
 * Register EventBus hook to cascade-delete paragraphs when a parent entity is deleted.
 */
export function registerParagraphHooks(): void {
  EventBus.on('entity:delete', async (data: unknown) => {
    const entity = data as { entityType?: string; toJSON?: () => Record<string, unknown> };
    if (!entity.entityType || !entity.toJSON) return;

    const json = entity.toJSON();
    const id = (json.nid ?? json.tid) as number | undefined;
    if (!id) return;

    await deleteParagraphsByParent(entity.entityType, id);
  }, { priority: 60 });

  logger.debug('Paragraph hooks registered');
}
