import { FieldType, type FieldSchema } from '../field-type.js';

export class TelephoneField extends FieldType {
  static override type = 'telephone';
  static override label = 'Telephone';

  static override schema(): FieldSchema {
    return {
      columns: {
        value: { type: 'varchar', length: 255, nullable: true },
      },
    };
  }

  static override validate(value: unknown): boolean {
    if (value === null || value === undefined || value === '') return true;
    if (typeof value !== 'string') return false;
    // Accept digits, spaces, hyphens, parens, plus sign, dots
    return /^[+\d\s\-().]+$/.test(value);
  }

  static override serialize(value: unknown): unknown {
    if (value === null || value === undefined || value === '') return null;
    return String(value).trim();
  }
}
