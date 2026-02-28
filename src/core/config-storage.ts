import { db, schema as dbSchema } from '../db/index.js';
import { serialize, unserialize } from 'php-serialize';
import { v4 as uuidv4 } from 'uuid';
import { DRUPAL_CONFIG_TABLE } from './drupal-schema.js';
import { getCacheBin, configCacheTags, cacheInvalidateTags } from './cache.js';

/** Parse a config value that may be stored as raw JSON or PHP-serialized. */
function parseConfigValue(raw: Buffer | string): unknown {
  const str = typeof raw === 'string' ? raw : raw.toString('utf-8');
  try {
    return unserialize(str);
  } catch {
    return JSON.parse(str);
  }
}

export async function ensureConfigTable(): Promise<void> {
  await dbSchema.createTable('config', DRUPAL_CONFIG_TABLE);
}

export async function saveConfig(
  name: string,
  data: Record<string, unknown>,
  collection: string = ''
): Promise<void> {
  const serialized = Buffer.from(serialize(data));

  const existing = await db
    .select('config')
    .fields(['name'])
    .condition('collection', collection)
    .condition('name', name)
    .execute<{ name: string }>();

  if (existing.length > 0) {
    await db
      .update('config')
      .set({ data: serialized })
      .condition('collection', collection)
      .condition('name', name)
      .execute();
  } else {
    await db.insert('config').values({
      collection,
      name,
      data: serialized,
    }).execute();
  }

  // Invalidate config cache
  cacheInvalidateTags(configCacheTags(name));
}

export async function loadConfig(
  name: string,
  collection: string = ''
): Promise<Record<string, unknown> | null> {
  const cacheKey = `config:${collection}:${name}`;
  const cache = getCacheBin('config');
  const cached = cache.get<Record<string, unknown> | null>(cacheKey);
  if (cached !== undefined) return cached;

  const rows = await db
    .select('config')
    .fields(['data'])
    .condition('collection', collection)
    .condition('name', name)
    .execute<{ data: Buffer | string | null }>();

  if (rows.length === 0 || !rows[0].data) {
    cache.set(cacheKey, null, configCacheTags(name), 600);
    return null;
  }

  const result = parseConfigValue(rows[0].data) as Record<string, unknown>;
  cache.set(cacheKey, result, configCacheTags(name), 600);
  return result;
}

export async function loadAllConfig(
  prefix: string,
  collection: string = ''
): Promise<Record<string, Record<string, unknown>>> {
  const rows = await db
    .select('config')
    .fields(['name', 'data'])
    .condition('collection', collection)
    .condition('name', `${prefix}%`, 'LIKE')
    .execute<{ name: string; data: Buffer | string | null }>();

  const result: Record<string, Record<string, unknown>> = {};
  for (const row of rows) {
    if (!row.data) continue;
    result[row.name] = parseConfigValue(row.data) as Record<string, unknown>;
  }
  return result;
}

export async function deleteConfig(
  name: string,
  collection: string = ''
): Promise<boolean> {
  const result = await db
    .delete('config')
    .condition('collection', collection)
    .condition('name', name)
    .execute();

  // Invalidate config cache
  cacheInvalidateTags(configCacheTags(name));
  return result > 0;
}

export async function saveNodeTypeConfig(
  bundle: string,
  label: string,
  description: string = ''
): Promise<void> {
  await saveConfig(`node.type.${bundle}`, {
    uuid: uuidv4(),
    langcode: 'en',
    status: true,
    name: label,
    type: bundle,
    description,
    help: '',
    new_revision: true,
    preview_mode: 1,
    display_submitted: true,
  });
}

export async function saveFieldStorageConfig(
  entityType: string,
  fieldName: string,
  fieldType: string,
  settings: Record<string, unknown> = {}
): Promise<void> {
  await saveConfig(`field.storage.${entityType}.${fieldName}`, {
    uuid: uuidv4(),
    langcode: 'en',
    status: true,
    id: `${entityType}.${fieldName}`,
    field_name: fieldName,
    entity_type: entityType,
    type: fieldType,
    settings,
    module: 'core',
    locked: false,
    cardinality: settings.cardinality ?? 1,
    translatable: true,
    indexes: {},
    persist_with_no_fields: false,
    custom_storage: false,
  });
}

export async function saveFieldInstanceConfig(
  entityType: string,
  bundle: string,
  fieldName: string,
  fieldType: string,
  label: string,
  required: boolean = false,
  settings: Record<string, unknown> = {}
): Promise<void> {
  await saveConfig(`field.field.${entityType}.${bundle}.${fieldName}`, {
    uuid: uuidv4(),
    langcode: 'en',
    status: true,
    id: `${entityType}.${bundle}.${fieldName}`,
    field_name: fieldName,
    entity_type: entityType,
    bundle,
    label,
    description: '',
    required,
    translatable: false,
    default_value: [],
    default_value_callback: '',
    settings,
    field_type: fieldType,
  });
}

export async function saveTaxonomyVocabularyConfig(
  vid: string,
  name: string,
  description: string = ''
): Promise<void> {
  await saveConfig(`taxonomy.vocabulary.${vid}`, {
    uuid: uuidv4(),
    langcode: 'en',
    status: true,
    vid,
    name,
    description,
    weight: 0,
  });
}
