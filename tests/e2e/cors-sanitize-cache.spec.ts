import { test, expect, apiGet, apiPost, apiPut, apiDelete } from './fixtures';

test.describe('CORS', () => {
  test('should return CORS headers on API requests', async ({ authenticatedPage: page }) => {
    const res = await page.request.fetch(`http://localhost:3000/api/health`, {
      headers: { Origin: 'http://example.com' },
    });
    expect(res.status()).toBe(200);
    const corsHeader = res.headers()['access-control-allow-origin'];
    expect(corsHeader).toBeTruthy();
  });

  test('should handle preflight OPTIONS requests', async ({ authenticatedPage: page }) => {
    const res = await page.request.fetch(`http://localhost:3000/api/health`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });
    expect(res.status()).toBe(204);
    expect(res.headers()['access-control-allow-methods']).toBeTruthy();
  });
});

test.describe('Input Sanitization', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Ensure article content type exists
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node', bundle: 'article', label: 'Article',
    }).catch(() => {});
  });

  test('should strip script tags from entity data', async ({ authenticatedPage: page }) => {
    const res = await apiPost(page, '/api/node/article', {
      title: 'Test <script>alert("xss")</script> Article',
      status: true,
    });
    const body = await res.json();
    expect(res.status()).toBe(201);
    expect(body.data.title).not.toContain('<script>');
    expect(body.data.title).toContain('Test');

    await apiDelete(page, `/api/node/article/${body.data.nid}`);
  });

  test('should strip event handler attributes', async ({ authenticatedPage: page }) => {
    const res = await apiPost(page, '/api/node/article', {
      title: 'Safe <b onmouseover="evil()">bold</b>',
      status: true,
    });
    const body = await res.json();
    expect(res.status()).toBe(201);
    expect(body.data.title).not.toContain('onmouseover');
    expect(body.data.title).toContain('<b>');

    await apiDelete(page, `/api/node/article/${body.data.nid}`);
  });

  test('should strip javascript: URLs', async ({ authenticatedPage: page }) => {
    const res = await apiPost(page, '/api/node/article', {
      title: 'Link <a href="javascript:alert(1)">click</a>',
      status: true,
    });
    const body = await res.json();
    expect(res.status()).toBe(201);
    expect(body.data.title).not.toContain('javascript:');

    await apiDelete(page, `/api/node/article/${body.data.nid}`);
  });

  test('should allow safe HTML tags', async ({ authenticatedPage: page }) => {
    const res = await apiPost(page, '/api/node/article', {
      title: 'Text with <strong>bold</strong> and <em>italic</em>',
      status: true,
    });
    const body = await res.json();
    expect(res.status()).toBe(201);
    expect(body.data.title).toContain('<strong>bold</strong>');
    expect(body.data.title).toContain('<em>italic</em>');

    await apiDelete(page, `/api/node/article/${body.data.nid}`);
  });
});

test.describe('Cache API', () => {
  test('should return cache stats', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, '/api/cache/stats');
    const body = await res.json();
    expect(res.status()).toBe(200);
    expect(body.data).toBeDefined();
  });

  test('should clear cache', async ({ authenticatedPage: page }) => {
    const res = await apiDelete(page, '/api/cache');
    expect(res.status()).toBe(204);
  });
});

test.describe('Display Modes API', () => {
  test('should list default view modes for node', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, '/api/display-modes/node');
    const body = await res.json();
    expect(res.status()).toBe(200);
    expect(body.data).toBeInstanceOf(Array);
    const ids = body.data.map((m: any) => m.id);
    expect(ids).toContain('default');
    expect(ids).toContain('full');
    expect(ids).toContain('teaser');
    expect(ids).toContain('search_result');
  });

  test('should create a custom view mode', async ({ authenticatedPage: page }) => {
    const res = await apiPost(page, '/api/display-modes/node', {
      id: 'card',
      label: 'Card',
      description: 'Card display for grids',
    });
    const body = await res.json();
    expect(res.status()).toBe(201);
    expect(body.data.id).toBe('card');
    expect(body.data.label).toBe('Card');

    await apiDelete(page, '/api/display-modes/node/card');
  });

  test('should get default view display for article', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, '/api/display/node/article/full');
    const body = await res.json();
    expect(res.status()).toBe(200);
    expect(body.data.entity_type).toBe('node');
    expect(body.data.bundle).toBe('article');
    expect(body.data.mode).toBe('full');
    expect(body.data.fields).toBeDefined();
  });

  test('should get teaser display', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, '/api/display/node/article/teaser');
    const body = await res.json();
    expect(res.status()).toBe(200);
    expect(body.data.fields).toBeDefined();
  });

  test('should save and retrieve a custom display', async ({ authenticatedPage: page }) => {
    const display = {
      label: 'Custom Full',
      status: true,
      fields: {
        title: {
          field: 'title',
          label: 'above',
          formatter: 'string',
          formatter_settings: {},
          weight: 0,
          visible: true,
        },
      },
    };

    const putRes = await apiPut(page, '/api/display/node/article/full', display);
    expect(putRes.status()).toBe(200);

    const getRes = await apiGet(page, '/api/display/node/article/full');
    const body = await getRes.json();
    expect(body.data.label).toBe('Custom Full');
    expect(body.data.fields.title).toBeDefined();
    expect(body.data.fields.title.visible).toBe(true);

    // Cleanup
    await apiDelete(page, '/api/display/node/article/full');
  });

  test('should delete a view mode', async ({ authenticatedPage: page }) => {
    await apiPost(page, '/api/display-modes/node', {
      id: 'temp_mode',
      label: 'Temporary',
    });

    const delRes = await apiDelete(page, '/api/display-modes/node/temp_mode');
    expect(delRes.status()).toBe(204);
  });
});
