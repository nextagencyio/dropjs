import { test, expect } from './fixtures';

test.describe('Content Import / Export', () => {
  test('should show import/export page', async ({ authenticatedPage: page }) => {
    await page.goto('/content/import-export');
    await expect(page.getByRole('heading', { name: 'Content import / export' })).toBeVisible({ timeout: 10000 });
  });

  test('should have export and import tabs', async ({ authenticatedPage: page }) => {
    await page.goto('/content/import-export');
    await expect(page.getByRole('heading', { name: 'Content import / export' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Export', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeVisible();
  });

  test('should show export form with content type selector', async ({ authenticatedPage: page }) => {
    await page.goto('/content/import-export');
    await expect(page.getByRole('heading', { name: 'Content import / export' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Export content' })).toBeVisible();
    await expect(page.locator('#export-type')).toBeVisible();
    await expect(page.getByRole('button', { name: /Export JSON/ })).toBeVisible();
  });

  test('should switch to import tab', async ({ authenticatedPage: page }) => {
    await page.goto('/content/import-export');
    await expect(page.getByRole('heading', { name: 'Content import / export' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Import content' })).toBeVisible();
    await expect(page.locator('#import-json')).toBeVisible();
  });

  test('should show import textarea for JSON data', async ({ authenticatedPage: page }) => {
    await page.goto('/content/import-export');
    await expect(page.getByRole('heading', { name: 'Content import / export' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Import/ }).first().click();
    const textarea = page.locator('#import-json');
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveAttribute('placeholder', /type.*article/);
  });

  test('should have import/export link in content list nav', async ({ authenticatedPage: page }) => {
    await page.goto('/content');
    await expect(page.getByRole('heading', { name: /Content/ })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: /Import \/ Export/ })).toBeVisible();
  });

  test('should disable export button when no type selected', async ({ authenticatedPage: page }) => {
    await page.goto('/content/import-export');
    await expect(page.getByRole('heading', { name: 'Content import / export' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Export JSON/ })).toBeDisabled();
  });

  test('should list content types in export dropdown', async ({ authenticatedPage: page }) => {
    await page.goto('/content/import-export');
    await expect(page.getByRole('heading', { name: 'Content import / export' })).toBeVisible({ timeout: 10000 });
    const select = page.locator('#export-type');
    const options = select.locator('option');
    // Should have at least the placeholder + 1 content type (article)
    await expect(options).toHaveCount(await options.count());
    const count = await options.count();
    expect(count).toBeGreaterThan(1);
  });

  test('should show breadcrumb navigation', async ({ authenticatedPage: page }) => {
    await page.goto('/content/import-export');
    await expect(page.getByRole('heading', { name: 'Content import / export' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('main').getByRole('link', { name: 'Content' })).toBeVisible();
  });
});
