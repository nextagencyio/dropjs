import { test, expect, apiPost } from './fixtures';

test.describe('Public Search Page', () => {
  test('should render the search page', async ({ page }) => {
    await page.goto('/search');
    await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('Search content...')).toBeVisible();
  });

  test('should find content by search query', async ({ authenticatedPage: page }) => {
    // Create a searchable article
    await apiPost(page, '/api/node/article', {
      title: 'Unique Searchable Platypus Article',
      status: 1,
      promote: 1,
      field_body: { value: '<p>This article is about platypuses.</p>', format: 'full_html' },
    });

    await page.goto('/search?q=Platypus');

    // Should show search results
    await expect(page.getByText('Unique Searchable Platypus Article')).toBeVisible({ timeout: 10000 });
  });

  test('should show no results for nonsense query', async ({ page }) => {
    await page.goto('/search?q=xyznonexistent99');

    await expect(page.getByText('No results')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to search from nav', async ({ page }) => {
    await page.goto('/front');

    // Wait for nav to render with menu items
    await expect(page.locator('nav').getByRole('link', { name: 'Search' })).toBeVisible({ timeout: 10000 });

    // Click Search link in navigation
    await page.locator('nav').getByRole('link', { name: 'Search' }).click();

    await expect(page).toHaveURL(/\/search/);
    await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible();
  });

  test('should navigate from search result to node page', async ({ authenticatedPage: page }) => {
    const resp = await apiPost(page, '/api/node/article', {
      title: 'Clickable Search Result Narwhal',
      status: 1,
      field_body: { value: '<p>Narwhal content.</p>', format: 'full_html' },
    });
    const body = await resp.json();
    const nid = body.data?.nid;

    await page.goto('/search?q=Narwhal');
    await expect(page.getByText('Clickable Search Result Narwhal')).toBeVisible({ timeout: 10000 });

    await page.getByRole('link', { name: 'Clickable Search Result Narwhal' }).click();
    await expect(page).toHaveURL(`/node/${nid}`);
  });
});

test.describe('Public Comments', () => {
  test('should show comments section on node view', async ({ authenticatedPage: page }) => {
    const resp = await apiPost(page, '/api/node/article', {
      title: 'Test Node For Comment Display',
      status: 1,
    });
    const body = await resp.json();
    const nid = body.data?.nid;

    await page.goto(`/node/${nid}`);
    await expect(page.getByRole('heading', { name: 'Comments', exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('should show comment form for authenticated users', async ({ authenticatedPage: page }) => {
    const resp = await apiPost(page, '/api/node/article', {
      title: 'Comment Form Test Node',
      status: 1,
    });
    const body = await resp.json();
    const nid = body.data?.nid;

    await page.goto(`/node/${nid}`);
    await expect(page.getByPlaceholder('Write a comment...')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Post comment' })).toBeVisible();
  });

  test('should prompt login for anonymous comment attempt', async ({ page }) => {
    // First create content with authenticated request, then view as anonymous
    await page.goto('/node/1');

    // Anonymous users should see login prompt instead of form
    await expect(page.getByText('Log in').first()).toBeVisible({ timeout: 10000 });
  });
});
