import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import knex from 'knex';
import { createConnection, destroyConnection, getConnection } from '../../src/db/index.js';
import { clearEntityTypeRegistry, registerEntityType, Entity } from '../../src/core/index.js';
import '../../src/field/index.js'; // register field types

import {
  createSourceConnection,
  destroySourceConnection,
  DrupalSchemaReader,
  SchemaGenerator,
  ContentMigrator,
  formatAnalysisReport,
} from '../../src/migrate/index.js';

// DDEV database connection — port from `ddev describe`
const DDEV_CONFIG = {
  source: {
    client: 'mysql2' as const,
    connection: {
      host: '127.0.0.1',
      port: 32775,
      user: 'db',
      password: 'db',
      database: 'db',
    },
  },
};

let source: ReturnType<typeof knex>;
let canConnect = false;

// Pre-check: verify we can connect to DDEV
beforeAll(async () => {
  try {
    source = createSourceConnection(DDEV_CONFIG);
    await source.raw('SELECT 1');
    canConnect = true;
  } catch {
    console.warn('DDEV database not available — skipping integration tests');
  }

  // Target DB: in-memory SQLite
  createConnection({ client: 'sqlite3', connection: { filename: ':memory:' } });
});

afterAll(async () => {
  clearEntityTypeRegistry();
  await destroySourceConnection();
  await destroyConnection();
});

describe.runIf(true)('@dropjs/migrate integration', () => {
  // ─── Schema Reader ─────────────────────────────────────────

  describe('DrupalSchemaReader', () => {
    it('should discover content types', async () => {
      if (!canConnect) return;
      const reader = new DrupalSchemaReader(source);
      const types = await reader.getContentTypes();
      expect(types.length).toBeGreaterThanOrEqual(3);
      const typeNames = types.map(t => t.type);
      expect(typeNames).toContain('article');
      expect(typeNames).toContain('homepage');
      expect(typeNames).toContain('page');
    });

    it('should discover vocabularies', async () => {
      if (!canConnect) return;
      const reader = new DrupalSchemaReader(source);
      const vocabs = await reader.getVocabularies();
      expect(vocabs.length).toBeGreaterThanOrEqual(1);
      expect(vocabs.map(v => v.vid)).toContain('tags');
    });

    it('should discover field storages', async () => {
      if (!canConnect) return;
      const reader = new DrupalSchemaReader(source);
      const storages = await reader.getFieldStorages();
      expect(storages.length).toBeGreaterThan(0);
      const bodyStorage = storages.find(s => s.field_name === 'body');
      expect(bodyStorage).toBeDefined();
      expect(bodyStorage!.type).toBe('text_with_summary');
    });

    it('should discover field instances for a bundle', async () => {
      if (!canConnect) return;
      const reader = new DrupalSchemaReader(source);
      const fields = await reader.getFieldsForBundle('node', 'article');
      expect(fields.length).toBeGreaterThanOrEqual(2);
      const fieldNames = fields.map(f => f.instance.field_name);
      expect(fieldNames).toContain('body');
      expect(fieldNames).toContain('field_tags');
    });

    it('should count nodes', async () => {
      if (!canConnect) return;
      const reader = new DrupalSchemaReader(source);
      const total = await reader.countNodes();
      expect(total).toBeGreaterThanOrEqual(1);
      const articleCount = await reader.countNodes('article');
      expect(articleCount).toBeGreaterThanOrEqual(1);
    });

    it('should count terms', async () => {
      if (!canConnect) return;
      const reader = new DrupalSchemaReader(source);
      const count = await reader.countTerms('tags');
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('should discover paragraph types', async () => {
      if (!canConnect) return;
      const reader = new DrupalSchemaReader(source);
      const types = await reader.getParagraphTypes();
      expect(types).toContain('feature_item');
    });

    it('should produce a full analysis report', async () => {
      if (!canConnect) return;
      const reader = new DrupalSchemaReader(source);
      const report = await reader.analyze();

      expect(report.totalNodes).toBeGreaterThanOrEqual(1);
      expect(report.totalTerms).toBeGreaterThanOrEqual(1);
      expect(report.contentTypes.length).toBeGreaterThanOrEqual(3);
      expect(report.vocabularies.length).toBeGreaterThanOrEqual(1);
      expect(report.fieldStorages.length).toBeGreaterThan(0);

      // Verify the formatted report
      const formatted = formatAnalysisReport(report);
      expect(formatted).toContain('=== Drupal Database Analysis ===');
      expect(formatted).toContain('article');
      expect(formatted).toContain('Tags');
    });
  });

  // ─── Schema Generator ─────────────────────────────────────

  describe('SchemaGenerator', () => {
    it('should generate article entity type definition', async () => {
      if (!canConnect) return;
      const reader = new DrupalSchemaReader(source);
      const generator = new SchemaGenerator(reader);
      const def = await generator.generateNodeType('article');

      expect(def.entity_type).toBe('node');
      expect(def.bundle).toBe('article');
      expect(def.label).toBe('Article');
      expect(def.fields.body).toBeDefined();
      expect(def.fields.body.type).toBe('text_long');
      expect(def.fields.field_tags).toBeDefined();
      expect(def.fields.field_tags.type).toBe('entity_reference');
    });

    it('should generate vocabulary definition', async () => {
      if (!canConnect) return;
      const reader = new DrupalSchemaReader(source);
      const generator = new SchemaGenerator(reader);
      const def = await generator.generateVocabulary('tags');

      expect(def.entity_type).toBe('taxonomy_term');
      expect(def.bundle).toBe('tags');
      expect(def.fields.description).toBeDefined();
      expect(def.fields.description.type).toBe('text_long');
      expect(def.fields.weight).toBeDefined();
      expect(def.fields.weight.type).toBe('integer');
    });

    it('should generate paragraph type definition', async () => {
      if (!canConnect) return;
      const reader = new DrupalSchemaReader(source);
      const generator = new SchemaGenerator(reader);
      const def = await generator.generateParagraphType('feature_item');

      expect(def.entity_type).toBe('paragraph');
      expect(def.bundle).toBe('feature_item');
      expect(def.fields.field_title).toBeDefined();
      expect(def.fields.field_title.type).toBe('string');
      expect(def.fields.field_description).toBeDefined();
      expect(def.fields.field_description.type).toBe('text_long');
    });

    it('should generate all definitions and write to directory', async () => {
      if (!canConnect) return;
      const reader = new DrupalSchemaReader(source);
      const generator = new SchemaGenerator(reader);
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dropjs-migrate-test-'));

      try {
        const files = await generator.generateAll(tmpDir);
        expect(files.length).toBeGreaterThanOrEqual(5); // 3 node types + 1 vocab + 1 paragraph

        // Verify files exist and are valid JSON
        for (const file of files) {
          expect(fs.existsSync(file)).toBe(true);
          const content = JSON.parse(fs.readFileSync(file, 'utf-8'));
          expect(content.entity_type).toBeDefined();
          expect(content.bundle).toBeDefined();
          expect(content.fields).toBeDefined();
        }

        // Verify article file content
        const articleFile = files.find(f => f.includes('node.article.json'));
        expect(articleFile).toBeDefined();
        const articleDef = JSON.parse(fs.readFileSync(articleFile!, 'utf-8'));
        expect(articleDef.fields.body.type).toBe('text_long');
      } finally {
        fs.rmSync(tmpDir, { recursive: true });
      }
    });
  });

  // ─── Content Migration ─────────────────────────────────────

  describe('ContentMigrator', () => {
    beforeEach(async () => {
      // Reset target DB and entity registry for each migration test
      clearEntityTypeRegistry();
      const conn = getConnection();

      // Drop all tables in target DB
      const tables = await conn.raw("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
      for (const row of tables) {
        await conn.schema.dropTableIfExists(row.name);
      }
    });

    it('should migrate taxonomy terms', async () => {
      if (!canConnect) return;
      const reader = new DrupalSchemaReader(source);

      // Generate and register taxonomy_term:tags
      const generator = new SchemaGenerator(reader);
      const tagsDef = await generator.generateVocabulary('tags');
      registerEntityType(tagsDef);

      const migrator = new ContentMigrator(source, reader);
      const count = await migrator.migrateTaxonomyTerms('tags');

      expect(count).toBeGreaterThanOrEqual(5);

      // Verify the ID map has entries
      const idMap = migrator.getIdMap();
      expect(idMap.size()).toBeGreaterThanOrEqual(5);

      // Load a migrated term and verify
      const firstMappedId = idMap.get('taxonomy_term', 1);
      if (firstMappedId) {
        const term = await Entity.load('taxonomy_term', firstMappedId);
        expect(term).not.toBeNull();
        expect(term!.title).toBeTruthy();
      }
    });

    it('should migrate paragraphs', async () => {
      if (!canConnect) return;
      const reader = new DrupalSchemaReader(source);

      // Generate and register paragraph:feature_item
      const generator = new SchemaGenerator(reader);
      const paraDef = await generator.generateParagraphType('feature_item');
      registerEntityType(paraDef);

      const migrator = new ContentMigrator(source, reader);
      const count = await migrator.migrateParagraphs('feature_item');

      expect(count).toBeGreaterThanOrEqual(1);
      const idMap = migrator.getIdMap();
      expect(idMap.size()).toBeGreaterThanOrEqual(1);
    });

    it('should migrate nodes of a specific type', async () => {
      if (!canConnect) return;
      const reader = new DrupalSchemaReader(source);

      // Register required entity types for references
      const generator = new SchemaGenerator(reader);
      const tagsDef = await generator.generateVocabulary('tags');
      registerEntityType(tagsDef);
      const articleDef = await generator.generateNodeType('article');
      registerEntityType(articleDef);

      const migrator = new ContentMigrator(source, reader);

      // Migrate terms first (articles reference tags)
      await migrator.migrateTaxonomyTerms('tags');

      // Then migrate articles
      const nodeCount = await migrator.migrateNodes('article');
      expect(nodeCount).toBeGreaterThanOrEqual(1);

      // Verify ID mapping
      const idMap = migrator.getIdMap();
      const firstNodeMapping = idMap.getAll().find(e => e.sourceEntityType === 'node');
      expect(firstNodeMapping).toBeDefined();

      // Load a migrated node
      const loadedNode = await Entity.load('node', firstNodeMapping!.targetId);
      expect(loadedNode).not.toBeNull();
      expect(loadedNode!.title).toBeTruthy();
    });

    it('should migrate all entities in correct order', async () => {
      if (!canConnect) return;
      const reader = new DrupalSchemaReader(source);
      const generator = new SchemaGenerator(reader);
      const report = await reader.analyze();

      // Register all entity types
      for (const ct of report.contentTypes) {
        const def = await generator.generateNodeType(ct.type);
        registerEntityType(def);
      }
      for (const vocab of report.vocabularies) {
        const def = await generator.generateVocabulary(vocab.vid);
        registerEntityType(def);
      }
      for (const para of report.paragraphTypes) {
        const def = await generator.generateParagraphType(para.type);
        registerEntityType(def);
      }

      const progress: string[] = [];
      const migrator = new ContentMigrator(source, reader, (info) => {
        progress.push(`${info.phase}: ${info.message}`);
      });

      const result = await migrator.migrateAll();

      expect(result.terms).toBeGreaterThanOrEqual(5);
      expect(result.paragraphs).toBeGreaterThanOrEqual(1);
      expect(result.nodes).toBeGreaterThanOrEqual(1);
      expect(progress.length).toBeGreaterThan(0);

      // Verify migration order: terms first, then paragraphs, then nodes
      const firstTermIdx = progress.findIndex(p => p.startsWith('taxonomy_term:'));
      const firstParaIdx = progress.findIndex(p => p.startsWith('paragraph:'));
      const firstNodeIdx = progress.findIndex(p => p.startsWith('node:'));

      if (firstTermIdx >= 0 && firstParaIdx >= 0) {
        expect(firstTermIdx).toBeLessThan(firstParaIdx);
      }
      if (firstParaIdx >= 0 && firstNodeIdx >= 0) {
        expect(firstParaIdx).toBeLessThan(firstNodeIdx);
      }
      if (firstTermIdx >= 0 && firstNodeIdx >= 0) {
        expect(firstTermIdx).toBeLessThan(firstNodeIdx);
      }

      // Verify total ID mappings
      const idMap = migrator.getIdMap();
      expect(idMap.size()).toBe(result.terms + result.paragraphs + result.nodes);
    });
  });
});
