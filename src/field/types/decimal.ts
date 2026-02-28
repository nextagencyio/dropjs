import { FieldType, type FieldSchema, type FieldSettings } from '../field-type.js';

export class DecimalField extends FieldType {
  static override type = 'decimal';
  static override label = 'Decimal';

  static override schema(settings?: FieldSettings): FieldSchema {
    return {
      columns: {
        value: {
          type: 'decimal',
          precision: settings?.precision ?? 10,
          scale: settings?.scale ?? 2,
          nullable: true,
        },
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
