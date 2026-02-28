/**
 * Workflow system tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createConnection, destroyConnection } from '../../src/db/index.js';
import {
  saveWorkflow,
  loadWorkflow,
  listWorkflows,
  deleteWorkflow,
  getWorkflowForBundle,
  getAvailableTransitions,
  applyTransition,
  getModerationHistory,
  seedDefaultWorkflow,
  Entity,
  registerEntityType,
  ensureConfigTable,
  ensureKeyValueTable,
} from '../../src/core/index.js';
import type { Workflow } from '../../src/core/index.js';

describe('Workflow system', () => {
  beforeAll(async () => {
    createConnection({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
    });
    await ensureConfigTable();
    await ensureKeyValueTable();

    // Register a simple article content type for testing
    const articleDef = {
      entity_type: 'node',
      bundle: 'article',
      label: 'Article',
      description: 'Test article',
      fields: {
        title: { type: 'string' as const, label: 'Title', required: true },
      },
    };
    registerEntityType(articleDef);

    // Create base table and field tables so Entity.create works
    await Entity.ensureBaseTable('node');
    await Entity.ensureFieldTables(articleDef);
  });

  afterAll(async () => {
    await destroyConnection();
  });

  describe('Workflow CRUD', () => {
    it('should create and load a workflow', async () => {
      const workflow: Workflow = {
        id: 'test_workflow',
        label: 'Test Workflow',
        states: {
          draft: { id: 'draft', label: 'Draft', weight: 0, published: false },
          published: { id: 'published', label: 'Published', weight: 10, published: true },
        },
        transitions: {
          publish: { id: 'publish', label: 'Publish', from: ['draft'], to: 'published' },
        },
        entity_types: ['node:article'],
      };

      await saveWorkflow(workflow);
      const loaded = await loadWorkflow('test_workflow');

      expect(loaded).toBeTruthy();
      expect(loaded?.id).toBe('test_workflow');
      expect(loaded?.label).toBe('Test Workflow');
      expect(loaded?.states.draft).toBeTruthy();
      expect(loaded?.states.published).toBeTruthy();
      expect(loaded?.transitions.publish).toBeTruthy();
    });

    it('should list all workflows', async () => {
      const workflows = await listWorkflows();
      expect(workflows.length).toBeGreaterThan(0);
      expect(workflows.some(w => w.id === 'test_workflow')).toBe(true);
    });

    it('should delete a workflow', async () => {
      const deleted = await deleteWorkflow('test_workflow');
      expect(deleted).toBe(true);

      const loaded = await loadWorkflow('test_workflow');
      expect(loaded).toBeNull();
    });
  });

  describe('Default workflow', () => {
    it('should seed the default editorial workflow', async () => {
      await seedDefaultWorkflow();
      const editorial = await loadWorkflow('editorial');

      expect(editorial).toBeTruthy();
      expect(editorial?.id).toBe('editorial');
      expect(editorial?.label).toBe('Editorial');
      expect(editorial?.states.draft).toBeTruthy();
      expect(editorial?.states.review).toBeTruthy();
      expect(editorial?.states.published).toBeTruthy();
      expect(editorial?.states.archived).toBeTruthy();
    });

    it('should not recreate workflow if it already exists', async () => {
      // Call seed again
      await seedDefaultWorkflow();
      const editorial = await loadWorkflow('editorial');
      expect(editorial).toBeTruthy();
    });
  });

  describe('Workflow assignment', () => {
    it('should find workflow for bundle', async () => {
      // Update editorial workflow to include node:article
      const editorial = await loadWorkflow('editorial');
      if (editorial) {
        editorial.entity_types = ['node:article'];
        await saveWorkflow(editorial);
      }

      const workflow = await getWorkflowForBundle('node', 'article');
      expect(workflow).toBeTruthy();
      expect(workflow?.id).toBe('editorial');
    });

    it('should return null if no workflow assigned', async () => {
      const workflow = await getWorkflowForBundle('node', 'page');
      expect(workflow).toBeNull();
    });
  });

  describe('Transitions', () => {
    it('should get available transitions from a state', async () => {
      const transitions = await getAvailableTransitions('editorial', 'draft');
      expect(transitions.length).toBeGreaterThan(0);
      expect(transitions.some(t => t.id === 'submit_for_review')).toBe(true);
      expect(transitions.some(t => t.id === 'publish')).toBe(true);
    });

    it('should include transitions with empty from array', async () => {
      const transitions = await getAvailableTransitions('editorial', 'any_state');
      expect(transitions.some(t => t.id === 'create_draft')).toBe(true);
    });
  });

  describe('Apply transitions', () => {
    it('should apply a transition and update entity state', async () => {
      // Create a test entity
      const entity = await Entity.create('node', 'article', {
        title: 'Test Article',
        uid: 1,
      });
      await entity.save();

      // Apply publish transition
      const updated = await applyTransition('node', entity.nid!, 'publish', 1);

      expect(updated.get('moderation_state')).toBe('published');
      expect(updated.status).toBe(true);
    });

    it('should track moderation history', async () => {
      // Create another test entity
      const entity = await Entity.create('node', 'article', {
        title: 'Test Article 2',
        uid: 1,
      });
      await entity.save();

      // Apply transitions
      await applyTransition('node', entity.nid!, 'submit_for_review', 1);
      await applyTransition('node', entity.nid!, 'publish', 1);

      const history = await getModerationHistory('node', entity.nid!);
      expect(history.length).toBe(2);
      expect(history[0].transition).toBe('submit_for_review');
      expect(history[0].to_state).toBe('review');
      expect(history[1].transition).toBe('publish');
      expect(history[1].to_state).toBe('published');
    });

    it('should reject invalid transitions', async () => {
      const entity = await Entity.create('node', 'article', {
        title: 'Test Article 3',
        uid: 1,
      });
      await entity.save();

      // First publish the entity via valid transitions
      await applyTransition('node', entity.nid!, 'publish', 1);

      // Try to submit for review from published state (not allowed)
      await expect(
        applyTransition('node', entity.nid!, 'submit_for_review', 1)
      ).rejects.toThrow();
    });
  });
});
