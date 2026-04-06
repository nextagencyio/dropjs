import { test, expect } from './fixtures';

test.describe('Content Translations', () => {
  test('should show translations page for a node', async ({ authenticatedPage: page }) => {
    await page.goto('/node/1/translations');
    await expect(page.getByRole('heading', { name: 'Translations' })).toBeVisible({ timeout: 10000 });
    // Should show the language table
    await expect(page.getByRole('columnheader', { name: 'Language' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Operations' })).toBeVisible();
  });

  test('should show English as source language', async ({ authenticatedPage: page }) => {
    await page.goto('/node/1/translations');
    await expect(page.getByRole('heading', { name: 'Translations' })).toBeVisible({ timeout: 10000 });
    // English should be listed
    await expect(page.getByText('English')).toBeVisible();
  });

  test('should show enable languages message when only one language', async ({ authenticatedPage: page }) => {
    await page.goto('/node/1/translations');
    await expect(page.getByRole('heading', { name: 'Translations' })).toBeVisible({ timeout: 10000 });
    // If only English is enabled, should show the message
    await expect(page.getByText(/Enable more languages/)).toBeVisible();
  });

  test('should have translations link on node edit page', async ({ authenticatedPage: page }) => {
    await page.goto('/node/1/edit');
    await expect(page.getByRole('link', { name: 'Translations' })).toBeVisible({ timeout: 10000 });
  });

  test('should navigate between edit and translations tabs', async ({ authenticatedPage: page }) => {
    await page.goto('/node/1/translations');
    await expect(page.getByRole('heading', { name: 'Translations' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('main').getByRole('link', { name: 'Edit' }).click();
    await expect(page).toHaveURL(/.*\/node\/1\/edit/);
  });

  test('should show breadcrumb navigation', async ({ authenticatedPage: page }) => {
    await page.goto('/node/1/translations');
    await expect(page.getByRole('heading', { name: 'Translations' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('main').getByRole('link', { name: 'Content' })).toBeVisible();
  });
});

test.describe('Search Configuration', () => {
  test('should show search settings page', async ({ authenticatedPage: page }) => {
    await page.goto('/config/search');
    await expect(page.getByRole('heading', { name: 'Search settings' })).toBeVisible({ timeout: 10000 });
  });

  test('should show search backend status', async ({ authenticatedPage: page }) => {
    await page.goto('/config/search');
    await expect(page.getByRole('heading', { name: 'Search settings' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Backend')).toBeVisible();
    await expect(page.getByText('Status', { exact: true })).toBeVisible();
    await expect(page.getByText('Indexed')).toBeVisible();
  });

  test('should show rebuild button', async ({ authenticatedPage: page }) => {
    await page.goto('/config/search');
    await expect(page.getByRole('heading', { name: 'Search settings' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Rebuild search index/ })).toBeVisible();
  });

  test('should show search link on config page', async ({ authenticatedPage: page }) => {
    await page.goto('/config');
    await expect(page.getByRole('heading', { name: 'Configuration' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: 'Search settings' })).toBeVisible();
  });

  test('should show index operations section', async ({ authenticatedPage: page }) => {
    await page.goto('/config/search');
    await expect(page.getByRole('heading', { name: 'Search settings' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Index operations')).toBeVisible();
  });
});

test.describe('Cron Management', () => {
  test('should show cron management page', async ({ authenticatedPage: page }) => {
    await page.goto('/config/cron');
    await expect(page.getByRole('heading', { name: 'Cron management' })).toBeVisible({ timeout: 10000 });
  });

  test('should show cron jobs table', async ({ authenticatedPage: page }) => {
    await page.goto('/config/cron');
    await expect(page.getByRole('heading', { name: 'Cron management' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('columnheader', { name: 'Job name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Interval' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Last run' })).toBeVisible();
  });

  test('should show run cron button', async ({ authenticatedPage: page }) => {
    await page.goto('/config/cron');
    await expect(page.getByRole('heading', { name: 'Cron management' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Run cron now/ })).toBeVisible();
  });

  test('should show session_cleanup job', async ({ authenticatedPage: page }) => {
    await page.goto('/config/cron');
    await expect(page.getByRole('heading', { name: 'Cron management' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('session_cleanup')).toBeVisible();
  });

  test('should show cron link on config page', async ({ authenticatedPage: page }) => {
    await page.goto('/config');
    await expect(page.getByRole('heading', { name: 'Configuration' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: 'Cron management' })).toBeVisible();
  });

  test('should run cron when button is clicked', async ({ authenticatedPage: page }) => {
    await page.goto('/config/cron');
    await expect(page.getByRole('heading', { name: 'Cron management' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Run cron now/ }).click();
    // Should show success or completion message
    await expect(page.getByText(/Cron completed/)).toBeVisible({ timeout: 15000 });
  });
});
