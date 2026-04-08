import { test, expect } from './fixtures';

test.describe('People and Roles Pages', () => {
  test('should load People page with user list', async ({ authenticatedPage: page }) => {
    await page.goto('/people');
    await expect(page.getByRole('heading', { name: 'People' })).toBeVisible({ timeout: 10000 });
    // Should show a table with users
    await expect(page.getByRole('table')).toBeVisible({ timeout: 5000 });
    // The seeded admin user should be listed
    await expect(page.getByRole('cell', { name: 'admin' }).first()).toBeVisible({ timeout: 5000 });
  });

  test('should load Roles page with role list', async ({ authenticatedPage: page }) => {
    await page.goto('/people/roles');
    await expect(page.getByRole('heading', { name: 'Roles' })).toBeVisible({ timeout: 10000 });
    // Should show a table with roles
    await expect(page.getByRole('table')).toBeVisible({ timeout: 5000 });
    // The administrator role should be listed
    await expect(page.getByText('administrator').first()).toBeVisible({ timeout: 5000 });
  });

  test('should have Add role button on Roles page', async ({ authenticatedPage: page }) => {
    await page.goto('/people/roles');
    await expect(page.getByRole('heading', { name: 'Roles' })).toBeVisible({ timeout: 10000 });
    // Should have an Add role button/link
    await expect(page.getByText('Add role').first()).toBeVisible({ timeout: 5000 });
  });
});
