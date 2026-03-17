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
  checkEntityAccess,
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

  describe('per-bundle entity access', () => {
    let bundleUser: Awaited<ReturnType<typeof createUser>>;

    beforeAll(async () => {
      // Create a role with only per-bundle article permissions (not generic)
      await createRole('article_editor', 'Article Editor');
      await assignRolePermission('article_editor', 'access content');
      await assignRolePermission('article_editor', 'create article content');
      await assignRolePermission('article_editor', 'edit own article content');
      await assignRolePermission('article_editor', 'delete any article content');

      bundleUser = await createUser({
        name: 'bundle_editor',
        email: 'bundle@example.com',
        password: 'test',
        roles: ['authenticated', 'article_editor'],
      });
    });

    it('should allow create with per-bundle permission', async () => {
      const allowed = await checkEntityAccess('create', {
        entityType: 'node',
        bundle: 'article',
        user: bundleUser,
      });
      expect(allowed).toBe(true);
    });

    it('should deny create for bundles without per-bundle permission', async () => {
      // Remove the generic 'create content' permission to test isolation
      // bundleUser has 'authenticated' role which has 'create content',
      // so this will still pass via the generic permission.
      // Instead, create a user with ONLY the article_editor role.
      const restrictedUser = await createUser({
        name: 'restricted_editor',
        email: 'restricted@example.com',
        password: 'test',
        roles: ['article_editor'],
      });

      // Should allow article creation
      expect(
        await checkEntityAccess('create', {
          entityType: 'node',
          bundle: 'article',
          user: restrictedUser,
        })
      ).toBe(true);

      // Should deny page creation (no generic 'create content' and no 'create page content')
      expect(
        await checkEntityAccess('create', {
          entityType: 'node',
          bundle: 'page',
          user: restrictedUser,
        })
      ).toBe(false);
    });

    it('should check per-bundle edit own permission', async () => {
      const allowed = await checkEntityAccess('update', {
        entityType: 'node',
        bundle: 'article',
        entity: { uid: bundleUser.uid, status: 1 },
        user: bundleUser,
      });
      expect(allowed).toBe(true);
    });

    it('should deny edit of others content with only edit own bundle perm', async () => {
      const allowed = await checkEntityAccess('update', {
        entityType: 'node',
        bundle: 'article',
        entity: { uid: 9999, status: 1 },
        user: bundleUser,
      });
      // bundleUser has 'edit own article content' but not 'edit any article content'
      // and the authenticated role has 'edit own content' (generic), but entity uid doesn't match
      expect(allowed).toBe(false);
    });

    it('should check per-bundle delete any permission', async () => {
      const allowed = await checkEntityAccess('delete', {
        entityType: 'node',
        bundle: 'article',
        entity: { uid: 9999, status: 1 },
        user: bundleUser,
      });
      // bundleUser has 'delete any article content'
      expect(allowed).toBe(true);
    });
  });
});
