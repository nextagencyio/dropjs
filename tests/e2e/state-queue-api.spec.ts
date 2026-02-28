import { test, expect, apiPost, apiGet, apiPut, apiDelete } from './fixtures';

test.describe('State API', () => {
  test('should set and get a state value', async ({ authenticatedPage: page }) => {
    // Set
    const putRes = await apiPut(page, '/api/state/test_key', {
      value: 'hello world',
    });
    expect(putRes.status()).toBe(200);

    // Get
    const getRes = await apiGet(page, '/api/state/test_key');
    expect(getRes.status()).toBe(200);

    const body = await getRes.json();
    expect(body.data.value).toBe('hello world');
  });

  test('should update an existing state value', async ({ authenticatedPage: page }) => {
    await apiPut(page, '/api/state/update_key', { value: 'original' });
    await apiPut(page, '/api/state/update_key', { value: 'updated' });

    const res = await apiGet(page, '/api/state/update_key');
    const body = await res.json();
    expect(body.data.value).toBe('updated');
  });

  test('should delete a state value', async ({ authenticatedPage: page }) => {
    await apiPut(page, '/api/state/delete_key', { value: 'temp' });

    const delRes = await apiDelete(page, '/api/state/delete_key');
    expect(delRes.status()).toBe(204);

    const getRes = await apiGet(page, '/api/state/delete_key');
    const body = await getRes.json();
    expect(body.data.value).toBeNull();
  });

  test('should return null for non-existent key', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, '/api/state/nonexistent_key_xyz');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data.value).toBeNull();
  });

  test('should store complex values', async ({ authenticatedPage: page }) => {
    const complexValue = {
      nested: { a: 1, b: [2, 3] },
      flag: true,
    };

    await apiPut(page, '/api/state/complex_key', { value: complexValue });

    const res = await apiGet(page, '/api/state/complex_key');
    const body = await res.json();
    expect(body.data.value).toEqual(complexValue);
  });
});

test.describe('Queue API', () => {
  test('should list queues', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, '/api/queues');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('should create a queue item', async ({ authenticatedPage: page }) => {
    const res = await apiPost(page, '/api/queues/test_queue', {
      data: { message: 'hello' },
    });
    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.data.item_id).toBeTruthy();
  });

  test('should show queue in list after adding items', async ({ authenticatedPage: page }) => {
    await apiPost(page, '/api/queues/visible_queue', {
      data: { task: 'count' },
    });

    const res = await apiGet(page, '/api/queues');
    const body = await res.json();

    const queue = body.data.find((q: any) => q.name === 'visible_queue');
    expect(queue).toBeTruthy();
    expect(queue.count).toBeGreaterThanOrEqual(1);
  });

  test('should purge a queue', async ({ authenticatedPage: page }) => {
    // Add items
    await apiPost(page, '/api/queues/purge_test', { data: { a: 1 } });
    await apiPost(page, '/api/queues/purge_test', { data: { a: 2 } });

    // Purge
    const delRes = await apiDelete(page, '/api/queues/purge_test');
    expect(delRes.status()).toBe(204);

    // Verify empty
    const res = await apiGet(page, '/api/queues');
    const body = await res.json();
    const queue = body.data.find((q: any) => q.name === 'purge_test');
    expect(!queue || queue.count === 0).toBe(true);
  });

  test('should process a queue', async ({ authenticatedPage: page }) => {
    // Note: without a registered worker, this should process 0 items
    const res = await apiPost(page, '/api/queues/no_worker_queue/process', {});
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data.processed).toBe(0);
  });
});
