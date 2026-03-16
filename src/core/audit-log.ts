import { db, schema as dbSchema } from '../db/index.js';
import type { TableDefinition } from '../db/index.js';
import { EventBus } from './event-bus.js';
import { createLogger } from './logger.js';

const logger = createLogger('audit');

// ---------------------------------------------------------------------------
// Table definition
// ---------------------------------------------------------------------------

const AUDIT_LOG_TABLE: TableDefinition = {
  fields: {
    id: { type: 'serial', primary: true },
    entity_type: { type: 'varchar', length: 64, nullable: false },
    entity_id: { type: 'int', nullable: false },
    bundle: { type: 'varchar', length: 64, nullable: true },
    action: { type: 'varchar', length: 16, nullable: false },
    uid: { type: 'int', nullable: true, default: 0 },
    changes: { type: 'text', nullable: true },
    timestamp: { type: 'int', nullable: false },
  },
  indexes: {
    idx_audit_entity: ['entity_type', 'entity_id'],
    idx_audit_action: ['action'],
    idx_audit_timestamp: ['timestamp'],
    idx_audit_uid: ['uid'],
  },
};

export async function ensureAuditLogTable(): Promise<void> {
  await dbSchema.createTable('audit_log', AUDIT_LOG_TABLE);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditLogEntry {
  id?: number;
  entity_type: string;
  entity_id: number;
  bundle?: string | null;
  action: 'insert' | 'update' | 'delete';
  uid?: number;
  changes?: string | null;
  timestamp?: number;
}

export interface AuditLogQueryOptions {
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function logAuditEntry(entry: AuditLogEntry): Promise<void> {
  try {
    await db.insert('audit_log').values({
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      bundle: entry.bundle ?? null,
      action: entry.action,
      uid: entry.uid ?? 0,
      changes: entry.changes ?? null,
      timestamp: entry.timestamp ?? Math.floor(Date.now() / 1000),
    }).execute();
  } catch (err) {
    // Audit logging should never crash the app
    logger.error('Failed to write audit log entry', { error: String(err) });
  }
}

export async function getAuditLog(
  entityType: string,
  entityId: number,
  options: AuditLogQueryOptions = {},
): Promise<AuditLogEntry[]> {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  const rows = await db
    .select('audit_log')
    .condition('entity_type', entityType)
    .condition('entity_id', entityId)
    .orderBy('timestamp', 'DESC')
    .range(offset, limit)
    .execute<AuditLogEntry>();

  return rows;
}

export async function getRecentAuditLog(
  limit: number = 50,
): Promise<AuditLogEntry[]> {
  const rows = await db
    .select('audit_log')
    .orderBy('timestamp', 'DESC')
    .range(0, limit)
    .execute<AuditLogEntry>();

  return rows;
}

// ---------------------------------------------------------------------------
// EventBus hooks
// ---------------------------------------------------------------------------

// Use globalThis to prevent double-registration across webpack module boundaries
const gAudit = globalThis as unknown as { __dropjs_audit_log_initialized?: boolean };

/**
 * Compute a JSON diff of changed fields between old and new entity data.
 * Returns null if no meaningful changes detected.
 */
function computeChanges(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
): string | null {
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  // Check all keys in new data for differences
  for (const key of Object.keys(newData)) {
    const oldVal = oldData[key];
    const newVal = newData[key];

    // Skip internal/meta keys that always change
    if (key === 'vid' || key === 'changed') continue;

    const oldStr = JSON.stringify(oldVal ?? null);
    const newStr = JSON.stringify(newVal ?? null);

    if (oldStr !== newStr) {
      changes[key] = { old: oldVal ?? null, new: newVal ?? null };
    }
  }

  if (Object.keys(changes).length === 0) return null;
  return JSON.stringify(changes);
}

export function registerAuditLogHooks(): void {
  if (gAudit.__dropjs_audit_log_initialized) return;
  gAudit.__dropjs_audit_log_initialized = true;

  // entity:insert — log new entity creation
  EventBus.on('entity:insert', async (data: unknown) => {
    const entity = data as { entityType: string; nid?: number; bundle: string; toJSON: () => Record<string, unknown> };
    const entityId = entity.nid;
    if (!entityId) return;

    const json = entity.toJSON();
    await logAuditEntry({
      entity_type: entity.entityType,
      entity_id: entityId,
      bundle: entity.bundle,
      action: 'insert',
      uid: (json.uid as number) ?? 0,
    });
  }, { priority: 90 });

  // entity:update — log changes
  // Note: entity:presave fires before the DB write. We snapshot the old data there
  // and compare after entity:update fires.
  const presaveSnapshots = new Map<string, Record<string, unknown>>();

  EventBus.on('entity:presave', async (data: unknown) => {
    const entity = data as { entityType: string; nid?: number; toJSON: () => Record<string, unknown> };
    const entityId = entity.nid;
    if (!entityId) return;

    // Only snapshot if this is an existing entity (has an ID) — new entities don't need diff
    try {
      // Dynamically import to avoid circular deps
      const { Entity } = await import('./entity.js');
      const existing = await Entity.load(entity.entityType, entityId);
      if (existing) {
        const key = `${entity.entityType}:${entityId}`;
        presaveSnapshots.set(key, existing.toJSON());
      }
    } catch {
      // Ignore — we'll log without changes
    }
  }, { priority: 10 }); // Run early in presave

  EventBus.on('entity:update', async (data: unknown) => {
    const entity = data as { entityType: string; nid?: number; bundle: string; toJSON: () => Record<string, unknown> };
    const entityId = entity.nid;
    if (!entityId) return;

    const key = `${entity.entityType}:${entityId}`;
    const oldData = presaveSnapshots.get(key);
    presaveSnapshots.delete(key);

    const newData = entity.toJSON();
    const changes = oldData ? computeChanges(oldData, newData) : null;

    await logAuditEntry({
      entity_type: entity.entityType,
      entity_id: entityId,
      bundle: entity.bundle,
      action: 'update',
      uid: (newData.uid as number) ?? 0,
      changes,
    });
  }, { priority: 90 });

  // entity:delete — log deletion
  EventBus.on('entity:delete', async (data: unknown) => {
    const entity = data as { entityType: string; nid?: number; bundle: string; toJSON: () => Record<string, unknown> };
    const entityId = entity.nid;
    if (!entityId) return;

    const json = entity.toJSON();
    await logAuditEntry({
      entity_type: entity.entityType,
      entity_id: entityId,
      bundle: entity.bundle,
      action: 'delete',
      uid: (json.uid as number) ?? 0,
    });
  }, { priority: 90 });

  logger.info('Audit log hooks registered');
}
