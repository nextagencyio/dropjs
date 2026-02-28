import { FieldType, type FieldSchema } from '../field-type.js';

/**
 * Text with summary field — Drupal's body field type.
 *
 * Stores a value (body text), a summary (teaser), and a text format.
 * The summary can be left empty, in which case the CMS typically
 * generates one by trimming the body.
 */
export class TextWithSummaryField extends FieldType {
  static override type = 'text_with_summary';
  static override label = 'Text (formatted, long, with summary)';

  static override schema(): FieldSchema {
    return {
      columns: {
        value: { type: 'text', nullable: true },
        summary: { type: 'text', nullable: true },
        format: { type: 'varchar', length: 255, nullable: true },
      },
    };
  }

  static override validate(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return true;
    if (typeof value === 'object' && value !== null) {
      const v = value as Record<string, unknown>;
      if ('value' in v) {
        return typeof v.value === 'string' || v.value === null || v.value === undefined;
      }
    }
    return false;
  }

  static override serialize(value: unknown): unknown {
    if (value === null || value === undefined) {
      return { value: null, summary: null, format: null };
    }
    if (typeof value === 'string') {
      return { value, summary: null, format: 'full_html' };
    }
    const v = value as Record<string, unknown>;
    return {
      value: v.value ?? null,
      summary: v.summary ?? null,
      format: v.format ?? 'full_html',
    };
  }

  static override deserialize(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    return value;
  }
}
