import { test, expect, apiPost, apiGet, apiPatch, apiDelete } from './fixtures';

test.describe('Views API', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Ensure a content type exists for views to query
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: 'views_test',
      label: 'Views Test',
      description: 'Content type for views testing',
    }).catch(() => {});
  });

  test('should list default views', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, '/api/views');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data).toBeTruthy();
    expect(Array.isArray(body.data)).toBe(true);

    // Should have at least the default views
    const ids = body.data.map((v: any) => v.id);
    expect(ids).toContain('content');
    expect(ids).toContain('taxonomy_terms');
  });

  test('should get a single view', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, '/api/views/content');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data.id).toBe('content');
    expect(body.data.label).toBeTruthy();
    expect(body.data.entity_type).toBe('node');
  });

  test('should create, update, and delete a custom view', async ({ authenticatedPage: page }) => {
    // Create
    const createRes = await apiPost(page, '/api/views', {
      id: 'test_view',
      label: 'Test View',
      entity_type: 'node',
      filters: [],
      sorts: [{ field: 'changed', direction: 'DESC' }],
      display_fields: [{ field: 'title' }, { field: 'status' }],
      pager: 25,
      status: true,
    });
    expect(createRes.status()).toBe(201);

    // Verify it's in the list
    const listRes = await apiGet(page, '/api/views');
    const listBody = await listRes.json();
    const ids = listBody.data.map((v: any) => v.id);
    expect(ids).toContain('test_view');

    // Update
    const updateRes = await apiPatch(page, '/api/views/test_view', {
      label: 'Updated Test View',
    });
    expect(updateRes.status()).toBe(200);

    // Verify update
    const getRes = await apiGet(page, '/api/views/test_view');
    const getBody = await getRes.json();
    expect(getBody.data.label).toBe('Updated Test View');

    // Delete
    const delRes = await apiDelete(page, '/api/views/test_view');
    expect(delRes.status()).toBe(204);

    // Verify deletion
    const afterDelRes = await apiGet(page, '/api/views/test_view');
    expect(afterDelRes.status()).toBe(404);
  });

  test('should execute a view and return results', async ({ authenticatedPage: page }) => {
    // Create test content
    await apiPost(page, '/api/node/views_test', {
      title: 'Views Execute Test 1',
      status: true,
    });
    await apiPost(page, '/api/node/views_test', {
      title: 'Views Execute Test 2',
      status: true,
    });

    // Execute the default content view
    const res = await apiGet(page, '/api/views/content/execute');
    expect(res.status()).toBe(200);

    const body = await res.json();
    // executeView returns { data: [...], meta: { total, page, page_size, total_pages } }
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(2);
    expect(body.meta.total).toBeGreaterThanOrEqual(2);
  });

  test('should support pagination in view execution', async ({ authenticatedPage: page }) => {
    // Create enough content to fill a page
    for (let i = 1; i <= 5; i++) {
      await apiPost(page, '/api/node/views_test', {
        title: `Views Page Test ${i}`,
        status: true,
      });
    }

    // The default content view has pager=25, so all results will be on page 1
    // Test the meta total is correct
    const res = await apiGet(page, '/api/views/content/execute');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.meta.total).toBeGreaterThanOrEqual(5);
    expect(body.meta.page).toBe(1);
    expect(body.meta.page_size).toBe(25);
  });

  test('should return 404 for non-existent view', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, '/api/views/nonexistent_view');
    expect(res.status()).toBe(404);
  });
});
