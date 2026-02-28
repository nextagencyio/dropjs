/**
 * Drupal compatibility layer.
 *
 * Ensures the SQLite database contains all the config entries, key_value
 * entries, and cache tables that a real Drupal installation expects.
 * This allows the database to be dropped into a Drupal sites/default/
 * folder and used without modification (only settings.php needed).
 */

import { db, schema as dbSchema } from '../db/index.js';
import type { TableDefinition } from '../db/index.js';
import { serialize } from 'php-serialize';
import {
  saveConfig,
  loadConfig,
  saveNodeTypeConfig,
  saveFieldStorageConfig,
  saveFieldInstanceConfig,
  saveTaxonomyVocabularyConfig,
} from './config-storage.js';
import { getAllEntityTypes } from './entity-type.js';
import {
  DRUPAL_KEY_VALUE_TABLE,
  DRUPAL_BLOCK_CONTENT_TABLE,
  DRUPAL_BLOCK_CONTENT_FIELD_DATA_TABLE,
  DRUPAL_BLOCK_CONTENT_REVISION_TABLE,
  DRUPAL_BLOCK_CONTENT_FIELD_REVISION_TABLE,
  DRUPAL_MENU_LINK_CONTENT_TABLE,
  DRUPAL_MENU_LINK_CONTENT_DATA_TABLE,
  DRUPAL_MENU_LINK_CONTENT_REVISION_TABLE,
  DRUPAL_FLOOD_TABLE,
  DRUPAL_HISTORY_TABLE,
  DRUPAL_MENU_TREE_TABLE,
  DRUPAL_BATCH_TABLE,
  DRUPAL_WATCHDOG_TABLE,
} from './drupal-schema.js';

// ── Cache table schema (matches Drupal's cache bin tables) ──────────────

function cacheBinSchema(tableName: string): TableDefinition {
  return {
    fields: {
      cid: { type: 'varchar', length: 255, nullable: false },
      data: { type: 'blob', nullable: true },
      expire: { type: 'int', nullable: false, default: 0 },
      created: { type: 'varchar', length: 14, nullable: false, default: '0' },
      serialized: { type: 'int', unsigned: true, nullable: false, default: 0 },
      tags: { type: 'text', nullable: true },
      checksum: { type: 'varchar', length: 255, nullable: true },
    },
    primaryKey: ['cid'],
    indexes: {
      [`${tableName}__expire`]: ['expire'],
      [`${tableName}__created`]: ['created'],
    },
  };
}

const DRUPAL_CACHETAGS_TABLE: TableDefinition = {
  fields: {
    tag: { type: 'varchar', length: 255, nullable: false },
    invalidations: { type: 'int', nullable: false, default: 0 },
  },
  primaryKey: ['tag'],
};

const DRUPAL_SEMAPHORE_TABLE: TableDefinition = {
  fields: {
    name: { type: 'varchar', length: 255, nullable: false },
    value: { type: 'varchar', length: 255, nullable: false },
    expire: { type: 'varchar', length: 14, nullable: false },
  },
  primaryKey: ['name'],
  indexes: {
    semaphore__expire: ['expire'],
  },
};

const DRUPAL_ROUTER_TABLE: TableDefinition = {
  fields: {
    name: { type: 'varchar', length: 255, nullable: false },
    path: { type: 'varchar', length: 255, nullable: true, default: '' },
    pattern_outline: { type: 'varchar', length: 255, nullable: true, default: '' },
    fit: { type: 'int', nullable: true, default: 0 },
    route: { type: 'blob', nullable: true },
    number_parts: { type: 'int', unsigned: true, nullable: true, default: 0 },
    alias: { type: 'varchar', length: 255, nullable: true },
  },
  primaryKey: ['name'],
  indexes: {
    pattern_outline_parts: ['pattern_outline', 'number_parts'],
  },
};

/**
 * Cache bins that Drupal creates by default.
 */
const CACHE_BINS = [
  'cache_bootstrap',
  'cache_config',
  'cache_container',
  'cache_data',
  'cache_default',
  'cache_discovery',
  'cache_entity',
  'cache_menu',
  'cache_render',
  'cache_page',
];

// ── Core module list (matches a minimal Drupal install) ─────────────────

const CORE_MODULES: Record<string, number> = {
  system: 0,
  user: 0,
  node: 0,
  field: 0,
  text: 0,
  file: 0,
  image: 0,
  link: 0,
  taxonomy: 0,
  path: 0,
  path_alias: 0,
  options: 0,
  filter: 0,
  serialization: 0,
  jsonapi: 0,
  dblog: 0,
  block_content: 0,
  menu_link_content: 0,
  comment: 0,
  media: 0,
};

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Ensure all Drupal-expected infrastructure exists in the database.
 * Safe to call on every startup — only writes missing entries.
 */
export async function ensureDrupalCompat(): Promise<void> {
  await ensureCacheTables();
  await ensureInfrastructureTables();
  await seedCoreExtension();
  await seedSystemTheme();
  await seedSystemSite();
  await seedUserSettings();
  await seedDateFormats();
  await syncEntityTypeConfigs();
  await seedSystemSchema();
}

// ── Cache tables ────────────────────────────────────────────────────────

async function ensureCacheTables(): Promise<void> {
  for (const bin of CACHE_BINS) {
    await dbSchema.createTable(bin, cacheBinSchema(bin));
  }
  await dbSchema.createTable('cachetags', DRUPAL_CACHETAGS_TABLE);
}

// ── Infrastructure tables ───────────────────────────────────────────────

async function ensureInfrastructureTables(): Promise<void> {
  await dbSchema.createTable('semaphore', DRUPAL_SEMAPHORE_TABLE);
  await dbSchema.createTable('router', DRUPAL_ROUTER_TABLE);
  await dbSchema.createTable('key_value', DRUPAL_KEY_VALUE_TABLE);

  // Block content entity tables
  await dbSchema.createTable('block_content', DRUPAL_BLOCK_CONTENT_TABLE);
  await dbSchema.createTable('block_content_field_data', DRUPAL_BLOCK_CONTENT_FIELD_DATA_TABLE);
  await dbSchema.createTable('block_content_revision', DRUPAL_BLOCK_CONTENT_REVISION_TABLE);
  await dbSchema.createTable('block_content_field_revision', DRUPAL_BLOCK_CONTENT_FIELD_REVISION_TABLE);

  // Menu link content entity tables
  await dbSchema.createTable('menu_link_content', DRUPAL_MENU_LINK_CONTENT_TABLE);
  await dbSchema.createTable('menu_link_content_data', DRUPAL_MENU_LINK_CONTENT_DATA_TABLE);
  await dbSchema.createTable('menu_link_content_revision', DRUPAL_MENU_LINK_CONTENT_REVISION_TABLE);

  // Core infrastructure tables
  await dbSchema.createTable('flood', DRUPAL_FLOOD_TABLE);
  await dbSchema.createTable('history', DRUPAL_HISTORY_TABLE);
  await dbSchema.createTable('menu_tree', DRUPAL_MENU_TREE_TABLE);
  await dbSchema.createTable('batch', DRUPAL_BATCH_TABLE);
  await dbSchema.createTable('watchdog', DRUPAL_WATCHDOG_TABLE);
}

// ── core.extension ──────────────────────────────────────────────────────

async function seedCoreExtension(): Promise<void> {
  const existing = await loadConfig('core.extension');
  if (existing) return;

  const modules: Record<string, number> = { ...CORE_MODULES };

  await saveConfig('core.extension', {
    module: modules,
    theme: {
      claro: 0,
    },
    profile: 'standard',
  });
}

// ── system.theme ────────────────────────────────────────────────────────

async function seedSystemTheme(): Promise<void> {
  const existing = await loadConfig('system.theme');
  if (existing) return;

  await saveConfig('system.theme', {
    admin: 'claro',
    default: 'claro',
  });
}

// ── system.site ─────────────────────────────────────────────────────────

async function seedSystemSite(): Promise<void> {
  const existing = await loadConfig('system.site');
  if (existing) return;

  await saveConfig('system.site', {
    uuid: crypto.randomUUID(),
    name: 'drop.js',
    mail: 'admin@example.com',
    slogan: '',
    page: {
      front: '/node',
      '403': '',
      '404': '',
    },
    admin_compact_mode: false,
    weight_select_max: 100,
    langcode: 'en',
    default_langcode: 'en',
  });
}

// ── Date formats ───────────────────────────────────────────────────────

const DATE_FORMATS: Record<string, { label: string; pattern: string }> = {
  long: { label: 'Default long date', pattern: 'l, F j, Y - H:i' },
  medium: { label: 'Default medium date', pattern: 'D, m/d/Y - H:i' },
  short: { label: 'Default short date', pattern: 'm/d/Y - H:i' },
  html_date: { label: 'HTML Date', pattern: 'Y-m-d' },
  html_datetime: { label: 'HTML Datetime', pattern: 'Y-m-d\\TH:i:sO' },
  html_month: { label: 'HTML Month', pattern: 'Y-m' },
  html_time: { label: 'HTML Time', pattern: 'H:i:s' },
  html_week: { label: 'HTML Week', pattern: 'Y-\\WW' },
  html_year: { label: 'HTML Year', pattern: 'Y' },
  html_yearless_date: { label: 'HTML Yearless date', pattern: 'm-d' },
  fallback: { label: 'Fallback date format', pattern: 'D, m/d/Y - H:i' },
};

async function seedDateFormats(): Promise<void> {
  for (const [id, fmt] of Object.entries(DATE_FORMATS)) {
    const key = `core.date_format.${id}`;
    const existing = await loadConfig(key);
    if (existing) continue;

    await saveConfig(key, {
      uuid: crypto.randomUUID(),
      langcode: 'en',
      status: true,
      id,
      label: fmt.label,
      locked: id.startsWith('html_') || id === 'fallback',
      pattern: fmt.pattern,
    });
  }
}

// ── user.settings ──────────────────────────────────────────────────────

async function seedUserSettings(): Promise<void> {
  const existing = await loadConfig('user.settings');
  if (existing) return;

  await saveConfig('user.settings', {
    anonymous: 'Anonymous',
    verify_mail: true,
    notify: {
      cancel_confirm: true,
      password_reset: true,
      status_activated: true,
      status_blocked: false,
      status_canceled: false,
      register_admin_created: true,
      register_no_approval_required: true,
      register_pending_approval: true,
    },
    register: 'visitors_admin_approval',
    cancel_method: 'user_cancel_block',
    password_reset_timeout: 86400,
    password_strength: true,
    langcode: 'en',
  });
}

// ── Entity type → config sync ───────────────────────────────────────────

/**
 * For each registered entity type, ensure the corresponding Drupal
 * config entries exist (node.type.*, field.storage.*, field.field.*,
 * taxonomy.vocabulary.*).
 */
async function syncEntityTypeConfigs(): Promise<void> {
  const types = getAllEntityTypes();

  for (const def of types) {
    if (def.entity_type === 'node') {
      // node.type.{bundle}
      const ntKey = `node.type.${def.bundle}`;
      const existing = await loadConfig(ntKey);
      if (!existing) {
        await saveNodeTypeConfig(def.bundle, def.label, def.description ?? '');
      }

      // field.storage.* and field.field.* for each custom field
      for (const [fieldName, fieldDef] of Object.entries(def.fields)) {
        const storageKey = `field.storage.node.${fieldName}`;
        const storageExisting = await loadConfig(storageKey);
        if (!storageExisting) {
          await saveFieldStorageConfig('node', fieldName, fieldDef.type, {
            cardinality: fieldDef.cardinality ?? 1,
            ...(fieldDef.settings ?? {}),
          });
        }

        const instanceKey = `field.field.node.${def.bundle}.${fieldName}`;
        const instanceExisting = await loadConfig(instanceKey);
        if (!instanceExisting) {
          await saveFieldInstanceConfig(
            'node',
            def.bundle,
            fieldName,
            fieldDef.type,
            fieldDef.label,
            fieldDef.required ?? false,
            fieldDef.settings ?? {}
          );
        }
      }
    } else if (def.entity_type === 'taxonomy_term') {
      // taxonomy.vocabulary.{bundle}
      const vocabKey = `taxonomy.vocabulary.${def.bundle}`;
      const existing = await loadConfig(vocabKey);
      if (!existing) {
        await saveTaxonomyVocabularyConfig(def.bundle, def.label, def.description ?? '');
      }

      // field.storage.* and field.field.* for custom fields
      for (const [fieldName, fieldDef] of Object.entries(def.fields)) {
        const storageKey = `field.storage.taxonomy_term.${fieldName}`;
        const storageExisting = await loadConfig(storageKey);
        if (!storageExisting) {
          await saveFieldStorageConfig('taxonomy_term', fieldName, fieldDef.type, {
            cardinality: fieldDef.cardinality ?? 1,
            ...(fieldDef.settings ?? {}),
          });
        }

        const instanceKey = `field.field.taxonomy_term.${def.bundle}.${fieldName}`;
        const instanceExisting = await loadConfig(instanceKey);
        if (!instanceExisting) {
          await saveFieldInstanceConfig(
            'taxonomy_term',
            def.bundle,
            fieldName,
            fieldDef.type,
            fieldDef.label,
            fieldDef.required ?? false,
            fieldDef.settings ?? {}
          );
        }
      }
    }
  }
}

// ── system.schema (key_value) ───────────────────────────────────────────

/**
 * Seed system.schema entries in the key_value table for all "installed"
 * modules. Drupal checks these during bootstrap to know which modules
 * are installed and at which schema version.
 */
async function seedSystemSchema(): Promise<void> {
  for (const [moduleName, schemaVersion] of Object.entries(CORE_MODULES)) {
    const existing = await db
      .select('key_value')
      .fields(['value'])
      .condition('collection', 'system.schema')
      .condition('name', moduleName)
      .execute<{ value: Buffer | string | null }>();

    if (existing.length === 0) {
      const serialized = Buffer.from(serialize(schemaVersion));
      await db.insert('key_value').values({
        collection: 'system.schema',
        name: moduleName,
        value: serialized,
      }).execute();
    }
  }
}
