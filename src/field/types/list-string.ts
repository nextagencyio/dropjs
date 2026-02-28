import { FieldType, type FieldSchema, type FieldSettings } from '../field-type.js';

export class ListStringField extends FieldType {
  static override type = 'list_string';
  static override label = 'List (string)';

  static override schema(): FieldSchema {
    return {
      columns: {
        value: { type: 'varchar', length: 255, nullable: true },
      },
    };
  }

  static override validate(value: unknown, settings?: FieldSettings): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value !== 'string') return false;
    if (settings?.allowed_values) {
      return value in settings.allowed_values;
    }
    return true;
  }

  static override serialize(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    return String(value);
  }
}
