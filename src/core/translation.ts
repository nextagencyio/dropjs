/**
 * Multilingual/translation system for DropJS.
 *
 * Mirrors Drupal's content translation model:
 * - System tracks enabled languages via config (`system.languages`)
 * - Each entity has a `default_langcode` (original language)
 * - Translations are stored as additional rows in the *_field_data tables
 *   keyed by (nid, langcode) composite primary key
 * - Field values per language are stored in field tables keyed by
 *   (entity_id, deleted, delta, langcode)
 */

import { db } from '../db/index.js';
import { saveConfig, loadConfig } from './config-storage.js';
import { Entity } from './entity.js';
import { EventBus } from './event-bus.js';
import { createLogger } from './logger.js';

const logger = createLogger('translation');

// ── Types ──────────────────────────────────────────────────────────────────

export interface Language {
  /** ISO 639-1 code, e.g. 'en', 'fr', 'de' */
  id: string;
  label: string;
  /** Display direction: 'ltr' or 'rtl' */
  direction: 'ltr' | 'rtl';
  /** Sort weight — lower = higher priority */
  weight: number;
  /** Whether this language is enabled */
  enabled: boolean;
}

export interface TranslationInfo {
  langcode: string;
  label: string;
  status: 'translated' | 'untranslated';
}

// ── Language Configuration ─────────────────────────────────────────────────

const CONFIG_NAME = 'system.languages';

/** All known languages with defaults. */
const DEFAULT_LANGUAGES: Language[] = [
  { id: 'en', label: 'English', direction: 'ltr', weight: 0, enabled: true },
  { id: 'fr', label: 'French', direction: 'ltr', weight: 1, enabled: false },
  { id: 'de', label: 'German', direction: 'ltr', weight: 2, enabled: false },
  { id: 'es', label: 'Spanish', direction: 'ltr', weight: 3, enabled: false },
  { id: 'pt', label: 'Portuguese', direction: 'ltr', weight: 4, enabled: false },
  { id: 'it', label: 'Italian', direction: 'ltr', weight: 5, enabled: false },
  { id: 'nl', label: 'Dutch', direction: 'ltr', weight: 6, enabled: false },
  { id: 'ja', label: 'Japanese', direction: 'ltr', weight: 7, enabled: false },
  { id: 'zh', label: 'Chinese', direction: 'ltr', weight: 8, enabled: false },
  { id: 'ko', label: 'Korean', direction: 'ltr', weight: 9, enabled: false },
  { id: 'ar', label: 'Arabic', direction: 'rtl', weight: 10, enabled: false },
  { id: 'he', label: 'Hebrew', direction: 'rtl', weight: 11, enabled: false },
  { id: 'ru', label: 'Russian', direction: 'ltr', weight: 12, enabled: false },
  { id: 'uk', label: 'Ukrainian', direction: 'ltr', weight: 13, enabled: false },
  { id: 'pl', label: 'Polish', direction: 'ltr', weight: 14, enabled: false },
  { id: 'sv', label: 'Swedish', direction: 'ltr', weight: 15, enabled: false },
];

/**
 * Get all configured languages.
 */
export async function getLanguages(): Promise<Language[]> {
  const config = await loadConfig(CONFIG_NAME);
  if (config?.languages) {
    return config.languages as unknown as Language[];
  }
  return DEFAULT_LANGUAGES;
}

/**
 * Get only enabled languages.
 */
export async function getEnabledLanguages(): Promise<Language[]> {
  const languages = await getLanguages();
  return languages.filter((l) => l.enabled);
}

/**
 * Get the default site language.
 */
export async function getDefaultLanguage(): Promise<Language> {
  const enabled = await getEnabledLanguages();
  return enabled[0] ?? DEFAULT_LANGUAGES[0];
}

/**
 * Enable or disable a language.
 */
export async function setLanguageEnabled(langcode: string, enabled: boolean): Promise<void> {
  const languages = await getLanguages();
  const lang = languages.find((l) => l.id === langcode);
  if (!lang) {
    throw new Error(`Unknown language: ${langcode}`);
  }

  // Don't allow disabling the last enabled language
  if (!enabled) {
    const enabledCount = languages.filter((l) => l.enabled).length;
    if (enabledCount <= 1 && lang.enabled) {
      throw new Error('Cannot disable the last enabled language');
    }
  }

  lang.enabled = enabled;
  await saveConfig(CONFIG_NAME, { languages } as unknown as Record<string, unknown>);
  logger.info(`Language ${langcode} ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Add a new custom language.
 */
export async function addLanguage(language: Language): Promise<void> {
  const languages = await getLanguages();
  if (languages.find((l) => l.id === language.id)) {
    throw new Error(`Language "${language.id}" already exists`);
  }
  languages.push(language);
  await saveConfig(CONFIG_NAME, { languages } as unknown as Record<string, unknown>);
  logger.info(`Language added: ${language.id} (${language.label})`);
}

/**
 * Update an existing language.
 */
export async function updateLanguage(langcode: string, updates: Partial<Omit<Language, 'id'>>): Promise<void> {
  const languages = await getLanguages();
  const lang = languages.find((l) => l.id === langcode);
  if (!lang) {
    throw new Error(`Unknown language: ${langcode}`);
  }
  Object.assign(lang, updates);
  await saveConfig(CONFIG_NAME, { languages } as unknown as Record<string, unknown>);
}

/**
 * Remove a custom language. Cannot remove 'en'.
 */
export async function removeLanguage(langcode: string): Promise<void> {
  if (langcode === 'en') {
    throw new Error('Cannot remove the English language');
  }
  const languages = await getLanguages();
  const idx = languages.findIndex((l) => l.id === langcode);
  if (idx === -1) {
    throw new Error(`Unknown language: ${langcode}`);
  }
  languages.splice(idx, 1);
  await saveConfig(CONFIG_NAME, { languages } as unknown as Record<string, unknown>);
  logger.info(`Language removed: ${langcode}`);
}

// ── Translation CRUD ───────────────────────────────────────────────────────

/**
 * Get translation status for an entity across all enabled languages.
 */
export async function getTranslationStatus(
  entityType: string,
  id: number
): Promise<TranslationInfo[]> {
  const enabledLangs = await getEnabledLanguages();

  // Get existing translations
  const existing = await getExistingTranslations(entityType, id);
  const existingCodes = new Set(existing);

  return enabledLangs.map((lang) => ({
    langcode: lang.id,
    label: lang.label,
    status: existingCodes.has(lang.id) ? 'translated' as const : 'untranslated' as const,
  }));
}

/**
 * Get langcodes that have translations for an entity.
 */
export async function getExistingTranslations(
  entityType: string,
  id: number
): Promise<string[]> {
  if (entityType === 'node') {
    const rows = await db
      .select('node_field_data')
      .fields(['langcode'])
      .condition('nid', id)
      .execute<{ langcode: string }>();
    return rows.map((r) => r.langcode);
  }

  if (entityType === 'taxonomy_term') {
    const rows = await db
      .select('taxonomy_term_field_data')
      .fields(['langcode'])
      .condition('tid', id)
      .execute<{ langcode: string }>();
    return rows.map((r) => r.langcode);
  }

  return ['en'];
}

/**
 * Create a translation for an existing entity.
 *
 * Copies base data from the source language and applies overrides.
 */
export async function createTranslation(
  entityType: string,
  id: number,
  langcode: string,
  data: Record<string, unknown>
): Promise<Entity | null> {
  // Verify language is enabled
  const enabled = await getEnabledLanguages();
  if (!enabled.find((l) => l.id === langcode)) {
    throw new Error(`Language "${langcode}" is not enabled`);
  }

  // Check if translation already exists
  const existing = await getExistingTranslations(entityType, id);
  if (existing.includes(langcode)) {
    throw new Error(`Translation for language "${langcode}" already exists for ${entityType}:${id}`);
  }

  // Load the source entity (default language)
  const source = await Entity.load(entityType, id);
  if (!source) {
    throw new Error(`Entity ${entityType}:${id} not found`);
  }

  const now = Math.floor(Date.now() / 1000);

  if (entityType === 'node') {
    const sourceData = source.toJSON();

    // Insert translation row in node_field_data
    await db.insert('node_field_data').values({
      nid: id,
      vid: sourceData.vid as number,
      type: source.bundle,
      langcode,
      title: data.title ?? sourceData.title,
      uid: data.uid ?? sourceData.uid ?? 0,
      status: data.status !== undefined
        ? (typeof data.status === 'boolean' ? (data.status ? 1 : 0) : data.status)
        : sourceData.status,
      created: sourceData.created ?? now,
      changed: now,
      promote: sourceData.promote ?? 1,
      sticky: sourceData.sticky ?? 0,
      default_langcode: 0,
      revision_translation_affected: 1,
    }).execute();

    // Insert revision row for the translation
    await db.insert('node_field_revision').values({
      nid: id,
      vid: sourceData.vid as number,
      type: source.bundle,
      langcode,
      title: data.title ?? sourceData.title,
      uid: data.uid ?? sourceData.uid ?? 0,
      status: data.status !== undefined
        ? (typeof data.status === 'boolean' ? (data.status ? 1 : 0) : data.status)
        : sourceData.status,
      created: sourceData.created ?? now,
      changed: now,
      promote: sourceData.promote ?? 1,
      sticky: sourceData.sticky ?? 0,
      default_langcode: 0,
      revision_translation_affected: 1,
    }).execute();

    // Save field values for the translation
    const { fieldStorage } = await import('../field/index.js');
    const definition = source['_definition'];

    for (const [fieldName, fieldDef] of Object.entries(definition.fields)) {
      if (['title', 'status', 'uid'].includes(fieldName)) continue;
      // Skip base fields
      const baseFields = ['nid', 'vid', 'uuid', 'type', 'langcode', 'created', 'changed', 'promote', 'sticky', 'default_langcode', 'revision_translation_affected'];
      if (baseFields.includes(fieldName)) continue;

      const value = data[fieldName] ?? source.get(fieldName);
      if (value === null || value === undefined) continue;

      const values = Array.isArray(value) ? value : [value];
      await fieldStorage.saveFieldValuesWithLangcode(
        entityType,
        id,
        source.bundle,
        fieldName,
        (fieldDef as any).type,
        values,
        langcode,
        (fieldDef as any).settings,
        sourceData.vid as number
      );
    }
  } else if (entityType === 'taxonomy_term') {
    const sourceData = source.toJSON();

    // Insert translation row in taxonomy_term_field_data
    await db.insert('taxonomy_term_field_data').values({
      tid: id,
      vid: sourceData.vid as number,
      type: source.bundle,
      langcode,
      name: data.title ?? data.name ?? sourceData.title,
      status: data.status !== undefined
        ? (typeof data.status === 'boolean' ? (data.status ? 1 : 0) : data.status)
        : sourceData.status,
      changed: now,
      weight: sourceData.weight ?? 0,
      default_langcode: 0,
      revision_translation_affected: 1,
    }).execute();
  }

  // Invalidate cache
  const { entityCacheTags, cacheInvalidateTags } = await import('./cache.js');
  cacheInvalidateTags(entityCacheTags(entityType, id, source.bundle));

  await EventBus.emit('entity:translation:create', { entityType, id, langcode });
  logger.info(`Translation created: ${entityType}:${id} [${langcode}]`);

  // Load and return the new translation
  return Entity.loadTranslation(entityType, id, langcode);
}

/**
 * Update an existing translation.
 */
export async function updateTranslation(
  entityType: string,
  id: number,
  langcode: string,
  data: Record<string, unknown>
): Promise<Entity | null> {
  const existing = await getExistingTranslations(entityType, id);
  if (!existing.includes(langcode)) {
    throw new Error(`No translation for language "${langcode}" exists for ${entityType}:${id}`);
  }

  const now = Math.floor(Date.now() / 1000);

  if (entityType === 'node') {
    const updates: Record<string, unknown> = { changed: now };
    if (data.title !== undefined) updates.title = data.title;
    if (data.status !== undefined) {
      updates.status = typeof data.status === 'boolean' ? (data.status ? 1 : 0) : data.status;
    }
    updates.revision_translation_affected = 1;

    await db
      .update('node_field_data')
      .set(updates)
      .condition('nid', id)
      .condition('langcode', langcode)
      .execute();

    // Update field values
    const entity = await Entity.loadTranslation(entityType, id, langcode);
    if (entity) {
      const { fieldStorage } = await import('../field/index.js');
      const definition = entity['_definition'];

      for (const [fieldName, fieldDef] of Object.entries(definition.fields)) {
        if (['title', 'status', 'uid'].includes(fieldName)) continue;
        const baseFields = ['nid', 'vid', 'uuid', 'type', 'langcode', 'created', 'changed', 'promote', 'sticky', 'default_langcode', 'revision_translation_affected'];
        if (baseFields.includes(fieldName)) continue;

        if (data[fieldName] !== undefined) {
          const values = Array.isArray(data[fieldName]) ? data[fieldName] as unknown[] : [data[fieldName]];
          await fieldStorage.saveFieldValuesWithLangcode(
            entityType,
            id,
            entity.bundle,
            fieldName,
            (fieldDef as any).type,
            values,
            langcode,
            (fieldDef as any).settings,
            entity.vid
          );
        }
      }
    }
  } else if (entityType === 'taxonomy_term') {
    const updates: Record<string, unknown> = { changed: now };
    if (data.title !== undefined || data.name !== undefined) {
      updates.name = data.title ?? data.name;
    }
    if (data.status !== undefined) {
      updates.status = typeof data.status === 'boolean' ? (data.status ? 1 : 0) : data.status;
    }

    await db
      .update('taxonomy_term_field_data')
      .set(updates)
      .condition('tid', id)
      .condition('langcode', langcode)
      .execute();
  }

  // Invalidate cache
  const { entityCacheTags, cacheInvalidateTags } = await import('./cache.js');
  const entity = await Entity.load(entityType, id);
  if (entity) {
    cacheInvalidateTags(entityCacheTags(entityType, id, entity.bundle));
  }

  await EventBus.emit('entity:translation:update', { entityType, id, langcode });
  logger.info(`Translation updated: ${entityType}:${id} [${langcode}]`);

  return Entity.loadTranslation(entityType, id, langcode);
}

/**
 * Delete a translation for an entity. Cannot delete the default language.
 */
export async function deleteTranslation(
  entityType: string,
  id: number,
  langcode: string
): Promise<void> {
  // Can't delete the default language
  if (entityType === 'node') {
    const rows = await db
      .select('node_field_data')
      .fields(['default_langcode'])
      .condition('nid', id)
      .condition('langcode', langcode)
      .execute<{ default_langcode: number }>();

    if (rows.length === 0) {
      throw new Error(`No translation for language "${langcode}" exists`);
    }
    if (rows[0].default_langcode === 1) {
      throw new Error('Cannot delete the default language translation');
    }

    // Delete from node_field_data
    await db.delete('node_field_data').condition('nid', id).condition('langcode', langcode).execute();
    // Delete from node_field_revision
    await db.delete('node_field_revision').condition('nid', id).condition('langcode', langcode).execute();

    // Delete field values for this langcode
    const entity = await Entity.load(entityType, id);
    if (entity) {
      const { fieldStorage } = await import('../field/index.js');
      const definition = entity['_definition'];
      for (const [fieldName] of Object.entries(definition.fields)) {
        const baseFields = ['nid', 'vid', 'uuid', 'type', 'langcode', 'title', 'status', 'uid', 'created', 'changed', 'promote', 'sticky', 'default_langcode', 'revision_translation_affected'];
        if (baseFields.includes(fieldName)) continue;
        await fieldStorage.deleteFieldValuesForLangcode(entityType, id, fieldName, langcode);
      }
    }
  } else if (entityType === 'taxonomy_term') {
    const rows = await db
      .select('taxonomy_term_field_data')
      .fields(['default_langcode'])
      .condition('tid', id)
      .condition('langcode', langcode)
      .execute<{ default_langcode: number }>();

    if (rows.length === 0) {
      throw new Error(`No translation for language "${langcode}" exists`);
    }
    if (rows[0].default_langcode === 1) {
      throw new Error('Cannot delete the default language translation');
    }

    await db.delete('taxonomy_term_field_data').condition('tid', id).condition('langcode', langcode).execute();
  }

  // Invalidate cache
  const { entityCacheTags, cacheInvalidateTags } = await import('./cache.js');
  const entity = await Entity.load(entityType, id);
  if (entity) {
    cacheInvalidateTags(entityCacheTags(entityType, id, entity.bundle));
  }

  await EventBus.emit('entity:translation:delete', { entityType, id, langcode });
  logger.info(`Translation deleted: ${entityType}:${id} [${langcode}]`);
}

/**
 * Negotiate the best language for a request.
 *
 * Priority:
 * 1. Explicit ?lang= query parameter
 * 2. Accept-Language header
 * 3. Default site language
 */
export async function negotiateLanguage(
  queryLang?: string,
  acceptLanguageHeader?: string
): Promise<string> {
  const enabled = await getEnabledLanguages();
  const enabledCodes = new Set(enabled.map((l) => l.id));

  // 1. Explicit query parameter
  if (queryLang && enabledCodes.has(queryLang)) {
    return queryLang;
  }

  // 2. Accept-Language header
  if (acceptLanguageHeader) {
    const parsed = parseAcceptLanguage(acceptLanguageHeader);
    for (const { code } of parsed) {
      if (enabledCodes.has(code)) return code;
      // Try base language (e.g. 'en' from 'en-US')
      const base = code.split('-')[0];
      if (enabledCodes.has(base)) return base;
    }
  }

  // 3. Default
  const defaultLang = await getDefaultLanguage();
  return defaultLang.id;
}

/**
 * Parse Accept-Language header into sorted list of language preferences.
 */
function parseAcceptLanguage(header: string): Array<{ code: string; quality: number }> {
  return header
    .split(',')
    .map((part) => {
      const [code, ...params] = part.trim().split(';');
      let quality = 1;
      for (const param of params) {
        const match = param.trim().match(/^q=(.+)$/);
        if (match) quality = parseFloat(match[1]) || 0;
      }
      return { code: code.trim().toLowerCase(), quality };
    })
    .sort((a, b) => b.quality - a.quality);
}
