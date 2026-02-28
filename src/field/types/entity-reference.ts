import { FieldType, type FieldSchema, type FieldSettings } from '../field-type.js';

export class EntityReferenceField extends FieldType {
  static override type = 'entity_reference';
  static override label = 'Entity Reference';

  static override schema(_settings?: FieldSettings): FieldSchema {
    return {
      columns: {
        target_id: { type: 'int', nullable: true },
      },
    };
  }

  static override validate(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'number') return Number.isInteger(value) && value > 0;
    return false;
  }

  static override serialize(value: unknown): unknown {
    if (value === null || value === undefined) return { target_id: null };
    const id = typeof value === 'string' ? parseInt(value, 10) : value;
    return { target_id: id };
  }

  static override deserialize(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object' && value !== null && 'target_id' in value) {
      return (value as Record<string, unknown>).target_id;
    }
    return value;
  }
}
