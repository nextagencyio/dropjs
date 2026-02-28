import { FieldType, type FieldSchema } from '../field-type.js';

export class FileField extends FieldType {
  static override type = 'file';
  static override label = 'File';

  static override schema(): FieldSchema {
    return {
      columns: {
        target_id: { type: 'int', nullable: true },
        display: { type: 'int', nullable: true },
        description: { type: 'varchar', length: 512, nullable: true },
      },
    };
  }

  static override validate(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'number') return Number.isInteger(value);
    if (typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    if (v.target_id !== undefined && v.target_id !== null) {
      if (typeof v.target_id !== 'number' || !Number.isInteger(v.target_id)) return false;
    }
    return true;
  }

  static override serialize(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') {
      return { target_id: value, display: 1, description: null };
    }
    const v = value as Record<string, unknown>;
    return {
      target_id: v.target_id ?? v.fid ?? null,
      display: v.display ?? 1,
      description: v.description ?? null,
    };
  }

  static override deserialize(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    const v = value as Record<string, unknown>;
    const targetId = v.target_id;
    if (targetId == null) return v;
    return {
      ...v,
      url: `/api/files/${targetId}/download`,
    };
  }
}
