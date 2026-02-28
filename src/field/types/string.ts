import { FieldType, type FieldSchema, type FieldSettings } from '../field-type.js';

export class StringField extends FieldType {
  static override type = 'string';
  static override label = 'Short text';

  static override schema(settings?: FieldSettings): FieldSchema {
    return {
      columns: {
        value: {
          type: 'varchar',
          length: settings?.max_length ?? 255,
          nullable: true,
        },
      },
    };
  }

  static override validate(value: unknown, settings?: FieldSettings): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value !== 'string') return false;
    const maxLen = settings?.max_length ?? 255;
    return value.length <= maxLen;
  }

  static override serialize(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    return String(value);
  }
}
