import type { Knex } from 'knex';
import type {
  DrupalContentType,
  DrupalVocabulary,
  DrupalFieldStorage,
  DrupalFieldInstance,
  AnalysisReport,
} from './types.js';
import { deserializePhp } from './php-deserialize.js';

export class DrupalSchemaReader {
  constructor(private source: Knex) {}

  async getContentTypes(): Promise<DrupalContentType[]> {
    const rows = await this.source('config')
      .where('name', 'like', 'node.type.%')
      .select('name', 'data');

    return rows.map((row) => {
      const config = deserializePhp(row.data);
      return {
        type: config.type as string,
        name: config.name as string,
        description: (config.description as string) ?? '',
      };
    });
  }

  async getVocabularies(): Promise<DrupalVocabulary[]> {
    const rows = await this.source('config')
      .where('name', 'like', 'taxonomy.vocabulary.%')
      .select('name', 'data');

    return rows.map((row) => {
      const config = deserializePhp(row.data);
      return {
        vid: config.vid as string,
        name: config.name as string,
        description: (config.description as string) ?? '',
      };
    });
  }

  async getFieldStorages(): Promise<DrupalFieldStorage[]> {
    const rows = await this.source('config')
      .where('name', 'like', 'field.storage.%')
      .select('name', 'data');

    return rows.map((row) => {
      const config = deserializePhp(row.data);
      return {
        id: config.id as string,
        field_name: config.field_name as string,
        entity_type: config.entity_type as string,
        type: config.type as string,
        cardinality: config.cardinality as number,
        settings: (config.settings as Record<string, unknown>) ?? {},
      };
    });
  }

  async getFieldInstances(): Promise<DrupalFieldInstance[]> {
    const rows = await this.source('config')
      .where('name', 'like', 'field.field.%')
      .select('name', 'data');

    return rows.map((row) => {
      const config = deserializePhp(row.data);
      return {
        id: config.id as string,
        field_name: config.field_name as string,
        entity_type: config.entity_type as string,
        bundle: config.bundle as string,
        label: config.label as string,
        required: Boolean(config.required),
        field_type: config.field_type as string,
        settings: (config.settings as Record<string, unknown>) ?? {},
      };
    });
  }

  async getFieldsForBundle(entityType: string, bundle: string): Promise<{
    storage: DrupalFieldStorage;
    instance: DrupalFieldInstance;
  }[]> {
    const storages = await this.getFieldStorages();
    const instances = await this.getFieldInstances();

    const bundleInstances = instances.filter(
      (inst) => inst.entity_type === entityType && inst.bundle === bundle
    );

    return bundleInstances.map((inst) => {
      const storage = storages.find(
        (s) => s.entity_type === entityType && s.field_name === inst.field_name
      );
      if (!storage) {
        throw new Error(`No field storage found for ${entityType}.${inst.field_name}`);
      }
      return { storage, instance: inst };
    });
  }

  async countNodes(bundle?: string): Promise<number> {
    let query = this.source('node_field_data').count('* as count');
    if (bundle) query = query.where('type', bundle);
    const [row] = await query;
    return Number(row.count);
  }

  async countTerms(vid?: string): Promise<number> {
    let query = this.source('taxonomy_term_field_data').count('* as count');
    if (vid) query = query.where('vid', vid);
    const [row] = await query;
    return Number(row.count);
  }

  async countParagraphs(type?: string): Promise<number> {
    const hasTable = await this.source.schema.hasTable('paragraphs_item_field_data');
    if (!hasTable) return 0;
    let query = this.source('paragraphs_item_field_data').count('* as count');
    if (type) query = query.where('type', type);
    const [row] = await query;
    return Number(row.count);
  }

  async getParagraphTypes(): Promise<string[]> {
    const hasTable = await this.source.schema.hasTable('paragraphs_item_field_data');
    if (!hasTable) return [];
    const rows = await this.source('paragraphs_item_field_data')
      .distinct('type')
      .select('type');
    return rows.map((r) => r.type as string);
  }

  async analyze(): Promise<AnalysisReport> {
    const contentTypes = await this.getContentTypes();
    const vocabularies = await this.getVocabularies();
    const fieldStorages = await this.getFieldStorages();
    const instances = await this.getFieldInstances();
    const paragraphTypes = await this.getParagraphTypes();

    const ctReport = await Promise.all(
      contentTypes.map(async (ct) => ({
        ...ct,
        nodeCount: await this.countNodes(ct.type),
        fields: instances.filter(
          (i) => i.entity_type === 'node' && i.bundle === ct.type
        ),
      }))
    );

    const vocabReport = await Promise.all(
      vocabularies.map(async (v) => ({
        ...v,
        termCount: await this.countTerms(v.vid),
      }))
    );

    const paraReport = await Promise.all(
      paragraphTypes.map(async (type) => ({
        type,
        count: await this.countParagraphs(type),
        fields: instances.filter(
          (i) => i.entity_type === 'paragraph' && i.bundle === type
        ),
      }))
    );

    return {
      contentTypes: ctReport,
      vocabularies: vocabReport,
      paragraphTypes: paraReport,
      fieldStorages,
      totalNodes: await this.countNodes(),
      totalTerms: await this.countTerms(),
    };
  }
}
