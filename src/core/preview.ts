/**
 * Content Preview system — temporary storage for content previews.
 *
 * Allows users to preview content before saving/publishing. Preview data
 * is stored in a `content_previews` table with automatic expiration
 * (default 1 hour). A cron job cleans up expired previews.
 */

import * as crypto from 'node:crypto';
import { db, schema as dbSchema } from '../db/index.js';
import type { TableDefinition } from '../db/index.js';
import { createLogger } from './logger.js';
import { registerCronJob } from './cron.js';

const logger = createLogger('core:preview');

// ─── Table Definition ────────────────────────────────────────

const CONTENT_PREVIEWS_TABLE: TableDefinition = {
  fields: {
    id: { type: 'varchar', length: 36, nullable: false, primary: true },
    entity_type: { type: 'varchar', length: 255, nullable: false },
    bundle: { type: 'varchar', length: 255, nullable: false },
    data: { type: 'text', nullable: false },
    uid: { type: 'int', nullable: false, default: 0 },
    created: { type: 'int', unsigned: true, nullable: false },
    expires: { type: 'int', unsigned: true, nullable: false },
  },
  indexes: {
    idx_preview_expires: ['expires'],
    idx_preview_uid: ['uid'],
  },
};

// ─── Types ───────────────────────────────────────────────────

export interface PreviewData {
  id: string;
  entity_type: string;
  bundle: string;
  data: Record<string, unknown>;
  uid: number;
  created: number;
  expires: number;
}

interface PreviewRow {
  id: string;
  entity_type: string;
  bundle: string;
  data: string;
  uid: number;
  created: number;
  expires: number;
}

function rowToPreview(row: PreviewRow): PreviewData {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(row.data);
  } catch {
    data = {};
  }
  return {
    id: row.id,
    entity_type: row.entity_type,
    bundle: row.bundle,
    data,
    uid: row.uid,
    created: row.created,
    expires: row.expires,
  };
}

// ─── Table Setup ─────────────────────────────────────────────

export async function ensurePreviewTable(): Promise<void> {
  await dbSchema.createTable('content_previews', CONTENT_PREVIEWS_TABLE);
}

// ─── CRUD Operations ─────────────────────────────────────────

/**
 * Create a temporary preview and return the preview ID.
 * Default expiration is 1 hour from creation.
 */
export async function createPreview(
  entityType: string,
  bundle: string,
  data: Record<string, unknown>,
  uid: number
): Promise<string> {
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const expires = now + 3600; // 1 hour

  const serialized = JSON.stringify(data);

  await db.insert('content_previews').values({
    id,
    entity_type: entityType,
    bundle,
    data: serialized,
    uid,
    created: now,
    expires,
  }).execute();

  logger.info('Preview created', { id, entity_type: entityType, bundle, uid });
  return id;
}

/**
 * Load preview data by ID. Returns null if not found or expired.
 */
export async function loadPreview(
  previewId: string
): Promise<PreviewData | null> {
  const now = Math.floor(Date.now() / 1000);

  const rows = await db
    .select('content_previews')
    .fields(['id', 'entity_type', 'bundle', 'data', 'uid', 'created', 'expires'])
    .condition('id', previewId)
    .condition('expires', now, '>')
    .execute<PreviewRow>();

  if (rows.length === 0) return null;

  return rowToPreview(rows[0]);
}

/**
 * Delete a specific preview.
 */
export async function deletePreview(
  previewId: string
): Promise<boolean> {
  const result = await db
    .delete('content_previews')
    .condition('id', previewId)
    .execute();

  return result > 0;
}

/**
 * Delete all expired previews. Intended to be called by cron.
 */
export async function cleanExpiredPreviews(): Promise<number> {
  const now = Math.floor(Date.now() / 1000);

  const result = await db
    .delete('content_previews')
    .condition('expires', now, '<=')
    .execute();

  if (result > 0) {
    logger.info(`Cleaned ${result} expired preview(s)`);
  }

  return result;
}

/**
 * Register a cron job to clean expired previews every 15 minutes.
 */
export function registerPreviewCleanupCronJob(): void {
  registerCronJob('preview_cleanup', 15 * 60 * 1000, async () => {
    await cleanExpiredPreviews();
  });
}
