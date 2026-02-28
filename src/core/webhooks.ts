import * as crypto from 'node:crypto';
import { db, schema as dbSchema } from '../db/index.js';
import type { TableDefinition } from '../db/index.js';
import { EventBus } from './event-bus.js';

const WEBHOOKS_TABLE: TableDefinition = {
  fields: {
    id: { type: 'serial', primary: true },
    url: { type: 'varchar', length: 2048, nullable: false },
    events: { type: 'text', nullable: false }, // JSON array of event names
    secret: { type: 'varchar', length: 255, nullable: false },
    active: { type: 'int', unsigned: true, nullable: false, default: 1 },
    created: { type: 'int', unsigned: true, nullable: true },
    changed: { type: 'int', unsigned: true, nullable: true },
  },
  indexes: {
    idx_webhooks_active: ['active'],
  },
};

export interface Webhook {
  id: number;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  created?: number;
  changed?: number;
}

interface WebhookRow {
  id: number;
  url: string;
  events: string;
  secret: string;
  active: number;
  created: number | null;
  changed: number | null;
}

function rowToWebhook(row: WebhookRow): Webhook {
  let events: string[];
  try {
    events = JSON.parse(row.events);
  } catch {
    events = [];
  }
  return {
    id: row.id,
    url: row.url,
    events,
    secret: row.secret,
    active: Boolean(row.active),
    created: row.created ?? undefined,
    changed: row.changed ?? undefined,
  };
}

export async function ensureWebhooksTable(): Promise<void> {
  await dbSchema.createTable('webhooks', WEBHOOKS_TABLE);
}

export async function createWebhook(data: {
  url: string;
  events: string[];
  secret?: string;
  active?: boolean;
}): Promise<Webhook> {
  const now = Math.floor(Date.now() / 1000);
  const secret = data.secret ?? crypto.randomBytes(32).toString('hex');

  const [id] = await db.insert('webhooks').values({
    url: data.url,
    events: JSON.stringify(data.events),
    secret,
    active: data.active !== false ? 1 : 0,
    created: now,
    changed: now,
  }).execute();

  return {
    id,
    url: data.url,
    events: data.events,
    secret,
    active: data.active !== false,
    created: now,
    changed: now,
  };
}

export async function loadWebhook(id: number): Promise<Webhook | null> {
  const rows = await db.select('webhooks')
    .fields(['id', 'url', 'events', 'secret', 'active', 'created', 'changed'])
    .condition('id', id)
    .execute<WebhookRow>();

  if (rows.length === 0) return null;
  return rowToWebhook(rows[0]);
}

export async function listWebhooks(): Promise<Webhook[]> {
  const rows = await db.select('webhooks')
    .fields(['id', 'url', 'events', 'secret', 'active', 'created', 'changed'])
    .orderBy('id', 'ASC')
    .execute<WebhookRow>();

  return rows.map(rowToWebhook);
}

export async function updateWebhook(
  id: number,
  data: Partial<{ url: string; events: string[]; secret: string; active: boolean }>
): Promise<Webhook | null> {
  const now = Math.floor(Date.now() / 1000);
  const updates: Record<string, unknown> = { changed: now };

  if (data.url !== undefined) updates.url = data.url;
  if (data.events !== undefined) updates.events = JSON.stringify(data.events);
  if (data.secret !== undefined) updates.secret = data.secret;
  if (data.active !== undefined) updates.active = data.active ? 1 : 0;

  await db.update('webhooks').set(updates).condition('id', id).execute();
  return loadWebhook(id);
}

export async function deleteWebhook(id: number): Promise<void> {
  await db.delete('webhooks').condition('id', id).execute();
}

/**
 * Generate HMAC-SHA256 signature for webhook payload.
 */
function signPayload(payload: string, secret: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Fire a webhook: send HTTP POST to the registered URL.
 */
async function fireWebhook(webhook: Webhook, event: string, data: unknown): Promise<void> {
  const payload = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data,
  });

  const signature = signPayload(payload, webhook.secret);

  try {
    await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DropJS-Event': event,
        'X-DropJS-Signature': signature,
      },
      body: payload,
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    // Webhook delivery failure is non-fatal
  }
}

/**
 * Dispatch an event to all matching active webhooks.
 */
async function dispatchWebhooks(event: string, data: unknown): Promise<void> {
  let webhooks: Webhook[];
  try {
    webhooks = await listWebhooks();
  } catch {
    return; // Table may not exist yet
  }

  const matching = webhooks.filter(
    (w) => w.active && w.events.includes(event)
  );

  // Fire webhooks in parallel (non-blocking)
  await Promise.allSettled(
    matching.map((w) => fireWebhook(w, event, data))
  );
}

/**
 * Register EventBus hooks for webhook dispatching.
 */
export function registerWebhookHooks(): void {
  const entityEvents = [
    'entity:insert',
    'entity:update',
    'entity:delete',
  ];

  for (const event of entityEvents) {
    EventBus.on(event, async (entityData: unknown) => {
      const entity = entityData as { toJSON?: () => unknown };
      const payload = entity.toJSON ? entity.toJSON() : entityData;
      // Use setImmediate-like scheduling so we don't block the entity operation
      dispatchWebhooks(event, payload).catch(() => {});
    }, { priority: 100 }); // Run after all other hooks
  }
}
