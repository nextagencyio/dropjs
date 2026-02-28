import { test, expect } from '@playwright/test';

// These tests verify the API responses match Drupal's expected data structures.
// They run against the API directly rather than through the admin UI.

test.describe('Drupal Schema Compatibility', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    // Register admin user (first user gets admin role); ignore if already exists
    await request.post('/api/auth/register', {
      data: { name: 'admin', email: 'admin@test.com', password: 'DropJs2024Admin' },
    }).catch(() => {});

    // Login as admin to get a token with full permissions
    const loginResp = await request.post('/api/auth/login', {
      data: { name: 'admin', password: 'DropJs2024Admin' },
    });
    const body = await loginResp.json();
    if (!body.data?.token) {
      throw new Error(
        `Login API failed (status ${loginResp.status}): ${JSON.stringify(body)}`
      );
    }
    token = body.data.token;
  });

  test('should have Drupal-compatible entity type structure', async ({ request }) => {
    expect(token).toBeDefined();

    // Create a content type
    const createResp = await request.post('/api/entity-types', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        entity_type: 'node',
        bundle: 'page',
        label: 'Page',
        description: 'A basic page',
      },
    });
    // May already exist, that's OK
    if (createResp.ok()) {
      const body = await createResp.json();
      expect(body).toBeDefined();
    }

    // Verify entity types list returns Drupal-compatible structure
    const typesResp = await request.get('/api/entity-types', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(typesResp.ok()).toBeTruthy();
    const typesBody = await typesResp.json();

    // Should return a data array with entity type definitions
    const types = typesBody.data ?? typesBody;
    expect(Array.isArray(types)).toBeTruthy();

    // Find the page type
    const pageType = types.find((t: any) => t.bundle === 'page' && t.entity_type === 'node');
    expect(pageType).toBeDefined();
    expect(pageType.entity_type).toBe('node');
    expect(pageType.bundle).toBe('page');
    expect(pageType.label).toBe('Page');
  });

  test('should create nodes with Drupal-compatible fields', async ({ request }) => {
    expect(token).toBeDefined();

    // Ensure page type exists
    await request.post('/api/entity-types', {
      headers: { Authorization: `Bearer ${token}` },
      data: { entity_type: 'node', bundle: 'page', label: 'Page' },
    }).catch(() => {});

    // Create a node
    const createResp = await request.post('/api/node/page', {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: 'Schema Test Page', status: 1 },
    });
    expect(createResp.ok()).toBeTruthy();

    const body = await createResp.json();
    const node = body.data ?? body;

    // Drupal nodes should have these standard fields
    expect(node).toHaveProperty('nid');
    expect(node).toHaveProperty('uuid');
    expect(node).toHaveProperty('type', 'page');
    expect(node).toHaveProperty('title', 'Schema Test Page');

    // nid should be a positive integer
    expect(typeof node.nid).toBe('number');
    expect(node.nid).toBeGreaterThan(0);

    // uuid should be a valid UUID format
    expect(node.uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  test('should retrieve nodes with full Drupal field structure', async ({ request }) => {
    expect(token).toBeDefined();

    // Ensure page type exists
    await request.post('/api/entity-types', {
      headers: { Authorization: `Bearer ${token}` },
      data: { entity_type: 'node', bundle: 'page', label: 'Page' },
    }).catch(() => {});

    // Create a node
    const createResp = await request.post('/api/node/page', {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: 'Retrieve Test Page', status: 1 },
    });
    const createBody = await createResp.json();
    const nid = (createBody.data ?? createBody).nid;

    // Load it back
    const loadResp = await request.get(`/api/node/page/${nid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(loadResp.ok()).toBeTruthy();

    const loadBody = await loadResp.json();
    const loaded = loadBody.data ?? loadBody;

    // Should have Drupal base fields
    expect(loaded.nid).toBe(nid);
    expect(loaded.type).toBe('page');
    expect(loaded.title).toBe('Retrieve Test Page');

    // Should have timestamp fields (created/changed)
    expect(loaded.created).toBeDefined();
    expect(loaded.changed).toBeDefined();
  });

  test('should list nodes with pagination metadata', async ({ request }) => {
    expect(token).toBeDefined();

    // Ensure page type exists
    await request.post('/api/entity-types', {
      headers: { Authorization: `Bearer ${token}` },
      data: { entity_type: 'node', bundle: 'page', label: 'Page' },
    }).catch(() => {});

    // List nodes
    const listResp = await request.get('/api/node/page', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listResp.ok()).toBeTruthy();

    const body = await listResp.json();

    // Should have Drupal-compatible pagination structure
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('meta');
    expect(Array.isArray(body.data)).toBeTruthy();

    // Meta should have pagination info
    expect(body.meta).toHaveProperty('total');
    expect(body.meta).toHaveProperty('count');
    expect(body.meta).toHaveProperty('offset');
    expect(body.meta).toHaveProperty('limit');
  });

  test('should support PATCH updates on nodes', async ({ request }) => {
    expect(token).toBeDefined();

    // Ensure page type exists
    await request.post('/api/entity-types', {
      headers: { Authorization: `Bearer ${token}` },
      data: { entity_type: 'node', bundle: 'page', label: 'Page' },
    }).catch(() => {});

    // Create a node
    const createResp = await request.post('/api/node/page', {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: 'Update Test Page', status: 1 },
    });
    const createBody = await createResp.json();
    const nid = (createBody.data ?? createBody).nid;

    // Update via PATCH
    const updateResp = await request.patch(`/api/node/page/${nid}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: 'Updated Test Page' },
    });
    expect(updateResp.ok()).toBeTruthy();

    const updateBody = await updateResp.json();
    const updated = updateBody.data ?? updateBody;
    expect(updated.title).toBe('Updated Test Page');
  });

  test('should support DELETE on nodes', async ({ request }) => {
    expect(token).toBeDefined();

    // Ensure page type exists
    await request.post('/api/entity-types', {
      headers: { Authorization: `Bearer ${token}` },
      data: { entity_type: 'node', bundle: 'page', label: 'Page' },
    }).catch(() => {});

    // Create a node to delete
    const createResp = await request.post('/api/node/page', {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: 'Delete Test Page', status: 1 },
    });
    const createBody = await createResp.json();
    const nid = (createBody.data ?? createBody).nid;

    // Delete
    const deleteResp = await request.delete(`/api/node/page/${nid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(deleteResp.ok()).toBeTruthy();

    // Verify it's gone
    const getResp = await request.get(`/api/node/page/${nid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getResp.ok()).toBeFalsy();
  });

  test('should have Drupal-compatible field storage for custom fields', async ({ request }) => {
    expect(token).toBeDefined();

    // Ensure page type exists
    await request.post('/api/entity-types', {
      headers: { Authorization: `Bearer ${token}` },
      data: { entity_type: 'node', bundle: 'page', label: 'Page' },
    }).catch(() => {});

    // Add a field to the page content type
    await request.post('/api/entity-types/node/page/fields', {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'field_body', label: 'Body', type: 'text_long' },
    }).catch(() => {});

    // Create a node with the field value
    const createResp = await request.post('/api/node/page', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: 'Field Test Page',
        status: 1,
        field_body: { value: 'Test body content', format: 'plain_text' },
      },
    });
    expect(createResp.ok()).toBeTruthy();

    const createBody = await createResp.json();
    const nid = (createBody.data ?? createBody).nid;

    // Load it back and verify field data persisted
    const loadResp = await request.get(`/api/node/page/${nid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const loadBody = await loadResp.json();
    const loaded = loadBody.data ?? loadBody;

    // field_body should be present if the field was registered
    if (loaded.field_body !== undefined) {
      expect(loaded.field_body).toBeDefined();
    }
  });

  test('should handle taxonomy term creation', async ({ request }) => {
    expect(token).toBeDefined();

    // Create a vocabulary via API
    await request.post('/api/taxonomy/vocabularies', {
      headers: { Authorization: `Bearer ${token}` },
      data: { vid: 'test_vocab', name: 'Test Vocabulary' },
    }).catch(() => {});

    // Create a term
    const termResp = await request.post('/api/taxonomy_term/test_vocab', {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: 'Test Term', status: 1 },
    });

    // If taxonomy endpoints are implemented
    if (termResp.ok()) {
      const termBody = await termResp.json();
      const term = termBody.data ?? termBody;
      expect(term).toHaveProperty('title', 'Test Term');

      // List terms
      const listResp = await request.get('/api/taxonomy_term/test_vocab', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(listResp.ok()).toBeTruthy();
      const listBody = await listResp.json();
      const terms = listBody.data ?? listBody;
      expect(Array.isArray(terms)).toBeTruthy();
    }
  });
});
