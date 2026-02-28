import * as fs from 'node:fs';
import * as path from 'node:path';
import type { EntityTypeDefinition, FieldDefinition } from '../core/index.js';
import type { DrupalSchemaReader } from './drupal-schema-reader.js';
import { mapDrupalFieldType } from './field-type-map.js';

export class SchemaGenerator {
  constructor(private reader: DrupalSchemaReader) {}

  async generateNodeType(bundle: string): Promise<EntityTypeDefinition> {
    const contentTypes = await this.reader.getContentTypes();
    const ct = contentTypes.find((c) => c.type === bundle);
    if (!ct) throw new Error(`Content type "${bundle}" not found in Drupal`);

    const fieldConfigs = await this.reader.getFieldsForBundle('node', bundle);
    const fields: Record<string, FieldDefinition> = {};

    for (const { storage, instance } of fieldConfigs) {
      const mapped = mapDrupalFieldType(storage, instance);

      fields[storage.field_name] = {
        type: mapped.type,
        label: instance.label,
        required: instance.required,
        cardinality: storage.cardinality,
        ...(mapped.settings ? { settings: mapped.settings } : {}),
      };
    }

    return {
      entity_type: 'node',
      bundle: ct.type,
      label: ct.name,
      description: ct.description,
      fields,
    };
  }

  async generateVocabulary(vid: string): Promise<EntityTypeDefinition> {
    const vocabs = await this.reader.getVocabularies();
    const vocab = vocabs.find((v) => v.vid === vid);
    if (!vocab) throw new Error(`Vocabulary "${vid}" not found in Drupal`);

    const fields: Record<string, FieldDefinition> = {
      description: {
        type: 'text_long',
        label: 'Description',
      },
      weight: {
        type: 'integer',
        label: 'Weight',
      },
    };

    return {
      entity_type: 'taxonomy_term',
      bundle: vocab.vid,
      label: vocab.name,
      description: vocab.description,
      fields,
    };
  }

  async generateParagraphType(type: string): Promise<EntityTypeDefinition> {
    const fieldConfigs = await this.reader.getFieldsForBundle('paragraph', type);
    const fields: Record<string, FieldDefinition> = {};

    for (const { storage, instance } of fieldConfigs) {
      const mapped = mapDrupalFieldType(storage, instance);
      fields[storage.field_name] = {
        type: mapped.type,
        label: instance.label,
        required: instance.required,
        cardinality: storage.cardinality,
        ...(mapped.settings ? { settings: mapped.settings } : {}),
      };
    }

    return {
      entity_type: 'paragraph',
      bundle: type,
      label: type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      fields,
    };
  }

  async generateAll(outputDir: string): Promise<string[]> {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const written: string[] = [];
    const report = await this.reader.analyze();

    for (const ct of report.contentTypes) {
      const def = await this.generateNodeType(ct.type);
      const filename = `node.${ct.type}.json`;
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(def, null, 2));
      written.push(filepath);
    }

    for (const vocab of report.vocabularies) {
      const def = await this.generateVocabulary(vocab.vid);
      const filename = `taxonomy_term.${vocab.vid}.json`;
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(def, null, 2));
      written.push(filepath);
    }

    for (const para of report.paragraphTypes) {
      const def = await this.generateParagraphType(para.type);
      const filename = `paragraph.${para.type}.json`;
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(def, null, 2));
      written.push(filepath);
    }

    return written;
  }
}
