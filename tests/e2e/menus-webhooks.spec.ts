import { test, expect, apiPost, apiGet, apiPatch, apiDelete } from './fixtures';

test.describe('Menu API', () => {
  test('should list default menus', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, '/api/menus');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(2);
    const ids = body.data.map((m: any) => m.id);
    expect(ids).toContain('main');
    expect(ids).toContain('footer');
  });

  test('should get a single menu with tree', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, '/api/menus/main');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe('main');
    expect(body.data.label).toBe('Main navigation');
    expect(Array.isArray(body.data.tree)).toBe(true);
    expect(Array.isArray(body.data.items)).toBe(true);
  });

  test('should create and delete a custom menu', async ({ authenticatedPage: page }) => {
    // Create
    const createRes = await apiPost(page, '/api/menus', {
      id: 'test_menu',
      label: 'Test Menu',
      description: 'A test menu',
    });
    expect(createRes.status()).toBe(201);
    const createBody = await createRes.json();
    expect(createBody.data.id).toBe('test_menu');

    // Verify it appears in list
    const listRes = await apiGet(page, '/api/menus');
    const listBody = await listRes.json();
    const ids = listBody.data.map((m: any) => m.id);
    expect(ids).toContain('test_menu');

    // Delete
    const delRes = await apiDelete(page, '/api/menus/test_menu');
    expect(delRes.status()).toBe(204);
  });

  test('should add, update, and delete menu items', async ({ authenticatedPage: page }) => {
    // Add item to footer menu
    const addRes = await apiPost(page, '/api/menus/footer/items', {
      title: 'About Us',
      url: '/about',
      weight: 0,
    });
    expect(addRes.status()).toBe(201);
    const item = (await addRes.json()).data;
    expect(item.title).toBe('About Us');
    expect(item.url).toBe('/about');

    // Update the item
    const updateRes = await apiPatch(page, `/api/menus/footer/items/${item.id}`, {
      title: 'About',
      weight: 5,
    });
    expect(updateRes.status()).toBe(200);
    const updated = (await updateRes.json()).data;
    expect(updated.title).toBe('About');
    expect(updated.weight).toBe(5);

    // Delete the item
    const delRes = await apiDelete(page, `/api/menus/footer/items/${item.id}`);
    expect(delRes.status()).toBe(204);
  });

  test('should not allow deleting the main menu', async ({ authenticatedPage: page }) => {
    const res = await apiDelete(page, '/api/menus/main');
    expect(res.status()).toBe(400);
  });

  test('should return 404 for non-existent menu', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, '/api/menus/nonexistent');
    expect(res.status()).toBe(404);
  });
});

test.describe('Menu Admin UI', () => {
  test('should show Menus link in Structure dropdown', async ({ authenticatedPage: page }) => {
    const toolbar = page.locator('nav').first();
    await toolbar.getByRole('link', { name: 'Structure' }).click();
    await expect(page.getByRole('link', { name: 'Menus' })).toBeVisible();
  });

  test('should navigate to menu list page', async ({ authenticatedPage: page }) => {
    const toolbar = page.locator('nav').first();
    await toolbar.getByRole('link', { name: 'Structure' }).click();
    await page.getByRole('link', { name: 'Menus' }).click();
    await expect(page.getByRole('heading', { name: 'Menus' })).toBeVisible();
  });

  test('should display default menus in list', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/menus');
    await expect(page.getByRole('heading', { name: 'Menus' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Main navigation' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Footer' })).toBeVisible();
  });

  test('should navigate to menu edit page', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/menus');
    await page.getByRole('link', { name: 'Main navigation' }).first().click();
    await expect(page.getByRole('heading', { name: 'Main navigation' })).toBeVisible();
  });

  test('should show Add link button on menu edit page', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/menus/main');
    await expect(page.getByRole('button', { name: 'Add link' })).toBeVisible();
  });
});

test.describe('Webhook API', () => {
  test('should list webhooks (initially empty)', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, '/api/webhooks');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('should create and delete a webhook', async ({ authenticatedPage: page }) => {
    // Create
    const createRes = await apiPost(page, '/api/webhooks', {
      url: 'https://example.com/hook',
      events: ['entity:create', 'entity:update'],
      secret: 'test-secret',
      active: true,
    });
    expect(createRes.status()).toBe(201);
    const webhook = (await createRes.json()).data;
    expect(webhook.url).toBe('https://example.com/hook');
    expect(webhook.events).toContain('entity:create');
    expect(webhook.active).toBe(true);

    // Verify in list
    const listRes = await apiGet(page, '/api/webhooks');
    const listBody = await listRes.json();
    expect(listBody.data.some((w: any) => w.url === 'https://example.com/hook')).toBe(true);

    // Delete
    const delRes = await apiDelete(page, `/api/webhooks/${webhook.id}`);
    expect(delRes.status()).toBe(204);
  });

  test('should require url and events for webhook creation', async ({ authenticatedPage: page }) => {
    const res = await apiPost(page, '/api/webhooks', { url: 'https://example.com/hook' });
    expect(res.status()).toBe(400);
  });
});

test.describe('Webhook Admin UI', () => {
  test('should show Webhooks link on Configuration page', async ({ authenticatedPage: page }) => {
    await page.goto('/config');
    await expect(page.getByRole('link', { name: 'Webhooks' })).toBeVisible();
  });

  test('should navigate to webhooks page', async ({ authenticatedPage: page }) => {
    await page.goto('/config');
    await page.getByRole('link', { name: 'Webhooks' }).click();
    await expect(page.getByRole('heading', { name: 'Webhooks' })).toBeVisible();
  });

  test('should show Add webhook button', async ({ authenticatedPage: page }) => {
    await page.goto('/config/webhooks');
    await expect(page.getByRole('button', { name: 'Add webhook' })).toBeVisible();
  });

  test('should show add webhook form when clicking Add webhook', async ({ authenticatedPage: page }) => {
    await page.goto('/config/webhooks');
    await page.getByRole('button', { name: 'Add webhook' }).click();
    await expect(page.getByLabel('Payload URL')).toBeVisible();
    await expect(page.getByLabel('Secret')).toBeVisible();
  });
});

test.describe('Cron API', () => {
  test('should return cron status', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, '/api/cron/status');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('should run cron manually', async ({ authenticatedPage: page }) => {
    const res = await apiPost(page, '/api/cron/run', {});
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveProperty('ran');
    expect(body.data).toHaveProperty('errors');
    expect(body.data).toHaveProperty('timestamp');
  });
});
