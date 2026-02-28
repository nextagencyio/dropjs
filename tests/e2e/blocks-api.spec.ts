import { test, expect, apiPost, apiGet, apiPatch, apiDelete } from './fixtures';

test.describe('Block/Region API', () => {
  test('should list registered blocks', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, '/api/blocks');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);

    // Default blocks should be registered
    const ids = body.data.map((b: any) => b.id);
    expect(ids).toContain('system_powered_by');
    expect(ids).toContain('system_branding_block');
  });

  test('should get default regions', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, '/api/regions');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);

    const regionIds = body.data.map((r: any) => r.id);
    expect(regionIds).toContain('header');
    expect(regionIds).toContain('content');
    expect(regionIds).toContain('footer');
    expect(regionIds).toContain('sidebar_first');
  });

  test('should create, get, update, and delete a block placement', async ({
    authenticatedPage: page,
  }) => {
    // Create
    const createRes = await apiPost(page, '/api/block-placements', {
      id: 'test_powered_by',
      blockId: 'system_powered_by',
      region: 'footer',
      weight: 10,
      visibility: [],
      settings: {},
      status: true,
      theme: 'default',
    });
    expect(createRes.status()).toBe(201);

    const createBody = await createRes.json();
    expect(createBody.data.id).toBe('test_powered_by');
    expect(createBody.data.region).toBe('footer');

    // Get
    const getRes = await apiGet(page, '/api/block-placements/test_powered_by');
    expect(getRes.status()).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.data.blockId).toBe('system_powered_by');

    // Update
    const patchRes = await apiPatch(page, '/api/block-placements/test_powered_by', {
      region: 'sidebar_first',
      weight: 5,
    });
    expect(patchRes.status()).toBe(200);
    const patchBody = await patchRes.json();
    expect(patchBody.data.region).toBe('sidebar_first');
    expect(patchBody.data.weight).toBe(5);

    // Delete
    const delRes = await apiDelete(page, '/api/block-placements/test_powered_by');
    expect(delRes.status()).toBe(204);

    // Verify deleted
    const afterDelRes = await apiGet(page, '/api/block-placements/test_powered_by');
    expect(afterDelRes.status()).toBe(404);
  });

  test('should list block placements', async ({ authenticatedPage: page }) => {
    // Create a placement first
    await apiPost(page, '/api/block-placements', {
      id: 'list_test_block',
      blockId: 'system_powered_by',
      region: 'footer',
      weight: 0,
      visibility: [],
      settings: {},
      status: true,
      theme: 'default',
    });

    const res = await apiGet(page, '/api/block-placements');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);

    const ids = body.data.map((p: any) => p.id);
    expect(ids).toContain('list_test_block');

    // Clean up
    await apiDelete(page, '/api/block-placements/list_test_block');
  });

  test('should filter placements by theme', async ({ authenticatedPage: page }) => {
    await apiPost(page, '/api/block-placements', {
      id: 'theme_filter_block',
      blockId: 'system_powered_by',
      region: 'footer',
      weight: 0,
      visibility: [],
      settings: {},
      status: true,
      theme: 'custom_theme',
    });

    const res = await apiGet(page, '/api/block-placements?theme=custom_theme');
    expect(res.status()).toBe(200);

    const body = await res.json();
    for (const p of body.data) {
      expect(p.theme).toBe('custom_theme');
    }

    // Clean up
    await apiDelete(page, '/api/block-placements/theme_filter_block');
  });

  test('should render a region', async ({ authenticatedPage: page }) => {
    // Place a block in footer
    await apiPost(page, '/api/block-placements', {
      id: 'render_test_block',
      blockId: 'system_powered_by',
      region: 'footer',
      weight: 0,
      visibility: [],
      settings: {},
      status: true,
      theme: 'default',
    });

    const res = await apiGet(page, '/api/regions/footer/render');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].html).toContain('DropJS');
    expect(body.meta.region).toBe('footer');

    // Clean up
    await apiDelete(page, '/api/block-placements/render_test_block');
  });
});
