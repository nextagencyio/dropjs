import { test, expect, apiPost } from './fixtures';

test.describe('Public SEO Features', () => {
  test('front page should have title in HTML', async ({ authenticatedPage: page }) => {
    await page.goto('/front');
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title).not.toBe('');
  });

  test('node page should have title matching node title', async ({ authenticatedPage: page }) => {
    const resp = await apiPost(page, '/api/node/article', {
      title: 'SEO Meta Title Test Article',
      status: 1,
      field_body: { value: '<p>Article body for SEO test.</p>', format: 'full_html' },
    });
    const body = await resp.json();
    const nid = body.data?.nid;

    await page.goto(`/node/${nid}`);
    const title = await page.title();
    expect(title).toContain('SEO Meta Title Test Article');
  });

  test('node page should have og:title meta tag', async ({ authenticatedPage: page }) => {
    const resp = await apiPost(page, '/api/node/article', {
      title: 'OG Tag Test Article',
      status: 1,
      field_body: { value: '<p>Content for OG test.</p>', format: 'full_html' },
    });
    const body = await resp.json();
    const nid = body.data?.nid;

    await page.goto(`/node/${nid}`);
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toContain('OG Tag Test Article');
  });

  test('RSS feed should return valid XML with content', async ({ authenticatedPage: page }) => {
    // Ensure at least one published article exists
    await apiPost(page, '/api/node/article', {
      title: 'RSS Feed Test Article',
      status: 1,
      promote: 1,
      field_body: { value: '<p>RSS body.</p>', format: 'full_html' },
    });

    const resp = await page.request.get('/rss.xml');
    expect(resp.status()).toBe(200);
    expect(resp.headers()['content-type']).toContain('application/rss+xml');

    const xml = await resp.text();
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('<rss');
    expect(xml).toContain('<channel>');
    expect(xml).toContain('RSS Feed Test Article');
  });

  test('sitemap.xml should return valid XML', async ({ page }) => {
    const resp = await page.request.get('/sitemap.xml');
    expect(resp.status()).toBe(200);
    const xml = await resp.text();
    expect(xml).toContain('<urlset');
    expect(xml).toContain('/front');
  });

  test('node page content should be in initial HTML (SSR)', async ({ authenticatedPage: page }) => {
    const resp = await apiPost(page, '/api/node/article', {
      title: 'SSR Render Test Article',
      status: 1,
      field_body: { value: '<p>Server rendered body text.</p>', format: 'full_html' },
    });
    const body = await resp.json();
    const nid = body.data?.nid;

    // Fetch the raw HTML without JavaScript execution
    const htmlResp = await page.request.get(`/node/${nid}`);
    const html = await htmlResp.text();

    // The title and body should be in the HTML (server-rendered, not requiring JS)
    expect(html).toContain('SSR Render Test Article');
    expect(html).toContain('Server rendered body text.');
  });

  test('front page content should be in initial HTML (SSR)', async ({ authenticatedPage: page }) => {
    await apiPost(page, '/api/node/article', {
      title: 'SSR Front Page Render Test',
      status: 1,
      promote: 1,
    });

    // Fetch raw HTML
    const htmlResp = await page.request.get('/front');
    const html = await htmlResp.text();

    // Article title should be in server-rendered HTML
    expect(html).toContain('SSR Front Page Render Test');
  });

  test('search page should have title', async ({ page }) => {
    await page.goto('/search');
    const title = await page.title();
    expect(title).toContain('Search');
  });
});
