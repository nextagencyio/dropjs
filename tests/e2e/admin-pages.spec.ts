import { test, expect } from './fixtures';

test.describe('Admin Pages', () => {
  test('should load Extend page with module list', async ({ authenticatedPage: page }) => {
    await page.goto('/extend');
    await expect(page.getByRole('heading', { name: 'Extend' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Enable and disable modules to extend site functionality.')).toBeVisible();
    // Should show module list as a table
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 });
    // Should have table headers
    await expect(page.getByRole('columnheader', { name: 'Enabled' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
    // Should have a Save configuration button
    await expect(page.getByRole('button', { name: 'Save configuration' })).toBeVisible();
  });

  test('should load Configuration page with categories', async ({ authenticatedPage: page }) => {
    await page.goto('/config');
    await expect(page.getByRole('heading', { name: 'Configuration' })).toBeVisible();
    await expect(page.getByText('Administer your site configuration.')).toBeVisible();
    // Should show configuration categories
    await expect(page.getByRole('heading', { name: 'System' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Content authoring' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Media' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'People' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Development' })).toBeVisible();
    // Should show Site information link
    await expect(page.getByText('Site information')).toBeVisible();
  });

  test('should navigate from Configuration to Site information', async ({ authenticatedPage: page }) => {
    await page.goto('/config');
    await expect(page.getByRole('heading', { name: 'Configuration' })).toBeVisible();

    // Click on Site information link
    await page.getByRole('link', { name: 'Site information' }).click();
    await expect(page).toHaveURL(/.*\/config\/site/);
    await expect(page.getByRole('heading', { name: 'Site information' })).toBeVisible({ timeout: 10000 });
  });

  test('should load Site information form', async ({ authenticatedPage: page }) => {
    await page.goto('/config/site');
    await expect(page.getByRole('heading', { name: 'Site information' })).toBeVisible({ timeout: 10000 });
    // Should show form fields
    await expect(page.getByLabel('Site name')).toBeVisible();
    await expect(page.getByLabel('Slogan')).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Front page')).toBeVisible();
    // Should have breadcrumb
    await expect(page.getByRole('main').getByRole('link', { name: 'Configuration' })).toBeVisible();
  });

  test('should have a working site configuration form', async ({ authenticatedPage: page }) => {
    await page.goto('/config/site');
    await expect(page.getByRole('heading', { name: 'Site information' })).toBeVisible({ timeout: 10000 });

    // Should be able to fill in form fields
    await page.getByLabel('Site name').fill('Test Site Name');
    await page.getByLabel('Slogan').fill('A test slogan');

    // Save button should be available
    await expect(page.getByRole('button', { name: 'Save configuration' })).toBeVisible();

    // Cancel link should navigate back to config
    await expect(page.getByRole('link', { name: 'Cancel' })).toBeVisible();
  });

  test('should load Reports page with report list', async ({ authenticatedPage: page }) => {
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Reports', exact: true }).first()).toBeVisible();
    await expect(page.getByText('View site reports and status information.')).toBeVisible();
    // Should show report links
    await expect(page.getByRole('link', { name: /Status report/ })).toBeVisible();
    // Should show other report items
    await expect(page.getByRole('heading', { name: 'Available updates' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent log messages' })).toBeVisible();
  });

  test('should load Status report page with system info', async ({ authenticatedPage: page }) => {
    await page.goto('/reports/status');
    await expect(page.getByRole('heading', { name: 'Status report' })).toBeVisible({ timeout: 10000 });
    // Should show system information in a table
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('drop.js version')).toBeVisible();
    await expect(page.getByText('Node.js version')).toBeVisible();
    await expect(page.getByText('Database')).toBeVisible();
    await expect(page.getByText('Entity types')).toBeVisible();
    await expect(page.getByText('Uptime')).toBeVisible();
    await expect(page.getByText('Memory usage')).toBeVisible();
    // Should have breadcrumb back to Reports
    await expect(page.getByRole('main').getByRole('link', { name: 'Reports' })).toBeVisible();
  });

  test('should load Help page with sections', async ({ authenticatedPage: page }) => {
    await page.goto('/help');
    await expect(page.getByRole('heading', { name: 'Help', exact: true }).first()).toBeVisible();
    await expect(page.getByText('Get help with using and extending drop.js.')).toBeVisible();
    // Should show Getting started section
    await expect(page.getByRole('heading', { name: 'Getting started' })).toBeVisible();
    // Should show Administration pages section
    await expect(page.getByRole('heading', { name: 'Administration pages' })).toBeVisible();
    // Should show Module help section
    await expect(page.getByRole('heading', { name: 'Module help' })).toBeVisible();
    // Should show API documentation section
    await expect(page.getByRole('heading', { name: 'API documentation' })).toBeVisible();
  });

  test('should navigate to Reports via toolbar', async ({ authenticatedPage: page }) => {
    await page.locator('nav').first().getByRole('link', { name: 'Reports' }).click();
    await expect(page).toHaveURL(/.*\/reports/);
    await expect(page.getByRole('heading', { name: 'Reports', exact: true }).first()).toBeVisible();
  });

  test('should navigate from Reports to Status report', async ({ authenticatedPage: page }) => {
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Reports', exact: true }).first()).toBeVisible();

    // Click on Status report link
    await page.getByRole('link', { name: /Status report/ }).click();
    await expect(page).toHaveURL(/.*\/reports\/status/);
    await expect(page.getByRole('heading', { name: 'Status report' })).toBeVisible({ timeout: 10000 });
  });
});
