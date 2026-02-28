import { FieldType, type FieldSchema } from '../field-type.js';

export class DateField extends FieldType {
  static override type = 'date';
  static override label = 'Date';

  static override schema(): FieldSchema {
    return {
      columns: {
        value: { type: 'varchar', length: 20, nullable: true },
      },
    };
  }

  static override validate(value: unknown): boolean {
    if (value === null || value === undefined || value === '') return true;
    if (typeof value !== 'string') return false;
    // Accept YYYY-MM-DD format
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
  }

  static override serialize(value: unknown): unknown {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'string') {
      // If full ISO datetime, extract just the date part
      if (value.includes('T')) {
        return value.slice(0, 10);
      }
      return value;
    }
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
    return String(value);
  }

  static override deserialize(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    return String(value);
  }
}
