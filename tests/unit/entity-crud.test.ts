import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createConnection, destroyConnection } from '../../src/db/index.js';
import {
  Entity,
  EventBus,
  registerEntityType,
  clearEntityTypeRegistry,
} from '../../src/core/index.js';
// Import field to trigger side-effect registration of built-in types
import '../../src/field/index.js';

describe('Entity CRUD Integration', () => {
  beforeAll(async () => {
    createConnection({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
    });

    // Register an article entity type
    const articleDef = {
      entity_type: 'node',
      bundle: 'article',
      label: 'Article',
      description: 'A standard article',
      fields: {
        title: {
          type: 'string',
          label: 'Title',
          required: true,
        },
        body: {
          type: 'text_long',
          label: 'Body',
          required: false,
        },
        field_tags: {
          type: 'entity_reference',
          label: 'Tags',
          cardinality: -1,
          settings: {
            target_type: 'taxonomy_term',
            target_bundle: 'tags',
          },
        },
        field_featured: {
          type: 'boolean',
          label: 'Featured',
        },
      },
    };

    registerEntityType(articleDef);

    // Create base table and field tables
    await Entity.ensureBaseTable('node');
    await Entity.ensureFieldTables(articleDef);
  });

  afterAll(async () => {
    clearEntityTypeRegistry();
    EventBus.removeAllListeners();
    await destroyConnection();
  });

  describe('Entity.create', () => {
    it('should create an entity with base fields', async () => {
      const article = await Entity.create('node', 'article', {
        title: 'My First Article',
        status: true,
      });

      expect(article.nid).toBeDefined();
      expect(article.nid).toBeGreaterThan(0);
      expect(article.title).toBe('My First Article');
      expect(article.status).toBe(true);
      expect(article.uuid).toBeDefined();
      expect(article.type).toBe('article');
    });

    it('should create an entity with custom field values', async () => {
      const article = await Entity.create('node', 'article', {
        title: 'Article with Body',
        status: true,
        body: { value: '<p>Hello World</p>', format: 'html' },
        field_featured: true,
      });

      expect(article.nid).toBeDefined();
      expect(article.get('body')).toEqual({
        value: '<p>Hello World</p>',
        format: 'html',
      });
    });

    it('should create an entity with multi-value fields', async () => {
      const article = await Entity.create('node', 'article', {
        title: 'Tagged Article',
        status: true,
        field_tags: [1, 5, 12],
      });

      expect(article.get('field_tags')).toEqual([1, 5, 12]);
    });
  });

  describe('Entity.load', () => {
    it('should load an entity by ID', async () => {
      const created = await Entity.create('node', 'article', {
        title: 'Load Test',
        status: true,
        body: { value: '<p>Content</p>', format: 'html' },
      });

      const loaded = await Entity.load('node', created.nid!);

      expect(loaded).not.toBeNull();
      expect(loaded!.nid).toBe(created.nid);
      expect(loaded!.title).toBe('Load Test');
      expect(loaded!.get('body')).toEqual({
        value: '<p>Content</p>',
        format: 'html',
      });
    });

    it('should return null for nonexistent entity', async () => {
      const loaded = await Entity.load('node', 99999);
      expect(loaded).toBeNull();
    });
  });

  describe('Entity.loadMultiple', () => {
    it('should load multiple entities', async () => {
      const a1 = await Entity.create('node', 'article', {
        title: 'Multi A',
        status: true,
      });
      const a2 = await Entity.create('node', 'article', {
        title: 'Multi B',
        status: true,
      });

      const loaded = await Entity.loadMultiple('node', [a1.nid!, a2.nid!]);

      expect(loaded).toHaveLength(2);
      expect(loaded[0].title).toBe('Multi A');
      expect(loaded[1].title).toBe('Multi B');
    });
  });

  describe('entity.save (update)', () => {
    it('should update base fields', async () => {
      const article = await Entity.create('node', 'article', {
        title: 'Original Title',
        status: false,
      });

      article.title = 'Updated Title';
      article.status = true;
      await article.save();

      const loaded = await Entity.load('node', article.nid!);
      expect(loaded!.title).toBe('Updated Title');
      expect(loaded!.status).toBe(true);
    });

    it('should update field values', async () => {
      const article = await Entity.create('node', 'article', {
        title: 'Field Update Test',
        status: true,
        field_tags: [1, 2],
      });

      article.set('field_tags', [1, 2, 3, 4]);
      await article.save();

      const loaded = await Entity.load('node', article.nid!);
      expect(loaded!.get('field_tags')).toEqual([1, 2, 3, 4]);
    });
  });

  describe('Entity.delete', () => {
    it('should delete an entity and its field data', async () => {
      const article = await Entity.create('node', 'article', {
        title: 'To Delete',
        status: true,
        body: { value: 'Will be gone', format: 'plain_text' },
        field_tags: [10, 20],
      });

      const nid = article.nid!;
      await Entity.delete('node', nid);

      const loaded = await Entity.load('node', nid);
      expect(loaded).toBeNull();
    });
  });

  describe('Entity.query', () => {
    beforeEach(async () => {
      // Clean up for query tests
      const all = await Entity.query('node')
        .condition('type', 'article')
        .execute();
      for (const nid of all) {
        await Entity.delete('node', nid);
      }
    });

    it('should query entities by base conditions', async () => {
      await Entity.create('node', 'article', { title: 'Published', status: true });
      await Entity.create('node', 'article', { title: 'Draft', status: false });

      const published = await Entity.query('node')
        .condition('type', 'article')
        .condition('status', true)
        .execute();

      // Should find at least the published one
      expect(published.length).toBeGreaterThanOrEqual(1);
    });

    it('should support sorting and range', async () => {
      await Entity.create('node', 'article', { title: 'AAA', status: true });
      await Entity.create('node', 'article', { title: 'BBB', status: true });
      await Entity.create('node', 'article', { title: 'CCC', status: true });

      const result = await Entity.query('node')
        .condition('type', 'article')
        .sort('title', 'ASC')
        .range(0, 2)
        .execute();

      expect(result).toHaveLength(2);
    });
  });
});

describe('EventBus', () => {
  beforeEach(() => {
    EventBus.removeAllListeners();
  });

  it('should execute handlers in priority order', async () => {
    const order: number[] = [];

    EventBus.on('test:event', async () => { order.push(2); }, { priority: 20 });
    EventBus.on('test:event', async () => { order.push(1); }, { priority: 10 });
    EventBus.on('test:event', async () => { order.push(3); }, { priority: 30 });

    await EventBus.emit('test:event', null);

    expect(order).toEqual([1, 2, 3]);
  });

  it('should fire entity lifecycle events', async () => {
    createConnection({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
    });

    registerEntityType({
      entity_type: 'node',
      bundle: 'event_test',
      label: 'Event Test',
      fields: {
        title: { type: 'string', label: 'Title' },
      },
    });

    await Entity.ensureBaseTable('node');

    const events: string[] = [];

    EventBus.on('entity:presave', async () => { events.push('presave'); });
    EventBus.on('entity:insert', async () => { events.push('insert'); });
    EventBus.on('entity:update', async () => { events.push('update'); });
    EventBus.on('entity:delete', async () => { events.push('delete'); });

    const entity = await Entity.create('node', 'event_test', {
      title: 'Event Test',
      status: true,
    });

    expect(events).toContain('presave');
    expect(events).toContain('insert');

    entity.title = 'Updated';
    await entity.save();
    expect(events).toContain('update');

    await Entity.delete('node', entity.nid!);
    expect(events).toContain('delete');

    await destroyConnection();
  });

  it('should allow removing listeners', async () => {
    let called = false;
    const handler = async () => { called = true; };

    EventBus.on('test:remove', handler);
    EventBus.off('test:remove', handler);

    await EventBus.emit('test:remove', null);

    expect(called).toBe(false);
  });
});
