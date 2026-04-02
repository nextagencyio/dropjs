import { test, expect } from './fixtures';

test.describe('Config Sync', () => {
  test('should show config sync page with export tab', async ({ authenticatedPage: page }) => {
    await page.goto('/config/sync');
    await expect(page.getByRole('heading', { name: 'Configuration synchronization' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Download JSON' })).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();
  });

  test('should switch to import tab', async ({ authenticatedPage: page }) => {
    await page.goto('/config/sync');
    await expect(page.getByRole('heading', { name: 'Configuration synchronization' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Import' }).click();
    await expect(page.getByText('Paste JSON or upload a file')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Compare changes' })).toBeVisible();
  });

  test('should compare identical config and show no changes', async ({ authenticatedPage: page }) => {
    await page.goto('/config/sync');
    await expect(page.getByRole('heading', { name: 'Configuration synchronization' })).toBeVisible({ timeout: 10000 });

    // Copy the current config from export textarea
    const exportTextarea = page.locator('textarea');
    const configText = await exportTextarea.inputValue();

    // Switch to import tab and paste it
    await page.getByRole('button', { name: 'Import' }).click();
    const importTextarea = page.locator('textarea');
    await importTextarea.fill(configText);
    await page.getByRole('button', { name: 'Compare changes' }).click();

    // Should show no changes
    await expect(page.getByText('identical to the current configuration')).toBeVisible({ timeout: 10000 });
  });

  test('should link from config page to config sync', async ({ authenticatedPage: page }) => {
    await page.goto('/config');
    const link = page.getByRole('link', { name: 'Configuration synchronization' });
    await expect(link).toBeVisible({ timeout: 10000 });
    await link.click();
    await expect(page).toHaveURL(/.*\/config\/sync/);
    await expect(page.getByRole('heading', { name: 'Configuration synchronization' })).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Content List Filters', () => {
  test('should show author filter dropdown', async ({ authenticatedPage: page }) => {
    await page.goto('/content');
    await expect(page.getByRole('heading', { name: 'Content' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#author-filter')).toBeVisible();
    // Should have "Any author" option
    await expect(page.locator('#author-filter option').first()).toHaveText('- Any author -');
  });

  test('should show author column in content table', async ({ authenticatedPage: page }) => {
    await page.goto('/content');
    await expect(page.getByRole('heading', { name: 'Content' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('columnheader', { name: 'Author' })).toBeVisible();
  });

  test('should filter by content type', async ({ authenticatedPage: page }) => {
    await page.goto('/content');
    await expect(page.getByRole('heading', { name: 'Content' })).toBeVisible({ timeout: 10000 });
    // Select first available content type
    const typeSelect = page.locator('#type-filter');
    const options = await typeSelect.locator('option').allTextContents();
    if (options.length > 1) {
      await typeSelect.selectOption({ index: 1 });
      // URL should update with type param
      await expect(page).toHaveURL(/type=/);
    }
  });

  test('should filter by status', async ({ authenticatedPage: page }) => {
    await page.goto('/content?status=1');
    await expect(page.getByRole('heading', { name: 'Content' })).toBeVisible({ timeout: 10000 });
    // All visible status badges should be Published (the rounded-full ones)
    const statusBadges = page.locator('tbody .rounded-full');
    const count = await statusBadges.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(statusBadges.nth(i)).toHaveText('Published');
    }
  });
});

test.describe('API Documentation Links', () => {
  test('should show API docs link on config page', async ({ authenticatedPage: page }) => {
    await page.goto('/config');
    await expect(page.getByRole('link', { name: 'API documentation' })).toBeVisible({ timeout: 10000 });
  });

  test('should show GraphQL playground link on config page', async ({ authenticatedPage: page }) => {
    await page.goto('/config');
    await expect(page.getByRole('link', { name: 'GraphQL playground' })).toBeVisible({ timeout: 10000 });
  });

  test('should show config sync link in toolbar dropdown', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    // Hover over Configuration in toolbar
    const configButton = page.locator('nav').getByText('Configuration');
    await configButton.hover();
    // Should see Config sync link in dropdown
    await expect(page.getByRole('link', { name: 'Config sync' })).toBeVisible({ timeout: 5000 });
  });
});
