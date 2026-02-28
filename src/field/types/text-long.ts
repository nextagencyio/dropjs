import { FieldType, type FieldSchema } from '../field-type.js';

export class TextLongField extends FieldType {
  static override type = 'text_long';
  static override label = 'Long text with format';

  static override schema(): FieldSchema {
    return {
      columns: {
        value: { type: 'text', nullable: true },
        format: { type: 'varchar', length: 255, nullable: true },
      },
    };
  }

  static override validate(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return true;
    if (typeof value === 'object' && value !== null) {
      const v = value as Record<string, unknown>;
      return typeof v.value === 'string' || v.value === null || v.value === undefined;
    }
    return false;
  }

  static override serialize(value: unknown): unknown {
    if (value === null || value === undefined) return { value: null, format: null };
    if (typeof value === 'string') return { value, format: 'plain_text' };
    return value;
  }

  static override deserialize(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    return value;
  }
}
