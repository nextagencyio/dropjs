/**
 * Scheduled publishing system tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createConnection, destroyConnection } from '../../src/db/index.js';
import {
  scheduleTransition,
  cancelScheduledTransition,
  getScheduledTransition,
  getUpcomingScheduledTransitions,
  processScheduledTransitions,
  Entity,
  registerEntityType,
  ensureConfigTable,
  ensureKeyValueTable,
} from '../../src/core/index.js';

describe('Scheduler system', () => {
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

  describe('Schedule a publish transition', () => {
    it('should schedule a publish transition', async () => {
      const entity = await Entity.create('node', 'article', {
        title: 'Publish Test',
        uid: 1,
      });
      await entity.save();

      const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const schedule = await scheduleTransition(
        'node',
        entity.nid!,
        'publish',
        futureDate,
        1
      );

      expect(schedule).toBeTruthy();
      expect(schedule.entity_type).toBe('node');
      expect(schedule.entity_id).toBe(entity.nid!);
      expect(schedule.transition).toBe('publish');
      expect(schedule.scheduled_date).toBe(futureDate.toISOString());
      expect(schedule.user_id).toBe(1);
      expect(schedule.created).toBeTruthy();
    });
  });

  describe('Schedule an unpublish transition', () => {
    it('should schedule an unpublish transition', async () => {
      const entity = await Entity.create('node', 'article', {
        title: 'Unpublish Test',
        uid: 1,
      });
      await entity.save();

      const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
      const schedule = await scheduleTransition(
        'node',
        entity.nid!,
        'unpublish',
        futureDate,
        1
      );

      expect(schedule).toBeTruthy();
      expect(schedule.transition).toBe('unpublish');
      expect(schedule.scheduled_date).toBe(futureDate.toISOString());
    });
  });

  describe('Cancel a scheduled transition', () => {
    it('should cancel a scheduled transition', async () => {
      const entity = await Entity.create('node', 'article', {
        title: 'Cancel Test',
        uid: 1,
      });
      await entity.save();

      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      await scheduleTransition('node', entity.nid!, 'publish', futureDate, 1);

      const cancelled = await cancelScheduledTransition('node', entity.nid!);
      expect(cancelled).toBe(true);

      // Verify it's gone
      const schedule = await getScheduledTransition('node', entity.nid!);
      expect(schedule).toBeNull();
    });

    it('should return false when cancelling non-existent schedule', async () => {
      const cancelled = await cancelScheduledTransition('node', 99999);
      expect(cancelled).toBe(false);
    });
  });

  describe('Get scheduled transition', () => {
    it('should get a scheduled transition', async () => {
      const entity = await Entity.create('node', 'article', {
        title: 'Get Test',
        uid: 1,
      });
      await entity.save();

      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      await scheduleTransition('node', entity.nid!, 'publish', futureDate, 1);

      const schedule = await getScheduledTransition('node', entity.nid!);
      expect(schedule).toBeTruthy();
      expect(schedule!.entity_type).toBe('node');
      expect(schedule!.entity_id).toBe(entity.nid!);
      expect(schedule!.transition).toBe('publish');
    });

    it('should return null for non-existent schedule', async () => {
      const schedule = await getScheduledTransition('node', 99999);
      expect(schedule).toBeNull();
    });
  });

  describe('Process due transitions (publish)', () => {
    it('should process a due publish transition', async () => {
      const entity = await Entity.create('node', 'article', {
        title: 'Process Publish Test',
        uid: 1,
      });
      entity.status = false; // Start unpublished
      await entity.save();

      // Schedule in the past so it's immediately due
      const pastDate = new Date(Date.now() - 1000); // 1 second ago

      // Bypass the future-date validation by directly using stateSet
      const { stateSet } = await import('../../src/core/index.js');
      const key = `scheduler.node.${entity.nid!}`;
      await stateSet(key, {
        entity_type: 'node',
        entity_id: entity.nid!,
        transition: 'publish',
        scheduled_date: pastDate.toISOString(),
        user_id: 1,
        created: new Date().toISOString(),
      }, 'scheduler');

      const result = await processScheduledTransitions();
      expect(result.processed).toContain(`node:${entity.nid!}`);
      expect(result.errors.length).toBe(0);

      // Verify entity is now published
      const updated = await Entity.load('node', entity.nid!);
      expect(updated!.status).toBe(true);

      // Verify schedule is removed
      const schedule = await getScheduledTransition('node', entity.nid!);
      expect(schedule).toBeNull();
    });
  });

  describe('Process due transitions (unpublish)', () => {
    it('should process a due unpublish transition', async () => {
      const entity = await Entity.create('node', 'article', {
        title: 'Process Unpublish Test',
        uid: 1,
      });
      entity.status = true; // Start published
      await entity.save();

      // Schedule in the past so it's immediately due
      const pastDate = new Date(Date.now() - 1000);

      const { stateSet } = await import('../../src/core/index.js');
      const key = `scheduler.node.${entity.nid!}`;
      await stateSet(key, {
        entity_type: 'node',
        entity_id: entity.nid!,
        transition: 'unpublish',
        scheduled_date: pastDate.toISOString(),
        user_id: 1,
        created: new Date().toISOString(),
      }, 'scheduler');

      const result = await processScheduledTransitions();
      expect(result.processed).toContain(`node:${entity.nid!}`);

      // Verify entity is now unpublished
      const updated = await Entity.load('node', entity.nid!);
      expect(updated!.status).toBe(false);
    });
  });

  describe('Don\'t process future transitions', () => {
    it('should not process transitions scheduled for the future', async () => {
      const entity = await Entity.create('node', 'article', {
        title: 'Future Test',
        uid: 1,
      });
      entity.status = false;
      await entity.save();

      const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      await scheduleTransition('node', entity.nid!, 'publish', futureDate, 1);

      const result = await processScheduledTransitions();
      // Should NOT have processed this entity
      expect(result.processed).not.toContain(`node:${entity.nid!}`);

      // Entity should still be unpublished
      const updated = await Entity.load('node', entity.nid!);
      expect(updated!.status).toBe(false);

      // Schedule should still exist
      const schedule = await getScheduledTransition('node', entity.nid!);
      expect(schedule).toBeTruthy();

      // Clean up
      await cancelScheduledTransition('node', entity.nid!);
    });
  });

  describe('Get upcoming transitions', () => {
    it('should list upcoming scheduled transitions sorted by date', async () => {
      // Clean any existing schedules first
      const { stateDeletePrefix } = await import('../../src/core/index.js');
      await stateDeletePrefix('scheduler.', 'scheduler');

      // Create multiple entities with different schedule dates
      const entity1 = await Entity.create('node', 'article', {
        title: 'Upcoming 1',
        uid: 1,
      });
      await entity1.save();

      const entity2 = await Entity.create('node', 'article', {
        title: 'Upcoming 2',
        uid: 1,
      });
      await entity2.save();

      const entity3 = await Entity.create('node', 'article', {
        title: 'Upcoming 3',
        uid: 1,
      });
      await entity3.save();

      // Schedule with different future dates
      const date1 = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours
      const date2 = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
      const date3 = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

      await scheduleTransition('node', entity1.nid!, 'publish', date1, 1);
      await scheduleTransition('node', entity2.nid!, 'unpublish', date2, 1);
      await scheduleTransition('node', entity3.nid!, 'publish', date3, 1);

      const upcoming = await getUpcomingScheduledTransitions();

      expect(upcoming.length).toBe(3);
      // Should be sorted by date ascending: entity2 (1h), entity3 (2h), entity1 (3h)
      expect(upcoming[0].entity_id).toBe(entity2.nid!);
      expect(upcoming[1].entity_id).toBe(entity3.nid!);
      expect(upcoming[2].entity_id).toBe(entity1.nid!);
    });

    it('should respect the limit parameter', async () => {
      const upcoming = await getUpcomingScheduledTransitions(2);
      expect(upcoming.length).toBe(2);
    });
  });
});
