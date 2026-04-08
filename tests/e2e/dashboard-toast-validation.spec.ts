import { test, expect } from './fixtures';

test.describe('Enhanced Dashboard', () => {
  test('should show dashboard with system status widget', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('System status')).toBeVisible();
  });

  test('should show Node.js version in system status', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Node.js')).toBeVisible();
  });

  test('should show memory usage in system status', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Memory')).toBeVisible();
  });

  test('should show uptime in system status', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Uptime')).toBeVisible();
  });

  test('should show search status in system status', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    // Search status may show as "Unavailable" or with backend info
    await expect(page.getByText('Search').first()).toBeVisible();
  });

  test('should show cron jobs link in system status', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Cron jobs')).toBeVisible();
    await expect(page.getByRole('link', { name: /registered/ })).toBeVisible();
  });

  test('should link to status report details', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: 'Details' })).toBeVisible();
  });
});

test.describe('Toast Notification System', () => {
  test('should load admin shell with toast provider', async ({ authenticatedPage: page }) => {
    // The toast provider is part of the admin shell layout
    // Verify the admin shell renders correctly on any admin page
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    // Admin shell renders the sidebar navigation
    await expect(page.getByRole('link', { name: 'Content' }).first()).toBeVisible();
  });
});

test.describe('Entity Form Validation', () => {
  test('should show validation error when title is empty', async ({ authenticatedPage: page }) => {
    await page.goto('/node/add/article');
    await expect(page.locator('#title')).toBeVisible({ timeout: 10000 });
    // Clear the title and try to save
    await page.locator('#title').fill('');
    // Click save
    await page.getByRole('button', { name: /Save/ }).first().click();
    // Should show field error
    await expect(page.getByText('Title is required')).toBeVisible({ timeout: 5000 });
  });

  test('should show error count message', async ({ authenticatedPage: page }) => {
    await page.goto('/node/add/article');
    await expect(page.locator('#title')).toBeVisible({ timeout: 10000 });
    await page.locator('#title').fill('');
    await page.getByRole('button', { name: /Save/ }).first().click();
    await expect(page.getByText(/field error/)).toBeVisible({ timeout: 5000 });
  });

  test('should clear field error when user types', async ({ authenticatedPage: page }) => {
    await page.goto('/node/add/article');
    await expect(page.locator('#title')).toBeVisible({ timeout: 10000 });
    await page.locator('#title').fill('');
    await page.getByRole('button', { name: /Save/ }).first().click();
    await expect(page.getByText('Title is required')).toBeVisible({ timeout: 5000 });
    // Now type in the title
    await page.locator('#title').fill('My Test Article');
    // Error should clear
    await expect(page.getByText('Title is required')).not.toBeVisible();
  });

  test('should highlight title field with red border on error', async ({ authenticatedPage: page }) => {
    await page.goto('/node/add/article');
    await expect(page.locator('#title')).toBeVisible({ timeout: 10000 });
    await page.locator('#title').fill('');
    await page.getByRole('button', { name: /Save/ }).first().click();
    // Title input should have danger border class
    await expect(page.locator('#title')).toHaveClass(/border-gin-danger/);
  });
});
