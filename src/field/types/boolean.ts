import { FieldType, type FieldSchema } from '../field-type.js';

export class BooleanField extends FieldType {
  static override type = 'boolean';
  static override label = 'Boolean';

  static override schema(): FieldSchema {
    return {
      columns: {
        value: { type: 'int', unsigned: true, nullable: true },
      },
    };
  }

  static override validate(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    return typeof value === 'boolean' || value === 0 || value === 1;
  }

  static override serialize(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    return value ? 1 : 0;
  }

  static override deserialize(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    return Boolean(value);
  }
}
