/**
 * Content lock system tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createConnection, destroyConnection } from '../../src/db/index.js';
import {
  acquireLock,
  releaseLock,
  checkLock,
  renewLock,
  breakLock,
  getActiveLocks,
  cleanExpiredLocks,
  ensureKeyValueTable,
  stateSet,
  stateGet,
} from '../../src/core/index.js';

describe('Content lock system', () => {
  beforeAll(async () => {
    createConnection({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
    });
    await ensureKeyValueTable();
  });

  afterAll(async () => {
    await destroyConnection();
  });

  describe('acquireLock', () => {
    it('should acquire a lock on unlocked content', async () => {
      const result = await acquireLock('node', 1, 10, 'Alice');

      expect(result.success).toBe(true);
      expect(result.lock.uid).toBe(10);
      expect(result.lock.name).toBe('Alice');
      expect(result.lock.locked).toBeGreaterThan(0);
      expect(result.lock.expires).toBeGreaterThan(result.lock.locked);
    });

    it('should reject lock acquisition when locked by another user', async () => {
      // First user acquires lock
      await acquireLock('node', 100, 10, 'Alice');

      // Second user tries to acquire the same lock
      const result = await acquireLock('node', 100, 20, 'Bob');

      expect(result.success).toBe(false);
      expect(result.lock.uid).toBe(10);
      expect(result.lock.name).toBe('Alice');
    });

    it('should allow lock acquisition when previous lock expired', async () => {
      // Acquire with a very short duration (1ms)
      await acquireLock('node', 200, 10, 'Alice', 1);

      // Wait a small amount of time so the lock expires
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Another user should be able to acquire
      const result = await acquireLock('node', 200, 20, 'Bob');

      expect(result.success).toBe(true);
      expect(result.lock.uid).toBe(20);
      expect(result.lock.name).toBe('Bob');
    });

    it('should allow the same user to re-acquire their own lock', async () => {
      await acquireLock('node', 300, 10, 'Alice');

      const result = await acquireLock('node', 300, 10, 'Alice');

      expect(result.success).toBe(true);
      expect(result.lock.uid).toBe(10);
    });
  });

  describe('checkLock', () => {
    it('should return lock info for an active lock', async () => {
      await acquireLock('node', 400, 10, 'Alice');

      const lock = await checkLock('node', 400);

      expect(lock).not.toBeNull();
      expect(lock!.uid).toBe(10);
      expect(lock!.name).toBe('Alice');
    });

    it('should return null for unlocked content', async () => {
      const lock = await checkLock('node', 99999);

      expect(lock).toBeNull();
    });

    it('should return null for expired locks and clean them up', async () => {
      // Acquire with a very short duration
      await acquireLock('node', 500, 10, 'Alice', 1);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const lock = await checkLock('node', 500);

      expect(lock).toBeNull();
    });
  });

  describe('releaseLock', () => {
    it('should release a lock held by the requesting user', async () => {
      await acquireLock('node', 600, 10, 'Alice');

      const released = await releaseLock('node', 600, 10);

      expect(released).toBe(true);

      // Verify lock is gone
      const lock = await checkLock('node', 600);
      expect(lock).toBeNull();
    });

    it('should not release a lock held by a different user', async () => {
      await acquireLock('node', 700, 10, 'Alice');

      const released = await releaseLock('node', 700, 20);

      expect(released).toBe(false);

      // Lock should still be active
      const lock = await checkLock('node', 700);
      expect(lock).not.toBeNull();
      expect(lock!.uid).toBe(10);
    });

    it('should return false when no lock exists', async () => {
      const released = await releaseLock('node', 88888, 10);

      expect(released).toBe(false);
    });
  });

  describe('renewLock', () => {
    it('should renew a lock for the owner', async () => {
      const result = await acquireLock('node', 800, 10, 'Alice');
      const originalExpires = result.lock.expires;

      // Wait a moment so the new expires time will be different
      await new Promise((resolve) => setTimeout(resolve, 50));

      const renewed = await renewLock('node', 800, 10);

      expect(renewed).not.toBeNull();
      expect(renewed!.uid).toBe(10);
      expect(renewed!.expires).toBeGreaterThanOrEqual(originalExpires);
    });

    it('should not renew a lock for a different user', async () => {
      await acquireLock('node', 900, 10, 'Alice');

      const renewed = await renewLock('node', 900, 20);

      expect(renewed).toBeNull();
    });

    it('should return null when no lock exists', async () => {
      const renewed = await renewLock('node', 77777, 10);

      expect(renewed).toBeNull();
    });
  });

  describe('breakLock', () => {
    it('should force-break a lock and return the broken lock info', async () => {
      await acquireLock('node', 1000, 10, 'Alice');

      const broken = await breakLock('node', 1000);

      expect(broken).not.toBeNull();
      expect(broken!.uid).toBe(10);
      expect(broken!.name).toBe('Alice');

      // Verify lock is gone
      const lock = await checkLock('node', 1000);
      expect(lock).toBeNull();
    });

    it('should return null when no lock exists', async () => {
      const broken = await breakLock('node', 66666);

      expect(broken).toBeNull();
    });
  });

  describe('getActiveLocks', () => {
    it('should return all active locks', async () => {
      // Clear any existing locks by breaking them
      const existing = await getActiveLocks();
      for (const lock of existing) {
        await breakLock(lock.entity_type, lock.entity_id);
      }

      // Create a few locks
      await acquireLock('node', 1100, 10, 'Alice');
      await acquireLock('node', 1101, 20, 'Bob');
      await acquireLock('taxonomy_term', 50, 30, 'Charlie');

      const locks = await getActiveLocks();

      expect(locks.length).toBeGreaterThanOrEqual(3);

      const nodeLock1100 = locks.find(
        (l) => l.entity_type === 'node' && l.entity_id === 1100
      );
      expect(nodeLock1100).toBeTruthy();
      expect(nodeLock1100!.uid).toBe(10);
      expect(nodeLock1100!.name).toBe('Alice');

      const taxLock = locks.find(
        (l) => l.entity_type === 'taxonomy_term' && l.entity_id === 50
      );
      expect(taxLock).toBeTruthy();
      expect(taxLock!.uid).toBe(30);
    });

    it('should not include expired locks', async () => {
      // Create a lock with very short duration
      await acquireLock('node', 1200, 10, 'Alice', 1);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const locks = await getActiveLocks();

      const expiredLock = locks.find(
        (l) => l.entity_type === 'node' && l.entity_id === 1200
      );
      expect(expiredLock).toBeUndefined();
    });
  });

  describe('cleanExpiredLocks', () => {
    it('should remove expired locks and return the count', async () => {
      // Create locks with very short duration
      await acquireLock('node', 1300, 10, 'Alice', 1);
      await acquireLock('node', 1301, 20, 'Bob', 1);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const cleaned = await cleanExpiredLocks();

      expect(cleaned).toBeGreaterThanOrEqual(2);

      // Verify they're gone
      const lock1 = await checkLock('node', 1300);
      const lock2 = await checkLock('node', 1301);
      expect(lock1).toBeNull();
      expect(lock2).toBeNull();
    });
  });
});
