import { FieldType, type FieldSchema } from '../field-type.js';

export class ColorField extends FieldType {
  static override type = 'color';
  static override label = 'Color';

  static override schema(): FieldSchema {
    return {
      columns: {
        color: { type: 'varchar', length: 7, nullable: true },
        opacity: { type: 'float', nullable: true },
      },
    };
  }

  static override validate(value: unknown): boolean {
    if (value === null || value === undefined || value === '') return true;
    if (typeof value === 'string') {
      return /^#[0-9a-fA-F]{6}$/.test(value);
    }
    if (typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    if (v.color !== undefined && v.color !== null) {
      if (typeof v.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(v.color)) return false;
    }
    return true;
  }

  static override serialize(value: unknown): unknown {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'string') {
      return { color: value.toLowerCase(), opacity: null };
    }
    const v = value as Record<string, unknown>;
    return {
      color: v.color ? String(v.color).toLowerCase() : null,
      opacity: v.opacity ?? null,
    };
  }

  static override deserialize(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    return value;
  }
}
