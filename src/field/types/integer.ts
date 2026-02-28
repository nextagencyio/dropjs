import { FieldType, type FieldSchema } from '../field-type.js';

export class IntegerField extends FieldType {
  static override type = 'integer';
  static override label = 'Integer';

  static override schema(): FieldSchema {
    return {
      columns: {
        value: { type: 'int', nullable: true },
      },
    };
  }

  static override validate(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    return typeof value === 'number' && Number.isInteger(value);
  }

  static override serialize(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    return typeof value === 'string' ? parseInt(value, 10) : value;
  }
}
