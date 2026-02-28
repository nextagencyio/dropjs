import { FieldType, type FieldSchema } from '../field-type.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class EmailField extends FieldType {
  static override type = 'email';
  static override label = 'Email';

  static override schema(): FieldSchema {
    return {
      columns: {
        value: { type: 'varchar', length: 255, nullable: true },
      },
    };
  }

  static override validate(value: unknown): boolean {
    if (value === null || value === undefined || value === '') return true;
    return typeof value === 'string' && EMAIL_REGEX.test(value);
  }

  static override serialize(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    return String(value).toLowerCase().trim();
  }
}
