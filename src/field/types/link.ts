import { FieldType, type FieldSchema } from '../field-type.js';

export class LinkField extends FieldType {
  static override type = 'link';
  static override label = 'Link';

  static override schema(): FieldSchema {
    return {
      columns: {
        uri: { type: 'varchar', length: 2048, nullable: true },
        title: { type: 'varchar', length: 255, nullable: true },
        options: { type: 'text', nullable: true },
      },
    };
  }

  static override validate(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return true;
    if (typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    if (v.uri !== undefined && v.uri !== null && typeof v.uri !== 'string') return false;
    return true;
  }

  static override serialize(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
      return { uri: value, title: null, options: null };
    }
    const v = value as Record<string, unknown>;
    return {
      uri: v.uri ?? null,
      title: v.title ?? null,
      options: v.options ? JSON.stringify(v.options) : null,
    };
  }

  static override deserialize(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    const v = value as Record<string, unknown>;
    let options = v.options;
    if (typeof options === 'string') {
      try { options = JSON.parse(options); } catch { /* keep as string */ }
    }
    return {
      uri: v.uri ?? null,
      title: v.title ?? null,
      options: options ?? null,
    };
  }
}
