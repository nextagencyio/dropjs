import { test, expect, apiPost, apiGet, apiDelete } from './fixtures';

test.describe('Batch API', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Ensure a content type exists for batch operations
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: 'batch_test',
      label: 'Batch Test',
      description: 'Content type for batch API testing',
    }).catch(() => {}); // Ignore if already exists
  });

  test('should create multiple entities in a batch', async ({ authenticatedPage: page }) => {
    const resp = await apiPost(page, '/api/batch', {
      operations: [
        {
          method: 'POST',
          path: '/api/node/batch_test',
          body: { title: 'Batch Item 1', status: true },
        },
        {
          method: 'POST',
          path: '/api/node/batch_test',
          body: { title: 'Batch Item 2', status: true },
        },
        {
          method: 'POST',
          path: '/api/node/batch_test',
          body: { title: 'Batch Item 3', status: true },
        },
      ],
    });

    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();

    expect(body.results).toHaveLength(3);
    expect(body.meta.total).toBe(3);
    expect(body.meta.succeeded).toBe(3);
    expect(body.meta.failed).toBe(0);

    // Each sub-operation should return 201 (created)
    for (const result of body.results) {
      expect(result.status).toBe(201);
      expect(result.body?.data?.title).toBeTruthy();
    }
  });

  test('should handle mixed operations (create + get + delete)', async ({ authenticatedPage: page }) => {
    // First create an entity via normal API to have something to read/delete
    const createResp = await apiPost(page, '/api/node/batch_test', {
      title: 'Batch Mixed Target',
      status: true,
    });
    const { data: created } = await createResp.json();
    const nid = created.nid;

    const resp = await apiPost(page, '/api/batch', {
      operations: [
        {
          method: 'POST',
          path: '/api/node/batch_test',
          body: { title: 'Batch Mixed New', status: true },
        },
        {
          method: 'GET',
          path: `/api/node/batch_test/${nid}`,
        },
        {
          method: 'DELETE',
          path: `/api/node/batch_test/${nid}`,
        },
      ],
    });

    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();

    expect(body.results).toHaveLength(3);
    expect(body.meta.succeeded).toBe(3);
    expect(body.meta.failed).toBe(0);

    // Create should be 201
    expect(body.results[0].status).toBe(201);

    // GET should be 200
    expect(body.results[1].status).toBe(200);
    expect(body.results[1].body?.data?.title).toBe('Batch Mixed Target');

    // DELETE should be 204
    expect(body.results[2].status).toBe(204);
  });

  test('should stop on first error in sequential mode', async ({ authenticatedPage: page }) => {
    const resp = await apiPost(page, '/api/batch', {
      operations: [
        {
          method: 'POST',
          path: '/api/node/batch_test',
          body: { title: 'Sequential Item 1', status: true },
        },
        {
          method: 'GET',
          path: '/api/node/batch_test/999999', // Non-existent entity
        },
        {
          method: 'POST',
          path: '/api/node/batch_test',
          body: { title: 'Sequential Item 3 (should be skipped)', status: true },
        },
      ],
      sequential: true,
    });

    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();

    expect(body.results).toHaveLength(3);

    // First should succeed
    expect(body.results[0].status).toBe(201);

    // Second should fail (404)
    expect(body.results[1].status).toBeGreaterThanOrEqual(400);

    // Third should be skipped (status 0)
    expect(body.results[2].status).toBe(0);
    expect(body.results[2].error).toContain('Skipped');

    expect(body.meta.succeeded).toBe(1);
    expect(body.meta.failed).toBe(1);
  });

  test('should reject batch with more than 25 operations', async ({ authenticatedPage: page }) => {
    const operations = Array.from({ length: 26 }, (_, i) => ({
      method: 'POST' as const,
      path: '/api/node/batch_test',
      body: { title: `Overflow Item ${i + 1}`, status: true },
    }));

    const resp = await apiPost(page, '/api/batch', { operations });

    expect(resp.ok()).toBeFalsy();
    expect(resp.status()).toBe(400);

    const body = await resp.json();
    expect(body.error?.message).toContain('25');
  });

  test('should require authentication for batch endpoint', async ({ page }) => {
    // Send a batch request without authentication
    const resp = await page.request.post('/api/batch', {
      data: {
        operations: [
          {
            method: 'GET',
            path: '/api/entity-types',
          },
        ],
      },
    });

    // Should fail — either 401 (no auth) or 403 (CSRF) depending on middleware order
    expect(resp.ok()).toBeFalsy();
    expect([401, 403]).toContain(resp.status());
  });

  test('should reject empty operations array', async ({ authenticatedPage: page }) => {
    const resp = await apiPost(page, '/api/batch', {
      operations: [],
    });

    expect(resp.ok()).toBeFalsy();
    expect(resp.status()).toBe(400);

    const body = await resp.json();
    expect(body.error?.message).toContain('non-empty');
  });

  test('should reject operations with invalid paths', async ({ authenticatedPage: page }) => {
    const resp = await apiPost(page, '/api/batch', {
      operations: [
        {
          method: 'GET',
          path: '/not-an-api-path',
        },
      ],
    });

    expect(resp.ok()).toBeFalsy();
    expect(resp.status()).toBe(400);

    const body = await resp.json();
    expect(body.error?.message).toContain('/api/');
  });

  test('should prevent recursive batch calls', async ({ authenticatedPage: page }) => {
    const resp = await apiPost(page, '/api/batch', {
      operations: [
        {
          method: 'POST',
          path: '/api/batch',
          body: { operations: [] },
        },
      ],
    });

    expect(resp.ok()).toBeFalsy();
    expect(resp.status()).toBe(400);

    const body = await resp.json();
    expect(body.error?.message).toContain('nest');
  });

  test('should preserve operation order in results', async ({ authenticatedPage: page }) => {
    const resp = await apiPost(page, '/api/batch', {
      operations: [
        {
          method: 'POST',
          path: '/api/node/batch_test',
          body: { title: 'Order Test Alpha', status: true },
        },
        {
          method: 'POST',
          path: '/api/node/batch_test',
          body: { title: 'Order Test Beta', status: true },
        },
        {
          method: 'POST',
          path: '/api/node/batch_test',
          body: { title: 'Order Test Gamma', status: true },
        },
      ],
      sequential: true,
    });

    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();

    expect(body.results).toHaveLength(3);
    expect(body.results[0].body?.data?.title).toBe('Order Test Alpha');
    expect(body.results[1].body?.data?.title).toBe('Order Test Beta');
    expect(body.results[2].body?.data?.title).toBe('Order Test Gamma');
  });
});
