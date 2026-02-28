import { db, schema as dbSchema } from '../db/index.js';
import type { TableDefinition } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { registerEntityType } from './entity-type.js';
import { createLogger } from './logger.js';
import { EventBus } from './event-bus.js';

const logger = createLogger('core:comments');

// ─── Table Constants ──────────────────────────────────────────

export const COMMENT_TABLE = 'comment';
export const COMMENT_FIELD_DATA_TABLE = 'comment_field_data';

// ─── Table Definitions ────────────────────────────────────────

export const COMMENT_TABLE_DEFINITION: TableDefinition = {
  fields: {
    cid: { type: 'serial', primary: true },
    comment_type: { type: 'varchar', length: 255, nullable: false },
    uuid: { type: 'varchar', length: 128, nullable: false, unique: true },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
  },
  indexes: {
    comment__type: ['comment_type'],
  },
};

export const COMMENT_FIELD_DATA_TABLE_DEFINITION: TableDefinition = {
  fields: {
    cid: { type: 'int', nullable: false },
    comment_type: { type: 'varchar', length: 255, nullable: false },
    langcode: { type: 'varchar', length: 12, nullable: false, default: 'en' },
    status: { type: 'int', nullable: false, default: 1 },
    uid: { type: 'int', nullable: false, default: 0 },
    entity_type: { type: 'varchar', length: 255, nullable: false },
    entity_id: { type: 'int', nullable: false },
    subject: { type: 'varchar', length: 255, nullable: true },
    name: { type: 'varchar', length: 60, nullable: true },
    mail: { type: 'varchar', length: 255, nullable: true },
    homepage: { type: 'varchar', length: 255, nullable: true },
    thread: { type: 'varchar', length: 255, nullable: true },
    parent_cid: { type: 'int', default: 0 },
    created: { type: 'int', nullable: false },
    changed: { type: 'int', nullable: false },
  },
  indexes: {
    comment_field_data__entity: ['entity_type', 'entity_id'],
    comment_field_data__uid: ['uid'],
    comment_field_data__status: ['status'],
    comment_field_data__thread: ['thread'],
  },
};

// ─── Types ────────────────────────────────────────────────────

export interface CommentData {
  cid: number;
  comment_type: string;
  uuid: string;
  langcode: string;
  status: number;
  uid: number;
  entity_type: string;
  entity_id: number;
  subject: string | null;
  name: string | null;
  mail: string | null;
  homepage: string | null;
  thread: string;
  parent_cid: number;
  created: number;
  changed: number;
}

export interface CreateCommentInput {
  comment_type?: string;
  uid?: number;
  entity_type: string;
  entity_id: number;
  subject?: string;
  name?: string;
  mail?: string;
  homepage?: string;
  parent_cid?: number;
  status?: number;
  langcode?: string;
}

export interface UpdateCommentInput {
  status?: number;
  subject?: string;
  name?: string;
  mail?: string;
  homepage?: string;
}

// ─── Schema Setup ─────────────────────────────────────────────

/**
 * Ensure both comment tables exist in the database.
 */
export async function ensureCommentTables(): Promise<void> {
  await dbSchema.createTable(COMMENT_TABLE, COMMENT_TABLE_DEFINITION);
  await dbSchema.createTable(COMMENT_FIELD_DATA_TABLE, COMMENT_FIELD_DATA_TABLE_DEFINITION);
  logger.debug('Comment tables ensured');
}

// ─── Thread Generation ────────────────────────────────────────

/**
 * Generate a Drupal-style thread string for comment ordering.
 *
 * Top-level comments get threads like "01/", "02/", etc.
 * Replies get threads like "01.00/", "01.01/", "01.00.00/", etc.
 *
 * This maintains proper hierarchical sorting when ordered alphabetically.
 */
export async function generateThread(
  parentCid?: number,
  entityType?: string,
  entityId?: number
): Promise<string> {
  if (parentCid && parentCid > 0) {
    // This is a reply — get the parent's thread
    const parentRows = await db
      .select(COMMENT_FIELD_DATA_TABLE)
      .fields(['thread'])
      .condition('cid', parentCid)
      .execute<{ thread: string }>();

    if (parentRows.length === 0) {
      // Parent not found, treat as top-level
      return generateThread(undefined, entityType, entityId);
    }

    const parentThread = parentRows[0].thread;
    // Remove trailing slash for processing
    const parentBase = parentThread.replace(/\/$/, '');

    // Count existing children of this parent to determine the next child index
    const childRows = await db
      .select(COMMENT_FIELD_DATA_TABLE)
      .fields(['thread'])
      .condition('parent_cid', parentCid)
      .execute<{ thread: string }>();

    const childIndex = childRows.length;
    const paddedIndex = childIndex.toString(16).padStart(2, '0');

    return `${parentBase}.${paddedIndex}/`;
  }

  // Top-level comment — count existing top-level comments for this entity
  if (entityType && entityId !== undefined) {
    const topLevelRows = await db
      .select(COMMENT_FIELD_DATA_TABLE)
      .fields(['thread'])
      .condition('entity_type', entityType)
      .condition('entity_id', entityId)
      .condition('parent_cid', 0)
      .execute<{ thread: string }>();

    const topIndex = topLevelRows.length;
    const paddedIndex = topIndex.toString(16).padStart(2, '0');
    return `${paddedIndex}/`;
  }

  // Fallback
  return '01/';
}

// ─── CRUD Operations ──────────────────────────────────────────

/**
 * Create a new comment. Inserts into both comment and comment_field_data tables.
 * Returns the new comment ID (cid).
 */
export async function createComment(data: CreateCommentInput): Promise<number> {
  const now = Math.floor(Date.now() / 1000);
  const uuid = uuidv4();
  const commentType = data.comment_type ?? 'comment';
  const langcode = data.langcode ?? 'en';
  const parentCid = data.parent_cid ?? 0;

  // Generate thread string
  const thread = await generateThread(
    parentCid,
    data.entity_type,
    data.entity_id
  );

  // Emit presave event
  await EventBus.emit('comment:presave', { data, thread });

  // 1. Insert into comment table
  const [cid] = await db.insert(COMMENT_TABLE).values({
    comment_type: commentType,
    uuid,
    langcode,
  }).execute();

  // 2. Insert into comment_field_data table
  await db.insert(COMMENT_FIELD_DATA_TABLE).values({
    cid,
    comment_type: commentType,
    langcode,
    status: data.status ?? 1,
    uid: data.uid ?? 0,
    entity_type: data.entity_type,
    entity_id: data.entity_id,
    subject: data.subject ?? null,
    name: data.name ?? null,
    mail: data.mail ?? null,
    homepage: data.homepage ?? null,
    thread,
    parent_cid: parentCid,
    created: now,
    changed: now,
  }).execute();

  logger.debug('Comment created', { cid, entity_type: data.entity_type, entity_id: data.entity_id });

  // Emit insert event
  await EventBus.emit('comment:insert', { cid, entity_type: data.entity_type, entity_id: data.entity_id });

  return cid;
}

/**
 * Load a single comment by cid, joining both tables.
 */
export async function loadComment(cid: number): Promise<CommentData | null> {
  const rows = await db
    .select(COMMENT_TABLE, 'c')
    .join(COMMENT_FIELD_DATA_TABLE, 'cfd', 'c.cid = cfd.cid')
    .fields('c', ['cid', 'comment_type', 'uuid', 'langcode'])
    .fields('cfd', [
      'status', 'uid', 'entity_type', 'entity_id',
      'subject', 'name', 'mail', 'homepage',
      'thread', 'parent_cid', 'created', 'changed',
    ])
    .condition('c.cid', cid)
    .execute<Record<string, unknown>>();

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    cid: row.cid as number,
    comment_type: row.comment_type as string,
    uuid: row.uuid as string,
    langcode: row.langcode as string,
    status: row.status as number,
    uid: row.uid as number,
    entity_type: row.entity_type as string,
    entity_id: row.entity_id as number,
    subject: row.subject as string | null,
    name: row.name as string | null,
    mail: row.mail as string | null,
    homepage: row.homepage as string | null,
    thread: row.thread as string,
    parent_cid: row.parent_cid as number,
    created: row.created as number,
    changed: row.changed as number,
  };
}

/**
 * Load all comments for a given entity, ordered by thread for proper hierarchy.
 */
export async function loadComments(
  entityType: string,
  entityId: number,
  options?: { limit?: number; offset?: number; status?: number }
): Promise<CommentData[]> {
  let query = db
    .select(COMMENT_TABLE, 'c')
    .join(COMMENT_FIELD_DATA_TABLE, 'cfd', 'c.cid = cfd.cid')
    .fields('c', ['cid', 'comment_type', 'uuid', 'langcode'])
    .fields('cfd', [
      'status', 'uid', 'entity_type', 'entity_id',
      'subject', 'name', 'mail', 'homepage',
      'thread', 'parent_cid', 'created', 'changed',
    ])
    .condition('cfd.entity_type', entityType)
    .condition('cfd.entity_id', entityId)
    .orderBy('cfd.thread', 'ASC');

  if (options?.status !== undefined) {
    query = query.condition('cfd.status', options.status);
  }

  if (options?.limit !== undefined || options?.offset !== undefined) {
    query = query.range(options?.offset ?? 0, options?.limit ?? 50);
  }

  const rows = await query.execute<Record<string, unknown>>();

  return rows.map((row) => ({
    cid: row.cid as number,
    comment_type: row.comment_type as string,
    uuid: row.uuid as string,
    langcode: row.langcode as string,
    status: row.status as number,
    uid: row.uid as number,
    entity_type: row.entity_type as string,
    entity_id: row.entity_id as number,
    subject: row.subject as string | null,
    name: row.name as string | null,
    mail: row.mail as string | null,
    homepage: row.homepage as string | null,
    thread: row.thread as string,
    parent_cid: row.parent_cid as number,
    created: row.created as number,
    changed: row.changed as number,
  }));
}

/**
 * Update a comment's field data.
 */
export async function updateComment(
  cid: number,
  data: Partial<UpdateCommentInput>
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);

  const updateFields: Record<string, unknown> = { changed: now };

  if (data.status !== undefined) updateFields.status = data.status;
  if (data.subject !== undefined) updateFields.subject = data.subject;
  if (data.name !== undefined) updateFields.name = data.name;
  if (data.mail !== undefined) updateFields.mail = data.mail;
  if (data.homepage !== undefined) updateFields.homepage = data.homepage;

  await EventBus.emit('comment:presave', { cid, data });

  await db
    .update(COMMENT_FIELD_DATA_TABLE)
    .set(updateFields)
    .condition('cid', cid)
    .execute();

  logger.debug('Comment updated', { cid });

  await EventBus.emit('comment:update', { cid });
}

/**
 * Delete a comment from both tables.
 */
export async function deleteComment(cid: number): Promise<void> {
  await EventBus.emit('comment:delete', { cid });

  await db.delete(COMMENT_FIELD_DATA_TABLE).condition('cid', cid).execute();
  await db.delete(COMMENT_TABLE).condition('cid', cid).execute();

  logger.debug('Comment deleted', { cid });
}

/**
 * Count comments for an entity, optionally filtered by status.
 */
export async function countComments(
  entityType: string,
  entityId: number,
  status?: number
): Promise<number> {
  let query = db
    .select(COMMENT_FIELD_DATA_TABLE)
    .fields(['cid'])
    .condition('entity_type', entityType)
    .condition('entity_id', entityId);

  if (status !== undefined) {
    query = query.condition('status', status);
  }

  const rows = await query.execute<{ cid: number }>();
  return rows.length;
}

// ─── Entity Type Registration ─────────────────────────────────

/**
 * Register comment as a known entity type in the entity type registry.
 */
export function registerCommentEntityType(): void {
  registerEntityType({
    entity_type: 'comment',
    bundle: 'comment',
    label: 'Comment',
    description: 'Comments attached to entities',
    fields: {
      subject: {
        type: 'string',
        label: 'Subject',
        required: false,
      },
    },
  });
}
