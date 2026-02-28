import { describe, it, expect } from 'vitest';
import { deserializePhp } from '../../src/migrate/php-deserialize.js';
import { mapDrupalFieldType, getFieldTypeMap } from '../../src/migrate/field-type-map.js';
import { IdMap } from '../../src/migrate/id-map.js';
import { formatAnalysisReport } from '../../src/migrate/analyzer.js';
import type { DrupalFieldStorage, DrupalFieldInstance, AnalysisReport } from '../../src/migrate/types.js';

// ─── PHP Deserialization ──────────────────────────────────────────

describe('deserializePhp', () => {
  it('should parse a simple PHP serialized string', () => {
    const input = 'a:2:{s:4:"name";s:7:"Article";s:4:"type";s:7:"article";}';
    const result = deserializePhp(input);
    expect(result.name).toBe('Article');
    expect(result.type).toBe('article');
  });

  it('should parse integers and booleans', () => {
    const input = 'a:3:{s:11:"cardinality";i:1;s:8:"required";b:1;s:6:"weight";i:0;}';
    const result = deserializePhp(input);
    expect(result.cardinality).toBe(1);
    expect(result.required).toBe(true);
    expect(result.weight).toBe(0);
  });

  it('should parse nested arrays', () => {
    const input = 'a:1:{s:8:"settings";a:2:{s:10:"max_length";i:255;s:11:"target_type";s:4:"node";}}';
    const result = deserializePhp(input);
    const settings = result.settings as Record<string, unknown>;
    expect(settings.max_length).toBe(255);
    expect(settings.target_type).toBe('node');
  });

  it('should handle null values', () => {
    const input = 'a:2:{s:4:"name";s:4:"test";s:5:"value";N;}';
    const result = deserializePhp(input);
    expect(result.name).toBe('test');
    expect(result.value).toBeNull();
  });

  it('should handle Buffer input', () => {
    const input = Buffer.from('a:1:{s:3:"foo";s:3:"bar";}');
    const result = deserializePhp(input);
    expect(result.foo).toBe('bar');
  });

  it('should parse a real Drupal field storage config string', () => {
    const input = 'a:4:{s:2:"id";s:9:"node.body";s:10:"field_name";s:4:"body";s:11:"entity_type";s:4:"node";s:4:"type";s:17:"text_with_summary";}';
    const result = deserializePhp(input);
    expect(result.id).toBe('node.body');
    expect(result.field_name).toBe('body');
    expect(result.entity_type).toBe('node');
    expect(result.type).toBe('text_with_summary');
  });
});

// ─── Field Type Mapping ──────────────────────────────────────────

describe('mapDrupalFieldType', () => {
  function makeStorage(overrides: Partial<DrupalFieldStorage>): DrupalFieldStorage {
    return {
      id: 'test.field',
      field_name: 'test_field',
      entity_type: 'node',
      type: 'string',
      cardinality: 1,
      settings: {},
      ...overrides,
    };
  }

  function makeInstance(overrides: Partial<DrupalFieldInstance>): DrupalFieldInstance {
    return {
      id: 'test.bundle.field',
      field_name: 'test_field',
      entity_type: 'node',
      bundle: 'article',
      label: 'Test Field',
      required: false,
      field_type: 'string',
      settings: {},
      ...overrides,
    };
  }

  it('should map string to string', () => {
    const result = mapDrupalFieldType(
      makeStorage({ type: 'string', settings: { max_length: 100 } }),
      makeInstance({})
    );
    expect(result.type).toBe('string');
    expect(result.settings?.max_length).toBe(100);
  });

  it('should map text_with_summary to text_long', () => {
    const result = mapDrupalFieldType(
      makeStorage({ type: 'text_with_summary' }),
      makeInstance({})
    );
    expect(result.type).toBe('text_long');
  });

  it('should map integer to integer', () => {
    const result = mapDrupalFieldType(
      makeStorage({ type: 'integer' }),
      makeInstance({})
    );
    expect(result.type).toBe('integer');
  });

  it('should map boolean to boolean', () => {
    const result = mapDrupalFieldType(
      makeStorage({ type: 'boolean' }),
      makeInstance({})
    );
    expect(result.type).toBe('boolean');
  });

  it('should map image to image', () => {
    const result = mapDrupalFieldType(
      makeStorage({ type: 'image' }),
      makeInstance({})
    );
    expect(result.type).toBe('image');
  });

  it('should map entity_reference with target_type settings', () => {
    const result = mapDrupalFieldType(
      makeStorage({ type: 'entity_reference', settings: { target_type: 'taxonomy_term' } }),
      makeInstance({ settings: { handler_settings: { target_bundles: { tags: 'tags' } } } })
    );
    expect(result.type).toBe('entity_reference');
    expect(result.settings?.target_type).toBe('taxonomy_term');
    expect(result.settings?.target_bundle).toBe('tags');
  });

  it('should map entity_reference_revisions to entity_reference', () => {
    const result = mapDrupalFieldType(
      makeStorage({ type: 'entity_reference_revisions', settings: { target_type: 'paragraph' } }),
      makeInstance({ settings: { handler_settings: { target_bundles: { feature_item: 'feature_item' } } } })
    );
    expect(result.type).toBe('entity_reference');
    expect(result.settings?.target_type).toBe('paragraph');
    expect(result.settings?.target_bundle).toBe('feature_item');
  });

  it('should map decimal with precision/scale', () => {
    const result = mapDrupalFieldType(
      makeStorage({ type: 'decimal', settings: { precision: 12, scale: 4 } }),
      makeInstance({})
    );
    expect(result.type).toBe('decimal');
    expect(result.settings?.precision).toBe(12);
    expect(result.settings?.scale).toBe(4);
  });

  it('should map list_string with allowed_values', () => {
    const result = mapDrupalFieldType(
      makeStorage({ type: 'list_string', settings: { allowed_values: [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }] } }),
      makeInstance({})
    );
    expect(result.type).toBe('list_string');
    expect(result.settings?.allowed_values).toEqual({ a: 'Alpha', b: 'Beta' });
  });

  it('should map unknown type to json fallback', () => {
    const result = mapDrupalFieldType(
      makeStorage({ type: 'some_unknown_type' }),
      makeInstance({})
    );
    expect(result.type).toBe('json');
  });

  it('should map all supported types correctly', () => {
    const expectedMappings: Record<string, string> = {
      'string': 'string',
      'string_long': 'string',
      'text': 'text_long',
      'text_long': 'text_long',
      'text_with_summary': 'text_long',
      'integer': 'integer',
      'float': 'float',
      'decimal': 'decimal',
      'boolean': 'boolean',
      'email': 'email',
      'timestamp': 'timestamp',
      'datetime': 'timestamp',
      'created': 'timestamp',
      'changed': 'timestamp',
      'entity_reference': 'entity_reference',
      'entity_reference_revisions': 'entity_reference',
      'image': 'image',
      'list_string': 'list_string',
      'list_integer': 'json',
      'list_float': 'json',
      'link': 'json',
      'file': 'json',
      'telephone': 'string',
      'color_field': 'string',
    };

    for (const [drupalType, expectedType] of Object.entries(expectedMappings)) {
      const result = mapDrupalFieldType(
        makeStorage({ type: drupalType }),
        makeInstance({})
      );
      expect(result.type, `Drupal type "${drupalType}" should map to "${expectedType}"`).toBe(expectedType);
    }
  });

  it('should expose all field types via getFieldTypeMap', () => {
    const map = getFieldTypeMap();
    expect(Object.keys(map).length).toBeGreaterThanOrEqual(20);
    expect(map['string']).toBeDefined();
    expect(map['text_with_summary']).toBeDefined();
  });
});

// ─── IdMap ──────────────────────────────────────────

describe('IdMap', () => {
  it('should set and get mappings', () => {
    const map = new IdMap();
    map.set('node', 5, 1);
    expect(map.get('node', 5)).toBe(1);
  });

  it('should return undefined for missing mappings', () => {
    const map = new IdMap();
    expect(map.get('node', 99)).toBeUndefined();
  });

  it('should check existence with has()', () => {
    const map = new IdMap();
    map.set('taxonomy_term', 3, 10);
    expect(map.has('taxonomy_term', 3)).toBe(true);
    expect(map.has('taxonomy_term', 999)).toBe(false);
  });

  it('should keep entity types separate', () => {
    const map = new IdMap();
    map.set('node', 1, 100);
    map.set('taxonomy_term', 1, 200);
    expect(map.get('node', 1)).toBe(100);
    expect(map.get('taxonomy_term', 1)).toBe(200);
  });

  it('should return size', () => {
    const map = new IdMap();
    map.set('node', 1, 10);
    map.set('node', 2, 20);
    map.set('taxonomy_term', 1, 30);
    expect(map.size()).toBe(3);
  });

  it('should return all entries via getAll()', () => {
    const map = new IdMap();
    map.set('node', 5, 1);
    map.set('taxonomy_term', 3, 2);
    const entries = map.getAll();
    expect(entries).toHaveLength(2);
    expect(entries).toContainEqual({
      sourceEntityType: 'node',
      sourceId: 5,
      targetEntityType: 'node',
      targetId: 1,
    });
    expect(entries).toContainEqual({
      sourceEntityType: 'taxonomy_term',
      sourceId: 3,
      targetEntityType: 'taxonomy_term',
      targetId: 2,
    });
  });
});

// ─── Analysis Report Formatting ──────────────────────────────────

describe('formatAnalysisReport', () => {
  it('should format a complete report', () => {
    const report: AnalysisReport = {
      totalNodes: 10,
      totalTerms: 5,
      contentTypes: [
        {
          type: 'article',
          name: 'Article',
          description: 'News articles',
          nodeCount: 7,
          fields: [
            {
              id: 'node.article.body',
              field_name: 'body',
              entity_type: 'node',
              bundle: 'article',
              label: 'Body',
              required: false,
              field_type: 'text_with_summary',
              settings: {},
            },
          ],
        },
        {
          type: 'page',
          name: 'Page',
          description: '',
          nodeCount: 3,
          fields: [],
        },
      ],
      vocabularies: [
        { vid: 'tags', name: 'Tags', description: '', termCount: 5 },
      ],
      paragraphTypes: [
        {
          type: 'feature_item',
          count: 6,
          fields: [
            {
              id: 'paragraph.feature_item.field_title',
              field_name: 'field_title',
              entity_type: 'paragraph',
              bundle: 'feature_item',
              label: 'Title',
              required: false,
              field_type: 'string',
              settings: {},
            },
          ],
        },
      ],
      fieldStorages: [
        { id: 'node.body', field_name: 'body', entity_type: 'node', type: 'text_with_summary', cardinality: 1, settings: {} },
        { id: 'paragraph.field_title', field_name: 'field_title', entity_type: 'paragraph', type: 'string', cardinality: 1, settings: {} },
      ],
    };

    const output = formatAnalysisReport(report);

    expect(output).toContain('=== Drupal Database Analysis ===');
    expect(output).toContain('Total nodes: 10');
    expect(output).toContain('Total taxonomy terms: 5');
    expect(output).toContain('Article (article): 7 nodes');
    expect(output).toContain('News articles');
    expect(output).toContain('body [text_with_summary] "Body"');
    expect(output).toContain('Page (page): 3 nodes');
    expect(output).toContain('Tags (tags): 5 terms');
    expect(output).toContain('feature_item: 6 items');
    expect(output).toContain('field_title [string] "Title"');
    expect(output).toContain('text_with_summary -> text_long');
    expect(output).toContain('string -> string');
  });
});
