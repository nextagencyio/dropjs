import type { FieldSettings } from '../field/index.js';
import type { DrupalFieldStorage, DrupalFieldInstance } from './types.js';

interface FieldMapping {
  type: string;
  settingsTransform?: (storage: DrupalFieldStorage, instance: DrupalFieldInstance) => FieldSettings;
}

function mapStringSettings(storage: DrupalFieldStorage): FieldSettings {
  const maxLength = (storage.settings as Record<string, unknown>)?.max_length ?? 255;
  return { max_length: maxLength as number };
}

function mapDecimalSettings(storage: DrupalFieldStorage): FieldSettings {
  const s = storage.settings as Record<string, unknown>;
  const precision = (s?.precision as number) ?? 10;
  const scale = (s?.scale as number) ?? 2;
  return { precision, scale };
}

function mapEntityRefSettings(storage: DrupalFieldStorage, instance: DrupalFieldInstance): FieldSettings {
  const targetType = (storage.settings as Record<string, unknown>)?.target_type as string ?? 'node';
  const dropjsTargetType = targetType === 'taxonomy_term' ? 'taxonomy_term' : 'node';
  const handlerSettings = (instance.settings as Record<string, Record<string, unknown>>)?.handler_settings;
  const targetBundles = handlerSettings?.target_bundles as Record<string, string> | undefined;
  const targetBundle = targetBundles ? Object.keys(targetBundles)[0] : undefined;

  return {
    target_type: dropjsTargetType,
    ...(targetBundle ? { target_bundle: targetBundle } : {}),
  };
}

function mapEntityRefRevisionsSettings(storage: DrupalFieldStorage, instance: DrupalFieldInstance): FieldSettings {
  const targetType = (storage.settings as Record<string, unknown>)?.target_type as string ?? 'paragraph';
  const dropjsTargetType = targetType === 'paragraph' ? 'paragraph' : 'node';
  const handlerSettings = (instance.settings as Record<string, Record<string, unknown>>)?.handler_settings;
  const targetBundles = handlerSettings?.target_bundles as Record<string, string> | undefined;
  const targetBundle = targetBundles ? Object.keys(targetBundles)[0] : undefined;

  return {
    target_type: dropjsTargetType,
    ...(targetBundle ? { target_bundle: targetBundle } : {}),
  };
}

function mapListStringSettings(storage: DrupalFieldStorage): FieldSettings {
  const allowed = (storage.settings as Record<string, unknown>)?.allowed_values;
  if (Array.isArray(allowed)) {
    const allowedValues: Record<string, string> = {};
    for (const item of allowed as Array<{ value: string; label: string }>) {
      allowedValues[item.value] = item.label;
    }
    return { allowed_values: allowedValues };
  }
  return {};
}

const FIELD_TYPE_MAP: Record<string, FieldMapping> = {
  'string':                     { type: 'string', settingsTransform: mapStringSettings },
  'string_long':                { type: 'string' },
  'text':                       { type: 'text_long' },
  'text_long':                  { type: 'text_long' },
  'text_with_summary':          { type: 'text_long' },
  'integer':                    { type: 'integer' },
  'float':                      { type: 'float' },
  'decimal':                    { type: 'decimal', settingsTransform: mapDecimalSettings },
  'boolean':                    { type: 'boolean' },
  'email':                      { type: 'email' },
  'timestamp':                  { type: 'timestamp' },
  'datetime':                   { type: 'timestamp' },
  'created':                    { type: 'timestamp' },
  'changed':                    { type: 'timestamp' },
  'entity_reference':           { type: 'entity_reference', settingsTransform: mapEntityRefSettings },
  'entity_reference_revisions': { type: 'entity_reference', settingsTransform: mapEntityRefRevisionsSettings },
  'image':                      { type: 'image' },
  'list_string':                { type: 'list_string', settingsTransform: mapListStringSettings },
  'list_integer':               { type: 'json' },
  'list_float':                 { type: 'json' },
  'link':                       { type: 'json' },
  'file':                       { type: 'json' },
  'telephone':                  { type: 'string' },
  'color_field':                { type: 'string' },
};

export function mapDrupalFieldType(
  storage: DrupalFieldStorage,
  instance: DrupalFieldInstance,
): { type: string; settings?: FieldSettings } {
  const mapping = FIELD_TYPE_MAP[storage.type];
  if (!mapping) {
    return { type: 'json' };
  }

  const settings = mapping.settingsTransform
    ? mapping.settingsTransform(storage, instance)
    : undefined;

  return { type: mapping.type, settings };
}

export function getFieldTypeMap(): Record<string, FieldMapping> {
  return { ...FIELD_TYPE_MAP };
}
