import { FieldType, type FieldSchema } from '../field-type.js';

export class JsonField extends FieldType {
  static override type = 'json';
  static override label = 'JSON';

  static override schema(): FieldSchema {
    return {
      columns: {
        value: { type: 'json', nullable: true },
      },
    };
  }

  static override validate(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    // Any serializable value is valid
    try {
      JSON.stringify(value);
      return true;
    } catch {
      return false;
    }
  }

  static override serialize(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  }

  static override deserialize(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }
}
