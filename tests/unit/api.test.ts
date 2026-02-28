import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createConnection, destroyConnection } from '../../src/db/index.js';
import {
  Entity,
  registerEntityType,
  clearEntityTypeRegistry,
  EventBus,
} from '../../src/core/index.js';
import {
  ensureAuthTables,
  seedDefaultRoles,
  createUser,
  assignRolePermission,
} from '../../src/auth/index.js';
import { createApiServer } from '../../src/api/index.js';
import type { Express } from 'express';

// Ensure field type registration side-effects run
import '../../src/field/index.js';

let app: Express;
let authToken: string;
let testUserUid: number;

describe('@dropjs/api', () => {
  beforeAll(async () => {
    createConnection({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
    });

    // Register entity types
    registerEntityType({
      entity_type: 'node',
      bundle: 'article',
      label: 'Article',
      fields: {
        title: { type: 'string', label: 'Title', required: true },
        body: { type: 'text_long', label: 'Body' },
        field_tags: {
          type: 'entity_reference',
          label: 'Tags',
          cardinality: -1,
          settings: { target_type: 'taxonomy_term', target_bundle: 'tags' },
        },
      },
    });

    registerEntityType({
      entity_type: 'taxonomy_term',
      bundle: 'tags',
      label: 'Tag',
      fields: {
        title: { type: 'string', label: 'Name', required: true },
      },
    });

    await Entity.ensureBaseTable('node');
    await Entity.ensureFieldTables({
      entity_type: 'node',
      bundle: 'article',
      label: 'Article',
      fields: {
        title: { type: 'string', label: 'Title' },
        body: { type: 'text_long', label: 'Body' },
        field_tags: {
          type: 'entity_reference',
          label: 'Tags',
          cardinality: -1,
          settings: { target_type: 'taxonomy_term' },
        },
      },
    });

    await Entity.ensureBaseTable('taxonomy_term');

    // Set up auth
    await ensureAuthTables();
    await seedDefaultRoles();
    await assignRolePermission('authenticated', 'create article content');

    // Create test user and get token
    const testUser = await createUser({
      name: 'testuser',
      email: 'test@example.com',
      password: 'testpass',
    });
    testUserUid = testUser.uid;

    // Create API server (disable CSRF and rate limiting for testing)
    app = createApiServer({ disableCsrf: true, disableRateLimit: true });

    // Login to get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ name: 'testuser', password: 'testpass' });

    authToken = loginRes.body.data.token;
  });

  afterAll(async () => {
    clearEntityTypeRegistry();
    EventBus.removeAllListeners();
    await destroyConnection();
  });

  describe('POST /api/auth/login', () => {
    it('should return token for valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ name: 'testuser', password: 'testpass' });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.name).toBe('testuser');
    });

    it('should return 401 for invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ name: 'testuser', password: 'wrongpass' });

      expect(res.status).toBe(401);
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ name: 'testuser' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/register', () => {
    it('should create user and return token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'newuser',
          email: 'new@example.com',
          password: 'newpass',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.name).toBe('newuser');
    });
  });

  describe('POST /api/node/article (create)', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/node/article')
        .send({ title: 'Unauth Test', status: true });

      expect(res.status).toBe(401);
    });

    it('should create an entity and return 201', async () => {
      const res = await request(app)
        .post('/api/node/article')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'API Created', status: true });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('API Created');
      expect(res.body.data.nid).toBeDefined();
    });

    it('should create with custom fields', async () => {
      const res = await request(app)
        .post('/api/node/article')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'With Body',
          status: true,
          body: { value: '<p>Hello</p>', format: 'html' },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.body).toEqual({
        value: '<p>Hello</p>',
        format: 'html',
      });
    });
  });

  describe('GET /api/node/article (list)', () => {
    beforeAll(async () => {
      // Create some test articles
      for (let i = 1; i <= 5; i++) {
        await Entity.create('node', 'article', {
          title: `List Test ${i}`,
          status: true,
        });
      }
    });

    it('should return paginated list of entities', async () => {
      const res = await request(app).get('/api/node/article');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBeGreaterThanOrEqual(5);
      expect(res.body.links).toBeDefined();
    });

    it('should paginate with offset and limit', async () => {
      const res = await request(app).get(
        '/api/node/article?page[offset]=0&page[limit]=2'
      );

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.meta.limit).toBe(2);
    });

    it('should filter by base field conditions', async () => {
      const res = await request(app).get(
        '/api/node/article?filter[status]=1'
      );

      expect(res.status).toBe(200);
      for (const item of res.body.data) {
        expect(item.status).toBeTruthy();
      }
    });

    it('should sort by field with - prefix for DESC', async () => {
      const res = await request(app).get(
        '/api/node/article?sort=-title&page[limit]=3'
      );

      expect(res.status).toBe(200);
      const titles = res.body.data.map((d: any) => d.title);
      const sorted = [...titles].sort().reverse();
      expect(titles).toEqual(sorted);
    });

    it('should apply sparse fieldsets', async () => {
      const res = await request(app).get(
        '/api/node/article?fields=title'
      );

      expect(res.status).toBe(200);
      for (const item of res.body.data) {
        expect(item.title).toBeDefined();
        expect(item.nid).toBeDefined(); // always included
        // body should not be present
        expect(item.body).toBeUndefined();
      }
    });

    it('should include pagination links', async () => {
      const res = await request(app).get(
        '/api/node/article?page[offset]=0&page[limit]=2'
      );

      expect(res.body.links.self).toBeDefined();
      if (res.body.meta.total > 2) {
        expect(res.body.links.next).toBeDefined();
      }
    });
  });

  describe('GET /api/node/article/:id (get)', () => {
    let articleId: number;

    beforeAll(async () => {
      const article = await Entity.create('node', 'article', {
        title: 'Get Test Article',
        status: true,
        body: { value: '<p>Content</p>', format: 'html' },
      });
      articleId = article.nid!;
    });

    it('should return a single entity by ID', async () => {
      const res = await request(app).get(
        `/api/node/article/${articleId}`
      );

      expect(res.status).toBe(200);
      expect(res.body.data.nid).toBe(articleId);
      expect(res.body.data.title).toBe('Get Test Article');
    });

    it('should return 404 for non-existent entity', async () => {
      const res = await request(app).get('/api/node/article/99999');
      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid ID', async () => {
      const res = await request(app).get('/api/node/article/abc');
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/node/article/:id (update)', () => {
    let articleId: number;

    beforeAll(async () => {
      const article = await Entity.create('node', 'article', {
        title: 'Update Test',
        status: true,
        uid: testUserUid,
      });
      articleId = article.nid!;
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .patch(`/api/node/article/${articleId}`)
        .send({ title: 'Updated' });

      expect(res.status).toBe(401);
    });

    it('should update entity fields', async () => {
      const res = await request(app)
        .patch(`/api/node/article/${articleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated Title');
    });

    it('should return 404 for non-existent entity', async () => {
      const res = await request(app)
        .patch('/api/node/article/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Nope' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/node/article/:id (delete)', () => {
    let articleId: number;

    beforeAll(async () => {
      const article = await Entity.create('node', 'article', {
        title: 'Delete Test',
        status: true,
        uid: testUserUid,
      });
      articleId = article.nid!;
    });

    it('should require authentication', async () => {
      const res = await request(app).delete(
        `/api/node/article/${articleId}`
      );

      expect(res.status).toBe(401);
    });

    it('should delete entity and return 204', async () => {
      const res = await request(app)
        .delete(`/api/node/article/${articleId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(204);

      // Verify deleted
      const getRes = await request(app).get(
        `/api/node/article/${articleId}`
      );
      expect(getRes.status).toBe(404);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should revoke token', async () => {
      // Create a fresh token to logout
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ name: 'testuser', password: 'testpass' });

      const token = loginRes.body.data.token;

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);

      // Token should now be invalid
      const createRes = await request(app)
        .post('/api/node/article')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Should Fail' });

      expect(createRes.status).toBe(401);
    });
  });

  describe('query parser', () => {
    it('should return 404 for unknown entity type', async () => {
      const res = await request(app).get('/api/node/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});
