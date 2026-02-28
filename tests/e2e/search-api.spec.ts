import { test, expect, apiPost, apiGet } from './fixtures';

test.describe('Search API', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Ensure content type exists
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: 'search_test',
      label: 'Search Test',
      description: 'Content type for search testing',
    }).catch(() => {});
  });

  test('should return results matching search query', async ({ authenticatedPage: page }) => {
    // Create searchable content
    await apiPost(page, '/api/node/search_test', {
      title: 'Searchable Alpha Post',
      status: true,
    });
    await apiPost(page, '/api/node/search_test', {
      title: 'Searchable Beta Post',
      status: true,
    });
    await apiPost(page, '/api/node/search_test', {
      title: 'Unrelated Content',
      status: true,
    });

    const resp = await apiGet(page, '/api/search?q=Searchable');
    expect(resp.ok()).toBeTruthy();

    const body = await resp.json();
    expect(body.data).toBeTruthy();
    expect(body.data.length).toBeGreaterThanOrEqual(2);
    expect(body.meta.query).toBe('Searchable');

    const titles = body.data.map((r: any) => r.title);
    expect(titles).toContain('Searchable Alpha Post');
    expect(titles).toContain('Searchable Beta Post');
  });

  test('should filter by entity type', async ({ authenticatedPage: page }) => {
    await apiPost(page, '/api/node/search_test', {
      title: 'TypeFilter Item',
      status: true,
    });

    const resp = await apiGet(page, '/api/search?q=TypeFilter&type=node');
    expect(resp.ok()).toBeTruthy();

    const body = await resp.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    for (const item of body.data) {
      expect(item.entity_type).toBe('node');
    }
  });

  test('should filter by bundle', async ({ authenticatedPage: page }) => {
    await apiPost(page, '/api/node/search_test', {
      title: 'BundleFilter Unique',
      status: true,
    });

    const resp = await apiGet(page, '/api/search?q=BundleFilter&bundle=search_test');
    expect(resp.ok()).toBeTruthy();

    const body = await resp.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    for (const item of body.data) {
      expect(item.bundle).toBe('search_test');
    }
  });

  test('should respect limit parameter', async ({ authenticatedPage: page }) => {
    // Create several items
    for (let i = 1; i <= 5; i++) {
      await apiPost(page, '/api/node/search_test', {
        title: `LimitTest Item ${i}`,
        status: true,
      });
    }

    const resp = await apiGet(page, '/api/search?q=LimitTest&limit=2');
    expect(resp.ok()).toBeTruthy();

    const body = await resp.json();
    expect(body.data.length).toBeLessThanOrEqual(2);
  });

  test('should reject queries shorter than 2 characters', async ({ authenticatedPage: page }) => {
    const resp = await apiGet(page, '/api/search?q=a');
    expect(resp.ok()).toBeFalsy();
    expect(resp.status()).toBe(400);
  });

  test('should reject empty query', async ({ authenticatedPage: page }) => {
    const resp = await apiGet(page, '/api/search?q=');
    expect(resp.ok()).toBeFalsy();
    expect(resp.status()).toBe(400);
  });

  test('should return entity_type and bundle in results', async ({ authenticatedPage: page }) => {
    await apiPost(page, '/api/node/search_test', {
      title: 'StructureCheck Entry',
      status: true,
    });

    const resp = await apiGet(page, '/api/search?q=StructureCheck');
    expect(resp.ok()).toBeTruthy();

    const body = await resp.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);

    const item = body.data[0];
    expect(item.entity_type).toBeDefined();
    expect(item.bundle).toBeDefined();
    expect(item.id).toBeDefined();
    expect(item.title).toBeDefined();
  });
});
