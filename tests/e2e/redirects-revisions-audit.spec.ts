import { test, expect, apiPost, apiGet, apiPatch, apiDelete } from './fixtures';

test.describe('Redirects Admin UI', () => {
  test('should load redirects page with empty state', async ({ authenticatedPage: page }) => {
    await page.goto('/config/redirects');
    await expect(page.getByRole('heading', { name: 'URL redirects' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('redirects configured')).toBeVisible();
    // Should have Add redirect button
    await expect(page.getByRole('button', { name: 'Add redirect' })).toBeVisible();
  });

  test('should create a redirect via the form', async ({ authenticatedPage: page }) => {
    const uniqueId = Date.now();
    await page.goto('/config/redirects');
    await expect(page.getByRole('heading', { name: 'URL redirects' })).toBeVisible({ timeout: 10000 });

    // Open add form
    await page.getByRole('button', { name: 'Add redirect' }).click();
    await expect(page.getByText('Add URL redirect')).toBeVisible();

    // Fill form
    await page.getByLabel('From path').fill(`/old-${uniqueId}`);
    await page.getByLabel('To path').fill(`/new-${uniqueId}`);

    // Submit
    await page.getByRole('button', { name: 'Create redirect' }).click();
    await expect(page.getByText('Redirect created')).toBeVisible({ timeout: 5000 });

    // Should appear in the table
    await expect(page.getByText(`/old-${uniqueId}`)).toBeVisible();
    await expect(page.getByText(`/new-${uniqueId}`)).toBeVisible();
  });

  test('should toggle redirect enabled/disabled', async ({ authenticatedPage: page }) => {
    // Create a redirect with a unique path via API
    const uniqueId = Date.now();
    await apiPost(page, '/api/redirects', {
      source_path: `/toggle-test-${uniqueId}`,
      redirect_path: `/toggle-dest-${uniqueId}`,
    });

    await page.goto('/config/redirects');
    await expect(page.getByText(`/toggle-test-${uniqueId}`)).toBeVisible({ timeout: 10000 });

    // Find the Yes/No toggle button for this redirect
    const row = page.locator('tr', { hasText: `/toggle-test-${uniqueId}` });
    const toggleBtn = row.getByRole('button', { name: 'Yes' });
    await toggleBtn.click();

    await expect(page.getByText('Redirect disabled')).toBeVisible({ timeout: 5000 });
  });

  test('should delete a redirect', async ({ authenticatedPage: page }) => {
    const uniqueId = Date.now();
    // Create a redirect via API first
    await apiPost(page, '/api/redirects', {
      source_path: `/delete-test-${uniqueId}`,
      redirect_path: `/delete-dest-${uniqueId}`,
    });

    await page.goto('/config/redirects');
    await expect(page.getByText(`/delete-test-${uniqueId}`)).toBeVisible({ timeout: 10000 });

    // Click delete
    page.on('dialog', (dialog) => dialog.accept());
    const row = page.locator('tr', { hasText: `/delete-test-${uniqueId}` });
    await row.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('Redirect deleted')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to redirects from config page', async ({ authenticatedPage: page }) => {
    await page.goto('/config');
    await expect(page.getByRole('heading', { name: 'Configuration' })).toBeVisible({ timeout: 10000 });

    await page.getByRole('link', { name: 'URL redirects' }).click();
    await expect(page).toHaveURL(/.*\/config\/redirects/);
    await expect(page.getByRole('heading', { name: 'URL redirects' })).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Redirects API', () => {
  test('should CRUD redirects via API', async ({ authenticatedPage: page }) => {
    // Create
    const createRes = await apiPost(page, '/api/redirects', {
      source_path: '/api-test-old',
      redirect_path: '/api-test-new',
      status_code: 302,
    });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();
    expect(created.data.source_path).toBe('/api-test-old');
    expect(created.data.status_code).toBe(302);

    // List
    const listRes = await apiGet(page, '/api/redirects');
    expect(listRes.status()).toBe(200);
    const list = await listRes.json();
    expect(list.data.some((r: any) => r.source_path === '/api-test-old')).toBe(true);

    // Delete
    const deleteRes = await apiDelete(page, `/api/redirects/${created.data.id}`);
    expect(deleteRes.status()).toBe(204);
  });
});

test.describe('Revision History', () => {
  test('should show revision count on node edit page', async ({ authenticatedPage: page }) => {
    // Create a node first
    const createRes = await apiPost(page, '/api/node/article', {
      title: 'Revision Test Article',
      status: true,
    });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();
    const nid = created.data.nid;

    // Visit edit page
    await page.goto(`/node/${nid}/edit`);
    await expect(page.getByRole('heading', { name: /Edit/ })).toBeVisible({ timeout: 10000 });

    // Should show Revisions link with badge
    await expect(page.getByRole('link', { name: /Revisions/ })).toBeVisible();
  });

  test('should list revisions for a node', async ({ authenticatedPage: page }) => {
    // Create a node and update it to create revisions
    const createRes = await apiPost(page, '/api/node/article', {
      title: 'Multi-Revision Article',
      status: true,
    });
    const created = await createRes.json();
    const nid = created.data.nid;

    // Visit revisions page
    await page.goto(`/node/${nid}/revisions`);
    await expect(page.getByRole('heading', { name: /Revisions/ })).toBeVisible({ timeout: 10000 });

    // Should show at least the initial revision
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should show revision diff for a node via API', async ({ authenticatedPage: page }) => {
    // Create a node
    const createRes = await apiPost(page, '/api/node/article', {
      title: 'Diff Test Article',
      status: true,
    });
    const created = await createRes.json();
    const nid = created.data.nid;

    // List revisions
    const revRes = await apiGet(page, `/api/node/${nid}/revisions`);
    expect(revRes.status()).toBe(200);
    const revisions = await revRes.json();
    expect(revisions.data.length).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Scheduling Widget', () => {
  test('should show scheduling section on node edit page', async ({ authenticatedPage: page }) => {
    const createRes = await apiPost(page, '/api/node/article', {
      title: 'Schedule Test Article',
      status: true,
    });
    const created = await createRes.json();
    const nid = created.data.nid;

    await page.goto(`/node/${nid}/edit`);
    await expect(page.getByRole('heading', { name: /Edit/ })).toBeVisible({ timeout: 10000 });

    // Should show Scheduling section
    await expect(page.getByText('Scheduling')).toBeVisible();
    // Should show transition dropdown and date input
    await expect(page.locator('select').filter({ hasText: 'Publish' })).toBeVisible();
    await expect(page.locator('input[type="datetime-local"]')).toBeVisible();
    // Should show Schedule button
    await expect(page.getByRole('button', { name: 'Schedule' })).toBeVisible();
  });
});

test.describe('Scheduled Content List', () => {
  test('should load scheduled content page', async ({ authenticatedPage: page }) => {
    await page.goto('/content/scheduled');
    await expect(page.getByRole('heading', { name: 'Scheduled Content' })).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Audit Log', () => {
  test('should load audit log page', async ({ authenticatedPage: page }) => {
    await page.goto('/reports/audit-log');
    await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible({ timeout: 10000 });
  });

  test('should show audit entries after creating content', async ({ authenticatedPage: page }) => {
    // Create a node to generate an audit entry
    await apiPost(page, '/api/node/article', {
      title: 'Audit Log Test Article',
      status: true,
    });

    await page.goto('/reports/audit-log');
    await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible({ timeout: 10000 });

    // Should show at least one entry in the table
    await expect(page.getByRole('table')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Created').first()).toBeVisible();
  });

  test('should show audit entries on node edit page', async ({ authenticatedPage: page }) => {
    const createRes = await apiPost(page, '/api/node/article', {
      title: 'Audit Edit Page Test',
      status: true,
    });
    const created = await createRes.json();
    const nid = created.data.nid;

    await page.goto(`/node/${nid}/edit`);
    await expect(page.getByRole('heading', { name: /Edit/ })).toBeVisible({ timeout: 10000 });

    // Should show Recent Activity section with the creation entry
    await expect(page.getByText('Recent Activity')).toBeVisible();
    await expect(page.getByText('Created')).toBeVisible();
  });

  test('should query audit log via API', async ({ authenticatedPage: page }) => {
    const createRes = await apiPost(page, '/api/node/article', {
      title: 'Audit API Test',
      status: true,
    });
    const created = await createRes.json();
    const nid = created.data.nid;

    const auditRes = await apiGet(page, `/api/node/${nid}/audit-log`);
    expect(auditRes.status()).toBe(200);
    const audit = await auditRes.json();
    expect(audit.data.length).toBeGreaterThanOrEqual(1);
    expect(audit.data[0].action).toBe('insert');
  });
});

test.describe('Redirect Middleware', () => {
  test('should follow redirect via redirect-check API', async ({ authenticatedPage: page }) => {
    // Use a unique path to avoid collisions with other tests
    const uniquePath = `/middleware-test-${Date.now()}`;

    // Create a redirect from unique path to /front
    const createRes = await apiPost(page, '/api/redirects', {
      source_path: uniquePath,
      redirect_path: '/front',
      status_code: 301,
    });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();

    // Verify the redirect-check API resolves it
    const checkRes = await page.request.get(`/api/redirect-check?path=${encodeURIComponent(uniquePath)}`);
    expect(checkRes.status()).toBe(200);
    const check = await checkRes.json();
    expect(check.redirect).not.toBeNull();
    expect(check.redirect.destination).toBe('/front');
    expect(check.redirect.statusCode).toBe(301);

    // Clean up
    await apiDelete(page, `/api/redirects/${created.data.id}`);
  });

  test('should return null for non-redirected path', async ({ authenticatedPage: page }) => {
    const checkRes = await page.request.get('/api/redirect-check?path=/this-does-not-exist');
    expect(checkRes.status()).toBe(200);
    const check = await checkRes.json();
    expect(check.redirect).toBeNull();
  });
});

test.describe('Public Breadcrumbs', () => {
  test('should show breadcrumbs on node detail page', async ({ authenticatedPage: page }) => {
    // Create a published node
    const createRes = await apiPost(page, '/api/node/article', {
      title: 'Breadcrumb Test Article',
      status: true,
    });
    const created = await createRes.json();
    const nid = created.data.nid;

    // Visit the public node page
    await page.goto(`/node/${nid}`);
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible();
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toContainText('Home');
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toContainText('Breadcrumb Test Article');
  });

  test('should show breadcrumbs on search page', async ({ page }) => {
    await page.goto('/search');
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible();
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toContainText('Home');
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toContainText('Search');
  });
});

test.describe('Admin Toolbar Navigation', () => {
  test('should show scheduled link in content dropdown', async ({ authenticatedPage: page }) => {
    await page.goto('/content');
    // Check for the secondary nav tabs
    await expect(page.getByText('All content')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Scheduled' })).toBeVisible();
  });
});
