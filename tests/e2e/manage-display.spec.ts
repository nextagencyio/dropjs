import { test, expect } from './fixtures';

test.describe('Manage Display', () => {
  test('should load manage display page with formatter dropdowns', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/article/display');
    await expect(page.getByRole('heading', { name: 'Manage display' })).toBeVisible({ timeout: 10000 });
    // Should show the field table
    await expect(page.getByRole('table')).toBeVisible({ timeout: 5000 });
    // Should have Formatter column header
    await expect(page.getByRole('columnheader', { name: 'Formatter' })).toBeVisible({ timeout: 5000 });
    // Formatter should be a select element, not plain text
    const formatterSelects = page.locator('table select');
    const count = await formatterSelects.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should show view mode tabs', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/article/display');
    await expect(page.getByRole('heading', { name: 'Manage display' })).toBeVisible({ timeout: 10000 });
    // Should show default view mode tab
    await expect(page.getByRole('link', { name: 'Default' })).toBeVisible({ timeout: 5000 });
  });

  test('should have links to manage form display and fields', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/article/display');
    await expect(page.getByRole('heading', { name: 'Manage display' })).toBeVisible({ timeout: 10000 });
    // Should have links to related pages
    await expect(page.getByRole('link', { name: 'Manage form display' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('link', { name: 'Manage fields' })).toBeVisible({ timeout: 5000 });
  });

  test('should save formatter change', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/article/display');
    await expect(page.getByRole('heading', { name: 'Manage display' })).toBeVisible({ timeout: 10000 });
    // Click Save button
    await page.getByRole('button', { name: 'Save' }).click();
    // Should show success message
    await expect(page.getByText('Display settings saved')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Manage Form Display', () => {
  test('should load manage form display page', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/article/form-display');
    await expect(page.getByRole('heading', { name: 'Manage form display' })).toBeVisible({ timeout: 10000 });
    // Should show field table
    await expect(page.getByRole('table')).toBeVisible({ timeout: 5000 });
    // Should have Widget column
    await expect(page.getByRole('columnheader', { name: 'Widget' })).toBeVisible({ timeout: 5000 });
  });

  test('should show widget selection dropdowns', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/article/form-display');
    await expect(page.getByRole('heading', { name: 'Manage form display' })).toBeVisible({ timeout: 10000 });
    // Widget should be a select element
    const widgetSelects = page.locator('table select');
    const count = await widgetSelects.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have links to manage display and manage fields', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/article/form-display');
    await expect(page.getByRole('heading', { name: 'Manage form display' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: 'Manage display' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('link', { name: 'Manage fields' })).toBeVisible({ timeout: 5000 });
  });

  test('should have field ordering controls', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/article/form-display');
    await expect(page.getByRole('heading', { name: 'Manage form display' })).toBeVisible({ timeout: 10000 });
    // Should show Order column
    await expect(page.getByRole('columnheader', { name: 'Order' })).toBeVisible({ timeout: 5000 });
  });

  test('should save form display changes', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/article/form-display');
    await expect(page.getByRole('heading', { name: 'Manage form display' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Form display settings saved')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate from fields page tab', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/article/fields');
    await expect(page.getByRole('heading', { name: /Fields/ })).toBeVisible({ timeout: 10000 });
    // Should show Manage form display tab
    const formDisplayTab = page.getByRole('link', { name: 'Manage form display' });
    await expect(formDisplayTab).toBeVisible({ timeout: 5000 });
    await formDisplayTab.click();
    await expect(page.getByRole('heading', { name: 'Manage form display' })).toBeVisible({ timeout: 10000 });
  });
});
