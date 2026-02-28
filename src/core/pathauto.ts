/**
 * Pathauto — configurable URL alias pattern system.
 *
 * Allows administrators to configure URL patterns per entity type / bundle
 * using token-based templates. When entities are created or updated, aliases
 * are automatically generated from the configured pattern.
 *
 * Token reference:
 *   [entity:title]      — entity title (slugified)
 *   [entity:nid]        — entity numeric ID
 *   [entity:bundle]     — bundle machine name
 *   [entity:type]       — entity type (e.g. "node")
 *   [entity:langcode]   — language code
 *   [date:year]         — current year (YYYY)
 *   [date:month]        — current month (01-12)
 *   [date:day]          — current day (01-31)
 *
 * Default pattern: [entity:bundle]/[entity:title]
 */

import { saveConfig, loadConfig, loadAllConfig, deleteConfig } from './config-storage.js';
import { createAlias, slugify, deleteAliasesBySource } from './url-alias.js';
import { EventBus } from './event-bus.js';
import type { Entity } from './entity.js';
import { createLogger } from './logger.js';
import { db } from '../db/index.js';

const logger = createLogger('pathauto');

const CONFIG_PREFIX = 'pathauto.pattern.';
const DEFAULT_PATTERN = '[entity:bundle]/[entity:title]';

export interface PathautoPattern {
  id: string;
  entity_type: string;
  bundle: string | null;       // null means "all bundles" for this entity type
  pattern: string;
  weight: number;
  enabled: boolean;
}

// ── Pattern CRUD ──────────────────────────────────────────────────────────

export async function getPathautoPatterns(): Promise<PathautoPattern[]> {
  const allConfig = await loadAllConfig(CONFIG_PREFIX);
  const patterns: PathautoPattern[] = [];

  for (const [, data] of Object.entries(allConfig)) {
    patterns.push(data as unknown as PathautoPattern);
  }

  return patterns.sort((a, b) => a.weight - b.weight);
}

export async function getPathautoPattern(id: string): Promise<PathautoPattern | null> {
  const data = await loadConfig(`${CONFIG_PREFIX}${id}`);
  return data ? (data as unknown as PathautoPattern) : null;
}

export async function savePathautoPattern(pattern: PathautoPattern): Promise<PathautoPattern> {
  await saveConfig(`${CONFIG_PREFIX}${pattern.id}`, pattern as unknown as Record<string, unknown>);
  return pattern;
}

export async function deletePathautoPattern(id: string): Promise<void> {
  await deleteConfig(`${CONFIG_PREFIX}${id}`);
}

// ── Pattern Resolution ────────────────────────────────────────────────────

/**
 * Find the best matching pattern for an entity type + bundle.
 * Priority: bundle-specific > entity-type-wide > default
 */
export async function resolvePattern(
  entityType: string,
  bundle: string,
): Promise<string> {
  const patterns = await getPathautoPatterns();

  // Find bundle-specific match first
  const bundleMatch = patterns.find(
    (p) => p.enabled && p.entity_type === entityType && p.bundle === bundle,
  );
  if (bundleMatch) return bundleMatch.pattern;

  // Fall back to entity-type-wide (bundle = null)
  const typeMatch = patterns.find(
    (p) => p.enabled && p.entity_type === entityType && p.bundle === null,
  );
  if (typeMatch) return typeMatch.pattern;

  return DEFAULT_PATTERN;
}

// ── Token Replacement ─────────────────────────────────────────────────────

interface TokenContext {
  entityType: string;
  bundle: string;
  nid: number;
  title: string;
  langcode: string;
}

function replaceTokens(pattern: string, ctx: TokenContext): string {
  const now = new Date();

  return pattern
    .replace(/\[entity:title\]/g, slugify(ctx.title))
    .replace(/\[entity:nid\]/g, String(ctx.nid))
    .replace(/\[entity:bundle\]/g, ctx.bundle)
    .replace(/\[entity:type\]/g, ctx.entityType)
    .replace(/\[entity:langcode\]/g, ctx.langcode)
    .replace(/\[date:year\]/g, String(now.getFullYear()))
    .replace(/\[date:month\]/g, String(now.getMonth() + 1).padStart(2, '0'))
    .replace(/\[date:day\]/g, String(now.getDate()).padStart(2, '0'));
}

// ── Alias Generation ──────────────────────────────────────────────────────

/**
 * Generate an alias for an entity using the configured pathauto pattern.
 */
export async function generateAlias(
  entityType: string,
  bundle: string,
  entityId: number,
  title: string,
  langcode = 'en',
): Promise<{ source_path: string; alias_path: string } | null> {
  if (!title) return null;

  const pattern = await resolvePattern(entityType, bundle);
  const ctx: TokenContext = {
    entityType,
    bundle,
    nid: entityId,
    title,
    langcode,
  };

  const rawAlias = replaceTokens(pattern, ctx);
  if (!rawAlias) return null;

  const sourcePath = `/api/${entityType}/${bundle}/${entityId}`;
  let aliasPath = `/${rawAlias}`;

  // Deduplicate: check if this alias already exists for a different source
  let attempt = 0;
  while (true) {
    const existing = await db
      .select('path_alias')
      .fields(['id', 'path'])
      .condition('alias', aliasPath)
      .condition('langcode', langcode)
      .execute<{ id: number; path: string }>();

    if (existing.length === 0) break;
    if (existing[0].path === sourcePath) break;

    attempt++;
    aliasPath = `/${rawAlias}-${attempt}`;
  }

  const alias = await createAlias(sourcePath, aliasPath, langcode);
  return { source_path: alias.path, alias_path: alias.alias };
}

/**
 * Bulk-generate aliases for all entities of a given type/bundle.
 * Returns the number of aliases generated.
 */
export async function bulkGenerateAliases(
  entityType: string,
  bundle?: string,
): Promise<number> {
  const { Entity } = await import('./entity.js');

  let query = db
    .select('node')
    .fields(['nid', 'type', 'title', 'langcode'])
    .condition('entity_type', entityType);

  if (bundle) {
    query = query.condition('type', bundle);
  }

  const rows = await query.execute<{
    nid: number;
    type: string;
    title: string;
    langcode: string;
  }>();

  let count = 0;
  for (const row of rows) {
    if (!row.title) continue;
    const result = await generateAlias(
      entityType,
      row.type,
      row.nid,
      row.title,
      row.langcode,
    );
    if (result) count++;
  }

  logger.info(`Bulk generated ${count} aliases for ${entityType}${bundle ? `:${bundle}` : ''}`);
  return count;
}

// ── EventBus Hooks ────────────────────────────────────────────────────────

/**
 * Register pathauto hooks that replace the basic alias-hooks.
 * Call this instead of registerAliasHooks() when pathauto is active.
 */
export function registerPathautoHooks(): void {
  EventBus.on(
    'entity:insert',
    async (data: unknown) => {
      const entity = data as Entity;
      const title = entity.toJSON().title as string | undefined;
      if (title) {
        await generateAlias(
          entity.entityType,
          entity.bundle,
          entity.nid!,
          title,
          entity.langcode,
        );
      }
    },
    { priority: 90 },
  );

  EventBus.on(
    'entity:update',
    async (data: unknown) => {
      const entity = data as Entity;
      const title = entity.toJSON().title as string | undefined;
      if (title) {
        await generateAlias(
          entity.entityType,
          entity.bundle,
          entity.nid!,
          title,
          entity.langcode,
        );
      }
    },
    { priority: 90 },
  );

  EventBus.on(
    'entity:delete',
    async (data: unknown) => {
      const entity = data as Entity;
      const sourcePath = `/api/${entity.entityType}/${entity.bundle}/${entity.nid}`;
      await deleteAliasesBySource(sourcePath);
    },
    { priority: 90 },
  );
}
