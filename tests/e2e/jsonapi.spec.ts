import { test, expect, apiPost, apiGet, apiDelete } from './fixtures';

test.describe('JSON:API Output Format', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node', bundle: 'article', label: 'Article',
    }).catch(() => {});
  });

  test('should return JSON:API format with Accept header', async ({ authenticatedPage: page }) => {
    // Create an article
    const createRes = await apiPost(page, '/api/node/article', {
      title: 'JSON:API Test Article',
      status: true,
    });
    const created = (await createRes.json()).data;
    const nid = created.nid;

    // Fetch with JSON:API Accept header
    const res = await page.request.get(`/api/node/article/${nid}`, {
      headers: {
        Accept: 'application/vnd.api+json',
      },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.jsonapi).toBeDefined();
    expect(body.jsonapi.version).toBe('1.0');
    expect(body.data).toBeDefined();
    expect(body.data.type).toContain('node--article');
    expect(body.data.id).toBeDefined();
    expect(body.data.attributes).toBeDefined();
    expect(body.data.attributes.title).toBe('JSON:API Test Article');

    await apiDelete(page, `/api/node/article/${nid}`);
  });

  test('should return JSON:API format with ?format=jsonapi query param', async ({ authenticatedPage: page }) => {
    const createRes = await apiPost(page, '/api/node/article', {
      title: 'JSON:API Query Param Test',
      status: true,
    });
    const created = (await createRes.json()).data;
    const nid = created.nid;

    const res = await apiGet(page, `/api/node/article/${nid}?format=jsonapi`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.jsonapi).toBeDefined();
    expect(body.jsonapi.version).toBe('1.0');
    expect(body.data.type).toContain('node--article');
    expect(body.data.attributes).toBeDefined();

    await apiDelete(page, `/api/node/article/${nid}`);
  });

  test('should return standard format without JSON:API header', async ({ authenticatedPage: page }) => {
    const createRes = await apiPost(page, '/api/node/article', {
      title: 'Standard Format Test',
      status: true,
    });
    const created = (await createRes.json()).data;
    const nid = created.nid;

    const res = await apiGet(page, `/api/node/article/${nid}`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    // Standard format: { data: { nid, title, ... } } — no jsonapi key
    expect(body.jsonapi).toBeUndefined();
    expect(body.data).toBeDefined();
    expect(body.data.title).toBe('Standard Format Test');

    await apiDelete(page, `/api/node/article/${nid}`);
  });

  test('should transform list responses to JSON:API format', async ({ authenticatedPage: page }) => {
    const createRes = await apiPost(page, '/api/node/article', {
      title: 'JSON:API List Test',
      status: true,
    });
    const created = (await createRes.json()).data;
    const nid = created.nid;

    const res = await apiGet(page, `/api/node/article?format=jsonapi`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.jsonapi).toBeDefined();
    expect(body.jsonapi.version).toBe('1.0');
    expect(Array.isArray(body.data)).toBe(true);

    if (body.data.length > 0) {
      expect(body.data[0].type).toContain('node--article');
      expect(body.data[0].attributes).toBeDefined();
    }

    await apiDelete(page, `/api/node/article/${nid}`);
  });
});
