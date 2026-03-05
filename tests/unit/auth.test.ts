import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createConnection, destroyConnection } from '../../src/db/index.js';
import {
  hashPassword,
  verifyPassword,
  createUser,
  loadUser,
  loadUserByName,
  loadUserByEmail,
  authenticateUser,
  updateUser,
  deleteUser,
  ensureAuthTables,
  createSession,
  validateToken,
  destroySession,
  cleanExpiredSessions,
  createRole,
  seedDefaultRoles,
  assignRolePermission,
  userHasPermission,
  roleHasPermission,
  definePermissions,
} from '../../src/auth/index.js';
import { ensureConfigTable } from '../../src/core/index.js';

describe('@dropjs/auth', () => {
  beforeAll(async () => {
    createConnection({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
    });
    await ensureConfigTable();
    await ensureAuthTables();
    await seedDefaultRoles();
  });

  afterAll(async () => {
    await destroyConnection();
  });

  describe('password', () => {
    it('should hash and verify passwords correctly', async () => {
      const hash = await hashPassword('secret123');
      expect(hash).not.toBe('secret123');
      expect(await verifyPassword('secret123', hash)).toBe(true);
    });

    it('should reject wrong passwords', async () => {
      const hash = await hashPassword('correct');
      expect(await verifyPassword('wrong', hash)).toBe(false);
    });
  });

  describe('user management', () => {
    it('should create a user with hashed password', async () => {
      const user = await createUser({
        name: 'alice',
        email: 'alice@example.com',
        password: 'password123',
      });

      expect(user.uid).toBeGreaterThan(0);
      expect(user.name).toBe('alice');
      expect(user.email).toBe('alice@example.com');
      expect(user.roles).toContain('authenticated');
    });

    it('should load user by uid', async () => {
      const created = await createUser({
        name: 'bob',
        email: 'bob@example.com',
        password: 'pass',
      });

      const loaded = await loadUser(created.uid!);
      expect(loaded).not.toBeNull();
      expect(loaded!.name).toBe('bob');
      expect(loaded!.roles).toContain('authenticated');
    });

    it('should load user by name', async () => {
      const user = await loadUserByName('alice');
      expect(user).not.toBeNull();
      expect(user!.email).toBe('alice@example.com');
    });

    it('should load user by email', async () => {
      const user = await loadUserByEmail('bob@example.com');
      expect(user).not.toBeNull();
      expect(user!.name).toBe('bob');
    });

    it('should return null for nonexistent user', async () => {
      expect(await loadUser(99999)).toBeNull();
      expect(await loadUserByName('nonexistent')).toBeNull();
    });

    it('should authenticate with correct credentials', async () => {
      const user = await authenticateUser('alice', 'password123');
      expect(user).not.toBeNull();
      expect(user!.name).toBe('alice');
    });

    it('should reject authentication with wrong password', async () => {
      const user = await authenticateUser('alice', 'wrongpassword');
      expect(user).toBeNull();
    });

    it('should update user fields', async () => {
      const user = await loadUserByName('bob');
      await updateUser(user!.uid!, { email: 'bob2@example.com' });

      const updated = await loadUser(user!.uid!);
      expect(updated!.email).toBe('bob2@example.com');
    });

    it('should delete a user', async () => {
      const user = await createUser({
        name: 'todelete',
        email: 'del@example.com',
        password: 'pass',
      });

      await deleteUser(user.uid!);
      expect(await loadUser(user.uid!)).toBeNull();
    });
  });

  describe('sessions', () => {
    let testUid: number;

    beforeAll(async () => {
      const user = await createUser({
        name: 'sessionuser',
        email: 'session@example.com',
        password: 'pass',
      });
      testUid = user.uid!;
    });

    it('should create a session with a token', async () => {
      const session = await createSession(testUid);
      expect(session.token).toBeDefined();
      expect(session.token).toContain('.');
      expect(session.token.length).toBeGreaterThan(64);
      expect(session.uid).toBe(testUid);
      expect(session.expires).toBeDefined();
    });

    it('should validate a valid token', async () => {
      const session = await createSession(testUid);
      const validated = await validateToken(session.token);
      expect(validated).not.toBeNull();
      expect(validated!.uid).toBe(testUid);
    });

    it('should reject a non-existent token', async () => {
      const validated = await validateToken('nonexistent_token_value');
      expect(validated).toBeNull();
    });

    it('should destroy a session', async () => {
      const session = await createSession(testUid);
      await destroySession(session.token);
      const validated = await validateToken(session.token);
      expect(validated).toBeNull();
    });

    it('should reject an expired token', async () => {
      // Create a session with 0 expiry hours (already expired)
      const session = await createSession(testUid, 0);
      // Wait a tiny bit so the comparison catches it
      await new Promise((r) => setTimeout(r, 10));
      const validated = await validateToken(session.token);
      expect(validated).toBeNull();
    });
  });

  describe('permissions', () => {
    it('should check if role has specific permission', async () => {
      expect(await roleHasPermission('anonymous', 'access content')).toBe(
        true
      );
      expect(
        await roleHasPermission('anonymous', 'create article content')
      ).toBe(false);
    });

    it('should grant admin wildcard access', async () => {
      expect(await roleHasPermission('admin', 'access content')).toBe(
        true
      );
      expect(
        await roleHasPermission('admin', 'any random permission')
      ).toBe(true);
    });

    it('should assign permissions to roles', async () => {
      await assignRolePermission(
        'authenticated',
        'create article content'
      );
      expect(
        await roleHasPermission('authenticated', 'create article content')
      ).toBe(true);
    });

    it('should check user permissions through their roles', async () => {
      const user = await loadUserByName('alice');
      expect(
        await userHasPermission(user, 'access content')
      ).toBe(true);
      expect(
        await userHasPermission(user, 'create article content')
      ).toBe(true);
    });

    it('should handle anonymous user permissions', async () => {
      expect(await userHasPermission(null, 'access content')).toBe(true);
      expect(
        await userHasPermission(null, 'create article content')
      ).toBe(false);
    });
  });
});
