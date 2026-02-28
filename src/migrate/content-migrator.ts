import type { Knex } from 'knex';
import { Entity, getEntityTypeDefinition } from '../core/index.js';
import type { EntityTypeDefinition, FieldDefinition } from '../core/index.js';
import { IdMap } from './id-map.js';
import type { DrupalSchemaReader } from './drupal-schema-reader.js';
import type { ProgressCallback } from './types.js';

const DEFAULT_BATCH_SIZE = 50;

export class ContentMigrator {
  private idMap = new IdMap();

  constructor(
    private source: Knex,
    private reader: DrupalSchemaReader,
    private onProgress?: ProgressCallback,
  ) {}

  getIdMap(): IdMap {
    return this.idMap;
  }

  /** Migrate everything in dependency order: terms -> paragraphs -> nodes */
  async migrateAll(): Promise<{ nodes: number; terms: number; paragraphs: number }> {
    const report = await this.reader.analyze();
    let terms = 0, paragraphs = 0, nodes = 0;

    // 1. Taxonomy terms first (no outbound entity references)
    for (const vocab of report.vocabularies) {
      terms += await this.migrateTaxonomyTerms(vocab.vid);
    }

    // 2. Paragraphs second (may reference terms but not nodes)
    for (const para of report.paragraphTypes) {
      paragraphs += await this.migrateParagraphs(para.type);
    }

    // 3. Nodes last (reference both terms and paragraphs)
    for (const ct of report.contentTypes) {
      nodes += await this.migrateNodes(ct.type);
    }

    return { nodes, terms, paragraphs };
  }

  /** Migrate nodes of a specific content type */
  async migrateNodes(bundle: string): Promise<number> {
    const definition = getEntityTypeDefinition('node', bundle);
    if (!definition) throw new Error(`Entity type node:${bundle} not registered. Run schema generation first.`);

    await Entity.ensureBaseTable('node');
    await Entity.ensureFieldTables(definition);

    const drupalNodes = await this.source('node_field_data')
      .where('type', bundle)
      .select('nid', 'title', 'status', 'uid', 'created', 'changed')
      .orderBy('nid', 'asc');

    let count = 0;
    for (let i = 0; i < drupalNodes.length; i += DEFAULT_BATCH_SIZE) {
      const batch = drupalNodes.slice(i, i + DEFAULT_BATCH_SIZE);

      for (const drupalNode of batch) {
        const values = await this.buildEntityValues(
          drupalNode,
          'node',
          bundle,
          definition,
        );
        const entity = await Entity.create('node', bundle, values);
        this.idMap.set('node', drupalNode.nid, entity.nid!);
        count++;

        this.onProgress?.({
          phase: `node:${bundle}`,
          current: count,
          total: drupalNodes.length,
          message: `Migrated node "${drupalNode.title}" (${drupalNode.nid} -> ${entity.nid})`,
        });
      }
    }
    return count;
  }

  /** Migrate taxonomy terms for a vocabulary */
  async migrateTaxonomyTerms(vid: string): Promise<number> {
    const definition = getEntityTypeDefinition('taxonomy_term', vid);
    if (!definition) throw new Error(`Entity type taxonomy_term:${vid} not registered`);

    await Entity.ensureBaseTable('taxonomy_term');
    await Entity.ensureFieldTables(definition);

    const terms = await this.source('taxonomy_term_field_data')
      .where('vid', vid)
      .select('tid', 'name', 'description__value', 'description__format', 'weight', 'status', 'changed')
      .orderBy('tid', 'asc');

    let count = 0;
    for (const term of terms) {
      const values: Record<string, unknown> = {
        title: term.name,
        status: Boolean(term.status),
        created: term.changed ? this.convertTimestamp(term.changed) : new Date().toISOString(),
        changed: term.changed ? this.convertTimestamp(term.changed) : new Date().toISOString(),
      };

      // Map description field (Drupal uses description__value / description__format)
      if (term.description__value) {
        values.description = {
          value: term.description__value,
          format: term.description__format ?? 'plain_text',
        };
      }

      // Map weight field
      values.weight = term.weight ?? 0;

      const entity = await Entity.create('taxonomy_term', vid, values);
      this.idMap.set('taxonomy_term', term.tid, entity.nid!);
      count++;

      this.onProgress?.({
        phase: `taxonomy_term:${vid}`,
        current: count,
        total: terms.length,
        message: `Migrated term "${term.name}" (${term.tid} -> ${entity.nid})`,
      });
    }
    return count;
  }

  /** Migrate paragraphs for a type */
  async migrateParagraphs(type: string): Promise<number> {
    const definition = getEntityTypeDefinition('paragraph', type);
    if (!definition) throw new Error(`Entity type paragraph:${type} not registered`);

    await Entity.ensureBaseTable('paragraph');
    await Entity.ensureFieldTables(definition);

    const paragraphs = await this.source('paragraphs_item_field_data')
      .where('type', type)
      .select('id', 'type', 'status', 'created')
      .orderBy('id', 'asc');

    let count = 0;
    for (const para of paragraphs) {
      const values: Record<string, unknown> = {
        title: `${type}_${para.id}`,
        status: Boolean(para.status),
        created: para.created ? this.convertTimestamp(para.created) : new Date().toISOString(),
        changed: new Date().toISOString(),
      };

      // Read paragraph fields from their respective tables
      for (const [fieldName, fieldDef] of Object.entries(definition.fields)) {
        const drupalTable = `paragraph__${fieldName}`;
        const hasTable = await this.source.schema.hasTable(drupalTable);
        if (!hasTable) continue;

        const fieldRows = await this.source(drupalTable)
          .where('entity_id', para.id)
          .where('deleted', 0)
          .orderBy('delta', 'asc');

        if (fieldRows.length === 0) continue;

        const transformedValues = fieldRows.map((row) =>
          this.transformFieldValue(row, fieldName, fieldDef)
        );

        const cardinality = fieldDef.cardinality ?? 1;
        values[fieldName] = cardinality === 1 ? transformedValues[0] : transformedValues;
      }

      const entity = await Entity.create('paragraph', type, values);
      this.idMap.set('paragraph', para.id, entity.nid!);
      count++;

      this.onProgress?.({
        phase: `paragraph:${type}`,
        current: count,
        total: paragraphs.length,
        message: `Migrated paragraph ${type}:${para.id} -> ${entity.nid}`,
      });
    }
    return count;
  }

  /** Build entity values by reading field tables from Drupal */
  private async buildEntityValues(
    drupalRow: Record<string, unknown>,
    entityType: string,
    bundle: string,
    definition: EntityTypeDefinition,
  ): Promise<Record<string, unknown>> {
    const values: Record<string, unknown> = {
      title: drupalRow.title,
      status: Boolean(drupalRow.status),
      uid: drupalRow.uid != null ? (this.idMap.get('user', drupalRow.uid as number) ?? drupalRow.uid) : undefined,
      created: this.convertTimestamp(drupalRow.created),
      changed: this.convertTimestamp(drupalRow.changed),
    };

    // Read each field from its Drupal storage table
    const idField = entityType === 'node' ? 'nid' : entityType === 'taxonomy_term' ? 'tid' : 'id';
    const entityId = drupalRow[idField] as number;

    for (const [fieldName, fieldDef] of Object.entries(definition.fields)) {
      if (['title', 'status', 'uid'].includes(fieldName)) continue;

      const drupalTableName = `${entityType}__${fieldName}`;
      const hasTable = await this.source.schema.hasTable(drupalTableName);
      if (!hasTable) continue;

      const fieldRows = await this.source(drupalTableName)
        .where('entity_id', entityId)
        .where('deleted', 0)
        .orderBy('delta', 'asc');

      if (fieldRows.length === 0) continue;

      const transformedValues = fieldRows.map((row) =>
        this.transformFieldValue(row, fieldName, fieldDef)
      );

      const cardinality = fieldDef.cardinality ?? 1;
      values[fieldName] = cardinality === 1 ? transformedValues[0] : transformedValues;
    }

    return values;
  }

  /** Transform a single Drupal field row value into the format drop.js expects */
  private transformFieldValue(
    row: Record<string, unknown>,
    fieldName: string,
    fieldDef: FieldDefinition,
  ): unknown {
    switch (fieldDef.type) {
      case 'text_long': {
        // Drupal: {fieldName}_value, {fieldName}_summary, {fieldName}_format
        // drop.js text_long serialize expects: { value, format }
        return {
          value: row[`${fieldName}_value`] ?? null,
          format: row[`${fieldName}_format`] ?? 'plain_text',
        };
      }

      case 'string': {
        return row[`${fieldName}_value`] ?? null;
      }

      case 'integer': {
        const val = row[`${fieldName}_value`];
        return val != null ? Number(val) : null;
      }

      case 'float':
      case 'decimal': {
        const val = row[`${fieldName}_value`];
        return val != null ? Number(val) : null;
      }

      case 'boolean': {
        return Boolean(row[`${fieldName}_value`]);
      }

      case 'email': {
        return row[`${fieldName}_value`] ?? null;
      }

      case 'timestamp': {
        const val = row[`${fieldName}_value`];
        if (val == null) return null;
        if (typeof val === 'number') return new Date(val * 1000).toISOString();
        return String(val);
      }

      case 'entity_reference': {
        // drop.js entity_reference serialize() expects a scalar (the target_id)
        // and wraps it into { target_id: val }
        const targetId = row[`${fieldName}_target_id`] as number;
        const targetType = (fieldDef.settings?.target_type as string) ?? 'node';
        const drupalEntityType = targetType === 'taxonomy_term' ? 'taxonomy_term'
          : targetType === 'paragraph' ? 'paragraph'
          : 'node';
        const mappedId = this.idMap.get(drupalEntityType, targetId);
        return mappedId ?? targetId;
      }

      case 'image': {
        // drop.js image field stores: target_id, alt, title, width, height
        return {
          target_id: row[`${fieldName}_target_id`] ?? null,
          alt: row[`${fieldName}_alt`] ?? null,
          title: row[`${fieldName}_title`] ?? null,
          width: row[`${fieldName}_width`] ?? null,
          height: row[`${fieldName}_height`] ?? null,
        };
      }

      case 'list_string': {
        return row[`${fieldName}_value`] ?? null;
      }

      case 'json':
      default: {
        // Collect all field-prefixed columns into an object
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(row)) {
          if (key.startsWith(`${fieldName}_`)) {
            const shortKey = key.slice(fieldName.length + 1);
            result[shortKey] = val;
          }
        }
        // If only a single 'value' key, unwrap
        if (Object.keys(result).length === 1 && 'value' in result) {
          return result.value;
        }
        return Object.keys(result).length > 0 ? result : null;
      }
    }
  }

  /** Convert a Drupal timestamp to ISO string */
  private convertTimestamp(val: unknown): string {
    if (val == null) return new Date().toISOString();
    if (typeof val === 'number') return new Date(val * 1000).toISOString();
    if (typeof val === 'string') return val;
    return new Date().toISOString();
  }
}
