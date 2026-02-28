import { test, expect, apiPost } from './fixtures';

test.describe('Public Frontend', () => {
  test('should render the front page with content', async ({ authenticatedPage: page }) => {
    // Create a known article for this test
    await apiPost(page, '/api/node/article', {
      title: 'Public Test: Front Page Article',
      status: 1,
      promote: 1,
      field_body: { value: '<p>Front page test content.</p>', format: 'full_html' },
    });

    await page.goto('/front');

    // Should have site header with site name
    await expect(page.locator('header')).toBeVisible();
    await expect(page.getByText('DropJS').first()).toBeVisible();

    // Should have footer
    await expect(page.locator('footer')).toBeVisible();

    // Should show our test article
    await expect(page.getByText('Public Test: Front Page Article')).toBeVisible({ timeout: 10000 });
  });

  test('should render a node view page', async ({ authenticatedPage: page }) => {
    // Create a specific article for viewing
    const resp = await apiPost(page, '/api/node/article', {
      title: 'Node View Test Article',
      status: 1,
      promote: 1,
      field_body: { value: '<p>Detailed body for node view test.</p>', format: 'full_html' },
    });
    const body = await resp.json();
    const nid = body.data?.nid;

    await page.goto(`/node/${nid}`);

    // Should show node title
    await expect(page.getByRole('heading', { name: 'Node View Test Article' })).toBeVisible({ timeout: 10000 });

    // Should show node body content
    await expect(page.getByText('Detailed body for node view test.')).toBeVisible();

    // Should show article type badge
    await expect(page.getByText('article', { exact: true }).first()).toBeVisible();
  });

  test('should show 404 for non-existent node', async ({ authenticatedPage: page }) => {
    await page.goto('/node/99999');

    // Should show error heading
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible({ timeout: 10000 });
  });

  test('should link from front page to individual nodes', async ({ authenticatedPage: page }) => {
    // Create an article to click on
    const resp = await apiPost(page, '/api/node/article', {
      title: 'Clickable Front Page Article',
      status: 1,
      promote: 1,
    });
    const body = await resp.json();
    const nid = body.data?.nid;

    await page.goto('/front');
    await expect(page.getByText('Clickable Front Page Article')).toBeVisible({ timeout: 10000 });

    // Click the title link
    await page.getByRole('link', { name: 'Clickable Front Page Article' }).click();

    // Should navigate to node view
    await expect(page).toHaveURL(`/node/${nid}`);
    await expect(page.getByRole('heading', { name: 'Clickable Front Page Article' })).toBeVisible();
  });

  test('should show Edit link for authenticated users on node view', async ({ authenticatedPage: page }) => {
    const resp = await apiPost(page, '/api/node/article', {
      title: 'Edit Link Test',
      status: 1,
    });
    const body = await resp.json();
    const nid = body.data?.nid;

    await page.goto(`/node/${nid}`);
    await expect(page.getByRole('heading', { name: 'Edit Link Test' })).toBeVisible({ timeout: 10000 });

    // Authenticated user should see Edit link
    await expect(page.getByRole('link', { name: 'Edit' })).toBeVisible();
  });

  test('should show Admin link for authenticated users in header', async ({ authenticatedPage: page }) => {
    await page.goto('/front');

    // Authenticated user should see Admin link in header
    await expect(page.getByRole('link', { name: 'Admin' })).toBeVisible({ timeout: 10000 });
  });

  test('should show Log in link for anonymous users', async ({ page }) => {
    // Non-authenticated page
    await page.goto('/front');

    // Anonymous user should see Log in link
    await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible({ timeout: 10000 });
  });

  test('should render page content type on public frontend', async ({ authenticatedPage: page }) => {
    const resp = await apiPost(page, '/api/node/page', {
      title: 'Public Test Page',
      status: 1,
      promote: 1,
      field_body: { value: '<p>This is a test page body.</p>', format: 'full_html' },
    });
    const body = await resp.json();
    const nid = body.data?.nid;

    await page.goto(`/node/${nid}`);
    await expect(page.getByRole('heading', { name: 'Public Test Page' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('This is a test page body.')).toBeVisible();
  });

  test('should create and view a new article on public frontend', async ({ authenticatedPage: page }) => {
    const resp = await apiPost(page, '/api/node/article', {
      title: 'Public Frontend Test Article',
      status: 1,
      promote: 1,
      field_body: { value: '<p>Test article for public frontend.</p>', format: 'full_html' },
    });
    const body = await resp.json();
    const nid = body.data?.nid;
    expect(nid).toBeTruthy();

    // View it on the public frontend
    await page.goto(`/node/${nid}`);
    await expect(page.getByRole('heading', { name: 'Public Frontend Test Article' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Test article for public frontend.')).toBeVisible();
  });
});
