import { test, expect, apiPost } from './fixtures';

test.describe('Views Editor', () => {
  test('should load views list page', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/views');
    await expect(page.getByRole('heading', { name: 'Views' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('table')).toBeVisible({ timeout: 5000 });
  });

  test('should create a view and navigate to its edit page', async ({ authenticatedPage: page }) => {
    // Create a view via API
    const resp = await apiPost(page, '/api/views', {
      id: 'test_content',
      label: 'Test Content View',
      entity_type: 'node',
      display_fields: [{ field: 'title', label: 'Title' }],
      filters: [{ field: 'status', operator: '=', value: 1 }],
      sorts: [{ field: 'created', direction: 'DESC' }],
      pager: 10,
      status: true,
    });

    // Navigate to the view edit page
    await page.goto('/structure/views/test_content');
    await expect(page.getByRole('heading', { name: 'View settings' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Display fields' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Filters' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Sort criteria' })).toBeVisible({ timeout: 5000 });
    // Should show Add buttons
    await expect(page.getByText('Add field')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Add filter')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Add sort')).toBeVisible({ timeout: 5000 });
    // Should show sidebar with available fields
    await expect(page.getByRole('heading', { name: 'Available fields' })).toBeVisible({ timeout: 5000 });
    // Should have Save and Preview buttons
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible({ timeout: 5000 });
    // Display fields table should have a row with "title" selected
    const displayFieldsTable = page.locator('table').first();
    await expect(displayFieldsTable.locator('select').first()).toHaveValue('title', { timeout: 5000 });
  });

  test('should add a filter and sort via buttons', async ({ authenticatedPage: page }) => {
    // Create a view with no filters/sorts
    await apiPost(page, '/api/views', {
      id: 'test_empty',
      label: 'Empty View',
      entity_type: 'node',
      display_fields: [],
      filters: [],
      sorts: [],
      pager: 25,
      status: true,
    });

    await page.goto('/structure/views/test_empty');
    await expect(page.getByRole('heading', { name: 'Filters' })).toBeVisible({ timeout: 10000 });

    // Add a filter
    await page.getByText('Add filter').click();
    // Should show operator dropdown
    await expect(page.locator('select').last()).toBeVisible({ timeout: 5000 });

    // Add a sort
    await page.getByText('Add sort').click();
    // Sort row should appear — check for a direction select with DESC value
    await expect(page.locator('select').last()).toHaveValue('DESC', { timeout: 5000 });
  });
});
