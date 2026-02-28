import { FieldType, type FieldSchema } from '../field-type.js';

export class FloatField extends FieldType {
  static override type = 'float';
  static override label = 'Float';

  static override schema(): FieldSchema {
    return {
      columns: {
        value: { type: 'float', nullable: true },
      },
    };
  }

  static override validate(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    return typeof value === 'number' && isFinite(value);
  }

  static override serialize(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    return typeof value === 'string' ? parseFloat(value) : value;
  }
}
