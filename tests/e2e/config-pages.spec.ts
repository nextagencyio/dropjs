import { test, expect } from './fixtures';

test.describe('Configuration Pages', () => {
  test('should load URL Aliases page', async ({ authenticatedPage: page }) => {
    await page.goto('/config/url-aliases');
    await expect(page.getByRole('heading', { name: 'URL aliases' })).toBeVisible({ timeout: 10000 });
  });

  test('should load URL Redirects page', async ({ authenticatedPage: page }) => {
    await page.goto('/config/redirects');
    await expect(page.getByRole('heading', { name: 'URL redirects' })).toBeVisible({ timeout: 10000 });
  });

  test('should load Languages page', async ({ authenticatedPage: page }) => {
    await page.goto('/config/languages');
    await expect(page.getByRole('heading', { name: 'Languages' })).toBeVisible({ timeout: 10000 });
  });

  test('should load Config Sync page', async ({ authenticatedPage: page }) => {
    await page.goto('/config/sync');
    await expect(page.getByRole('heading', { name: 'Configuration synchronization' })).toBeVisible({ timeout: 10000 });
  });

  test('should load Cron Management page', async ({ authenticatedPage: page }) => {
    await page.goto('/config/cron');
    await expect(page.getByRole('heading', { name: 'Cron management' })).toBeVisible({ timeout: 10000 });
  });

  test('should load Search Settings page', async ({ authenticatedPage: page }) => {
    await page.goto('/config/search');
    await expect(page.getByRole('heading', { name: 'Search settings' })).toBeVisible({ timeout: 10000 });
  });
});
