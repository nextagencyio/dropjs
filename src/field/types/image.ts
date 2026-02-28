import { FieldType, type FieldSchema } from '../field-type.js';

export class ImageField extends FieldType {
  static override type = 'image';
  static override label = 'Image';

  static override schema(): FieldSchema {
    return {
      columns: {
        target_id: { type: 'int', nullable: true },
        alt: { type: 'varchar', length: 512, nullable: true },
        title: { type: 'varchar', length: 255, nullable: true },
        width: { type: 'int', nullable: true },
        height: { type: 'int', nullable: true },
      },
    };
  }

  static override validate(value: unknown): boolean {
    if (value === null || value === undefined) return true;
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
      return { target_id: value, alt: null, title: null, width: null, height: null };
    }
    const v = value as Record<string, unknown>;
    return {
      target_id: v.target_id ?? v.fid ?? null,
      alt: v.alt ?? null,
      title: v.title ?? null,
      width: v.width ?? null,
      height: v.height ?? null,
    };
  }

  static override deserialize(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    const v = value as Record<string, unknown>;
    const targetId = v.target_id;

    if (targetId == null) return v;

    // Add file URLs to the deserialized value
    return {
      ...v,
      url: `/api/files/${targetId}/download`,
      thumbnail_url: `/api/files/${targetId}/style/thumbnail`,
      medium_url: `/api/files/${targetId}/style/medium`,
      large_url: `/api/files/${targetId}/style/large`,
    };
  }
}
