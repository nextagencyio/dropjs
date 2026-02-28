import type { ColumnDefinition } from '../db/index.js';

export interface FieldSchema {
  columns: Record<string, ColumnDefinition>;
}

export interface FieldSettings {
  max_length?: number;
  precision?: number;
  scale?: number;
  allowed_values?: Record<string, string>;
  target_type?: string;
  target_bundle?: string;
  max_resolution?: string;
  file_extensions?: string[];
  [key: string]: unknown;
}

export abstract class FieldType {
  static type: string;
  static label: string;

  static schema(_settings?: FieldSettings): FieldSchema {
    throw new Error('FieldType.schema() must be implemented by subclass');
  }

  static validate(_value: unknown, _settings?: FieldSettings): boolean {
    return true;
  }

  static serialize(value: unknown, _settings?: FieldSettings): unknown {
    return value;
  }

  static deserialize(value: unknown, _settings?: FieldSettings): unknown {
    return value;
  }
}

// Global field type registry
const fieldTypeRegistry = new Map<string, typeof FieldType>();

export function registerFieldType(fieldType: typeof FieldType): void {
  if (!fieldType.type) {
    throw new Error('FieldType must have a static "type" property');
  }
  fieldTypeRegistry.set(fieldType.type, fieldType);
}

export function getFieldType(type: string): typeof FieldType {
  const fieldType = fieldTypeRegistry.get(type);
  if (!fieldType) {
    throw new Error(`Unknown field type: "${type}". Available types: ${[...fieldTypeRegistry.keys()].join(', ')}`);
  }
  return fieldType;
}

export function getRegisteredFieldTypes(): Map<string, typeof FieldType> {
  return new Map(fieldTypeRegistry);
}
