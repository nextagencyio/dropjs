import { FieldType, type FieldSchema } from '../field-type.js';

export class TimestampField extends FieldType {
  static override type = 'timestamp';
  static override label = 'Timestamp';

  static override schema(): FieldSchema {
    return {
      columns: {
        value: { type: 'int', unsigned: true, nullable: true },
      },
    };
  }

  static override validate(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (value instanceof Date) return !isNaN(value.getTime());
    if (typeof value === 'string') return !isNaN(Date.parse(value));
    if (typeof value === 'number') return isFinite(value);
    return false;
  }

  static override serialize(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return Math.floor(value.getTime() / 1000);
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Math.floor(new Date(value).getTime() / 1000);
    return value;
  }

  static override deserialize(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    // Keep as number (Unix timestamp)
    if (typeof value === 'number') return value;
    return value;
  }
}
