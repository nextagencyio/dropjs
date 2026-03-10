/**
 * Actions & Triggers — event-driven automation framework.
 *
 * Actions are reusable operations (publish content, send notification, etc.).
 * Triggers bind actions to EventBus events with optional conditions.
 */

import { db, schema as dbSchema } from '../db/index.js';
import type { TableDefinition } from '../db/index.js';
import { EventBus } from './event-bus.js';
import { watchdog } from './watchdog.js';
import { listWebhooks } from './webhooks.js';
import { Entity } from './entity.js';

// ─── Table Definition ────────────────────────────────────────────

const ACTION_TRIGGERS_TABLE: TableDefinition = {
  fields: {
    id: { type: 'serial', primary: true },
    label: { type: 'varchar', length: 255, nullable: false },
    event: { type: 'varchar', length: 128, nullable: false },
    action_id: { type: 'varchar', length: 128, nullable: false },
    conditions: { type: 'text', nullable: true },
    weight: { type: 'int', nullable: false, default: 0 },
    enabled: { type: 'int', unsigned: true, nullable: false, default: 1 },
    created: { type: 'int', unsigned: true, nullable: false },
  },
  indexes: {
    idx_action_triggers_event: ['event'],
    idx_action_triggers_action_id: ['action_id'],
    idx_action_triggers_enabled: ['enabled'],
  },
};

// ─── Interfaces ──────────────────────────────────────────────────

export interface ActionDefinition {
  id: string;
  label: string;
  description: string;
  category: string; // 'content' | 'system' | 'user' | 'notification'
  execute: (context: ActionContext) => Promise<void>;
}

export interface ActionContext {
  event: string;
  data: unknown;
  trigger: ActionTrigger;
}

export interface ActionTrigger {
  id: number;
  label: string;
  event: string;
  action_id: string;
  conditions?: Record<string, unknown>;
  weight: number;
  enabled: boolean;
  created: number;
}

interface ActionTriggerRow {
  id: number;
  label: string;
  event: string;
  action_id: string;
  conditions: string | null;
  weight: number;
  enabled: number;
  created: number;
}

// ─── In-Memory Action Registry ───────────────────────────────────
// Stored on globalThis for webpack module sharing.
const gActions = globalThis as unknown as { __dropjs_action_registry?: Map<string, ActionDefinition> };
if (!gActions.__dropjs_action_registry) gActions.__dropjs_action_registry = new Map<string, ActionDefinition>();
const actionRegistry = gActions.__dropjs_action_registry;

// ─── Row Conversion ──────────────────────────────────────────────

function rowToTrigger(row: ActionTriggerRow): ActionTrigger {
  let conditions: Record<string, unknown> | undefined;
  if (row.conditions) {
    try {
      conditions = JSON.parse(row.conditions);
    } catch {
      conditions = undefined;
    }
  }
  return {
    id: row.id,
    label: row.label,
    event: row.event,
    action_id: row.action_id,
    conditions,
    weight: row.weight,
    enabled: Boolean(row.enabled),
    created: row.created,
  };
}

// ─── Table Setup ─────────────────────────────────────────────────

export async function ensureActionTriggersTable(): Promise<void> {
  await dbSchema.createTable('action_triggers', ACTION_TRIGGERS_TABLE);
}

// ─── Action Registry Functions ───────────────────────────────────

export function registerAction(action: ActionDefinition): void {
  actionRegistry.set(action.id, action);
}

export function unregisterAction(id: string): void {
  actionRegistry.delete(id);
}

export function getAction(id: string): ActionDefinition | null {
  return actionRegistry.get(id) ?? null;
}

export function getAllActions(): ActionDefinition[] {
  return Array.from(actionRegistry.values());
}

// ─── Trigger CRUD ────────────────────────────────────────────────

export async function createTrigger(data: {
  label: string;
  event: string;
  action_id: string;
  conditions?: Record<string, unknown>;
  weight?: number;
  enabled?: boolean;
}): Promise<ActionTrigger> {
  const now = Math.floor(Date.now() / 1000);

  const [id] = await db.insert('action_triggers').values({
    label: data.label,
    event: data.event,
    action_id: data.action_id,
    conditions: data.conditions ? JSON.stringify(data.conditions) : null,
    weight: data.weight ?? 0,
    enabled: data.enabled !== false ? 1 : 0,
    created: now,
  }).execute();

  return {
    id,
    label: data.label,
    event: data.event,
    action_id: data.action_id,
    conditions: data.conditions,
    weight: data.weight ?? 0,
    enabled: data.enabled !== false,
    created: now,
  };
}

export async function loadTrigger(id: number): Promise<ActionTrigger | null> {
  const rows = await db.select('action_triggers')
    .fields(['id', 'label', 'event', 'action_id', 'conditions', 'weight', 'enabled', 'created'])
    .condition('id', id)
    .execute<ActionTriggerRow>();

  if (rows.length === 0) return null;
  return rowToTrigger(rows[0]);
}

export async function listTriggers(event?: string): Promise<ActionTrigger[]> {
  let query = db.select('action_triggers')
    .fields(['id', 'label', 'event', 'action_id', 'conditions', 'weight', 'enabled', 'created'])
    .orderBy('weight', 'ASC')
    .orderBy('id', 'ASC');

  if (event) {
    query = query.condition('event', event);
  }

  const rows = await query.execute<ActionTriggerRow>();
  return rows.map(rowToTrigger);
}

export async function updateTrigger(
  id: number,
  data: Partial<{
    label: string;
    event: string;
    action_id: string;
    conditions: Record<string, unknown>;
    weight: number;
    enabled: boolean;
  }>
): Promise<ActionTrigger | null> {
  const updates: Record<string, unknown> = {};

  if (data.label !== undefined) updates.label = data.label;
  if (data.event !== undefined) updates.event = data.event;
  if (data.action_id !== undefined) updates.action_id = data.action_id;
  if (data.conditions !== undefined) updates.conditions = JSON.stringify(data.conditions);
  if (data.weight !== undefined) updates.weight = data.weight;
  if (data.enabled !== undefined) updates.enabled = data.enabled ? 1 : 0;

  if (Object.keys(updates).length > 0) {
    await db.update('action_triggers').set(updates).condition('id', id).execute();
  }

  return loadTrigger(id);
}

export async function deleteTrigger(id: number): Promise<void> {
  await db.delete('action_triggers').condition('id', id).execute();
}

// ─── Condition Matching ──────────────────────────────────────────

/**
 * Check whether the event data satisfies the trigger's conditions.
 * Conditions are a flat key/value map. Each key is checked against the
 * corresponding property in the data object. All conditions must match.
 */
export function matchesConditions(
  conditions: Record<string, unknown> | undefined,
  data: unknown
): boolean {
  if (!conditions || Object.keys(conditions).length === 0) {
    return true;
  }

  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const record = data as Record<string, unknown>;

  for (const [key, expected] of Object.entries(conditions)) {
    // Support nested keys via dot notation (e.g., "entity.type")
    const actual = resolveNestedKey(record, key);

    if (Array.isArray(expected)) {
      // If the expected value is an array, check if actual is in the array
      if (!expected.includes(actual)) return false;
    } else if (actual !== expected) {
      return false;
    }
  }

  return true;
}

/**
 * Resolve a dot-separated key path against an object.
 */
function resolveNestedKey(obj: Record<string, unknown>, key: string): unknown {
  const parts = key.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

// ─── Trigger Execution ───────────────────────────────────────────

/**
 * Execute a single trigger against the provided event data.
 * Looks up the registered action and invokes it.
 */
export async function executeTrigger(
  trigger: ActionTrigger,
  eventData: unknown
): Promise<void> {
  const action = getAction(trigger.action_id);
  if (!action) {
    await watchdog(
      'actions',
      `Action "${trigger.action_id}" not found for trigger #${trigger.id} ("${trigger.label}")`,
      'warning'
    );
    return;
  }

  const context: ActionContext = {
    event: trigger.event,
    data: eventData,
    trigger,
  };

  try {
    await action.execute(context);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await watchdog(
      'actions',
      `Action "${trigger.action_id}" failed for trigger #${trigger.id}: ${message}`,
      'error'
    );
  }
}

// ─── EventBus Hook Registration ──────────────────────────────────

/**
 * Subscribe to well-known EventBus events and auto-fire matching triggers.
 */
export function registerTriggerHooks(): void {
  const events = [
    'entity:insert',
    'entity:update',
    'entity:delete',
    'contact:submit',
    'user:login',
    'user:register',
    'cron:run',
  ];

  for (const event of events) {
    EventBus.on(event, async (eventData: unknown) => {
      let triggers: ActionTrigger[];
      try {
        triggers = await listTriggers(event);
      } catch {
        // Table may not exist yet
        return;
      }

      const enabled = triggers.filter((t) => t.enabled);

      for (const trigger of enabled) {
        // Normalise event data for condition matching.
        // If the data is an Entity instance, convert it to a plain object
        // so that condition keys like "entity_type" and "bundle" work.
        let matchData = eventData;
        if (eventData && typeof eventData === 'object' && 'toJSON' in eventData) {
          const entity = eventData as { toJSON: () => Record<string, unknown>; entityType?: string; bundle?: string };
          matchData = {
            ...entity.toJSON(),
            entity_type: entity.entityType,
            bundle: entity.bundle,
          };
        }

        if (matchesConditions(trigger.conditions, matchData)) {
          // Execute asynchronously so we don't block the event chain
          executeTrigger(trigger, eventData).catch(() => {});
        }
      }
    }, { priority: 90 }); // Run after most hooks but before webhooks (100)
  }
}

// ─── Built-in Actions ────────────────────────────────────────────

/**
 * Register the default set of built-in actions.
 */
export function registerDefaultActions(): void {
  // 1. Publish Content
  registerAction({
    id: 'publish_content',
    label: 'Publish content',
    description: 'Set the content status to published.',
    category: 'content',
    async execute(context: ActionContext) {
      const entity = await resolveEntity(context.data);
      if (!entity) return;
      entity.status = true;
      await entity.save();
      await watchdog('actions', `Action publish_content executed on entity ${entity.entityType}:${entity.nid}`, 'info');
    },
  });

  // 2. Unpublish Content
  registerAction({
    id: 'unpublish_content',
    label: 'Unpublish content',
    description: 'Set the content status to unpublished.',
    category: 'content',
    async execute(context: ActionContext) {
      const entity = await resolveEntity(context.data);
      if (!entity) return;
      entity.status = false;
      await entity.save();
      await watchdog('actions', `Action unpublish_content executed on entity ${entity.entityType}:${entity.nid}`, 'info');
    },
  });

  // 3. Log Message
  registerAction({
    id: 'log_message',
    label: 'Log message',
    description: 'Write a message to the watchdog log.',
    category: 'system',
    async execute(context: ActionContext) {
      const message = typeof context.data === 'object' && context.data !== null
        ? JSON.stringify(context.data)
        : String(context.data);
      await watchdog(
        'actions',
        `[Trigger #${context.trigger.id} "${context.trigger.label}"] ${message}`,
        'notice'
      );
    },
  });

  // 4. Send Webhook Notification
  registerAction({
    id: 'send_webhook_notification',
    label: 'Send webhook notification',
    description: 'Dispatch a webhook notification to all active webhook endpoints matching the event.',
    category: 'notification',
    async execute(context: ActionContext) {
      let webhooks;
      try {
        webhooks = await listWebhooks();
      } catch {
        return; // Webhooks table may not exist
      }

      const matching = webhooks.filter(
        (w) => w.active && w.events.includes(context.event)
      );

      const payload = JSON.stringify({
        event: context.event,
        trigger: {
          id: context.trigger.id,
          label: context.trigger.label,
        },
        timestamp: new Date().toISOString(),
        data: context.data && typeof context.data === 'object' && 'toJSON' in context.data
          ? (context.data as { toJSON: () => unknown }).toJSON()
          : context.data,
      });

      await Promise.allSettled(
        matching.map(async (webhook) => {
          try {
            await fetch(webhook.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-DropJS-Event': context.event,
                'X-DropJS-Action': 'send_webhook_notification',
              },
              body: payload,
              signal: AbortSignal.timeout(10000),
            });
          } catch {
            // Non-fatal delivery failure
          }
        })
      );

      await watchdog('actions', `Webhook notification sent for event "${context.event}" to ${matching.length} endpoint(s)`, 'info');
    },
  });

  // 5. Set Sticky
  registerAction({
    id: 'set_sticky',
    label: 'Make content sticky',
    description: 'Set the sticky flag on a node so it appears at the top of lists.',
    category: 'content',
    async execute(context: ActionContext) {
      const entity = await resolveEntity(context.data);
      if (!entity) return;
      entity.set('sticky', 1);
      await entity.save();
      await watchdog('actions', `Action set_sticky executed on entity ${entity.entityType}:${entity.nid}`, 'info');
    },
  });

  // 6. Set Promoted
  registerAction({
    id: 'set_promoted',
    label: 'Promote content to front page',
    description: 'Set the promote flag on a node so it appears on the front page.',
    category: 'content',
    async execute(context: ActionContext) {
      const entity = await resolveEntity(context.data);
      if (!entity) return;
      entity.set('promote', 1);
      await entity.save();
      await watchdog('actions', `Action set_promoted executed on entity ${entity.entityType}:${entity.nid}`, 'info');
    },
  });
}

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Resolve event data into an Entity instance.
 * If the data is already an Entity, return it directly.
 * If it has entity_type + nid/entity_id, load it from the database.
 */
async function resolveEntity(data: unknown): Promise<Entity | null> {
  if (!data || typeof data !== 'object') return null;

  // If it's already an Entity instance
  if (data instanceof Entity) {
    return data;
  }

  // If it looks like an entity with a save method, use it directly
  if ('save' in data && typeof (data as { save: unknown }).save === 'function') {
    return data as unknown as Entity;
  }

  // Try to load from data fields
  const record = data as Record<string, unknown>;
  const entityType = (record.entity_type ?? record.entityType ?? 'node') as string;
  const entityId = (record.nid ?? record.entity_id ?? record.id) as number | undefined;

  if (entityId) {
    return Entity.load(entityType, entityId);
  }

  return null;
}
