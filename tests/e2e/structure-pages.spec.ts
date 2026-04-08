import { test, expect } from './fixtures';

test.describe('Structure Pages', () => {
  test('should load Content Types page with type list', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types');
    await expect(page.getByRole('heading', { name: 'Content Types' })).toBeVisible({ timeout: 10000 });
    // Should show a table with content types
    await expect(page.getByRole('table')).toBeVisible({ timeout: 5000 });
    // Should have table headers
    await expect(page.getByRole('columnheader', { name: 'Label' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('columnheader', { name: 'Entity Type' })).toBeVisible({ timeout: 5000 });
    // Article content type should exist from seeding
    await expect(page.getByText('Article').first()).toBeVisible({ timeout: 5000 });
    // Should have Add content type link
    await expect(page.getByRole('link', { name: /Add content type/ })).toBeVisible({ timeout: 5000 });
  });

  test('should load Taxonomy page with vocabulary list', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/taxonomy');
    await expect(page.getByRole('heading', { name: 'Taxonomy' })).toBeVisible({ timeout: 10000 });
    // Should show a table
    await expect(page.getByRole('table')).toBeVisible({ timeout: 5000 });
    // Should have table headers
    await expect(page.getByRole('columnheader', { name: 'Name', exact: true })).toBeVisible({ timeout: 5000 });
    // Should have Add vocabulary link
    await expect(page.getByRole('link', { name: /Add vocabulary/ })).toBeVisible({ timeout: 5000 });
  });

  test('should load Menus page', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/menus');
    await expect(page.getByRole('heading', { name: 'Menus' })).toBeVisible({ timeout: 10000 });
    // Should show description text
    await expect(page.getByText('Manage navigation menus and their links.')).toBeVisible({ timeout: 5000 });
    // Should show a table
    await expect(page.getByRole('table')).toBeVisible({ timeout: 5000 });
    // Should have table headers
    await expect(page.getByRole('columnheader', { name: 'Title' })).toBeVisible({ timeout: 5000 });
  });

  test('should load Views page', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/views');
    await expect(page.getByRole('heading', { name: 'Views' })).toBeVisible({ timeout: 10000 });
    // Should show description text
    await expect(page.getByText('Configurable entity list builders')).toBeVisible({ timeout: 5000 });
    // Should show a table
    await expect(page.getByRole('table')).toBeVisible({ timeout: 5000 });
    // Should have table headers
    await expect(page.getByRole('columnheader', { name: 'View name' })).toBeVisible({ timeout: 5000 });
  });

  test('should load Block layout page', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/blocks');
    await expect(page.getByRole('heading', { name: 'Block layout' })).toBeVisible({ timeout: 10000 });
    // Should show description text
    await expect(page.getByText('Manage block placements across page regions.')).toBeVisible({ timeout: 5000 });
    // Should show region headings
    await expect(page.getByRole('heading', { name: 'Header' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Content', exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Footer' })).toBeVisible({ timeout: 5000 });
  });

  test('should load Paragraph Types page', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/paragraphs');
    await expect(page.getByRole('heading', { name: 'Paragraph Types' })).toBeVisible({ timeout: 10000 });
    // Should show description text
    await expect(page.getByText('Manage paragraph types and their field configurations.')).toBeVisible({ timeout: 5000 });
    // Should show a table
    await expect(page.getByRole('table')).toBeVisible({ timeout: 5000 });
    // Should have table headers
    await expect(page.getByRole('columnheader', { name: 'Label' })).toBeVisible({ timeout: 5000 });
  });

  test('should load Field Groups page', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/field-groups');
    await expect(page.getByRole('heading', { name: 'Field Groups' })).toBeVisible({ timeout: 10000 });
    // Should show a table
    await expect(page.getByRole('table')).toBeVisible({ timeout: 5000 });
    // Should have table headers
    await expect(page.getByRole('columnheader', { name: 'Label' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('columnheader', { name: 'Format' })).toBeVisible({ timeout: 5000 });
  });
});
