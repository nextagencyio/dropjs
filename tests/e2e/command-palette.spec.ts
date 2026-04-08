import { test, expect } from './fixtures';

test.describe('Command Palette', () => {
  test('should open with Ctrl+K keyboard shortcut', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    // Open command palette with Ctrl+K
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
    await expect(page.getByPlaceholder('Type a command or search...')).toBeFocused();
  });

  test('should close with Escape key', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).not.toBeVisible();
  });

  test('should close when clicking backdrop', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
    // Click backdrop (the outer fixed div)
    await page.locator('[role="dialog"]').click({ position: { x: 10, y: 10 } });
    await expect(page.getByRole('dialog', { name: 'Command palette' })).not.toBeVisible();
  });

  test('should show navigation sections', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog', { name: 'Command palette' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Navigation')).toBeVisible();
    // Verify the palette has multiple command items
    const items = dialog.locator('[data-selected]');
    await expect(items).not.toHaveCount(0);
  });

  test('should filter results by search query', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog', { name: 'Command palette' });
    await page.getByPlaceholder('Type a command or search...').fill('taxonomy');
    // Should show Taxonomy result
    await expect(dialog.getByText('Taxonomy')).toBeVisible();
    // Should not show unrelated items
    await expect(dialog.getByText('Appearance')).not.toBeVisible();
  });

  test('should show no results message for non-matching query', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Control+k');
    await page.getByPlaceholder('Type a command or search...').fill('xyznonexistent');
    await expect(page.getByText(/No results for/)).toBeVisible();
  });

  test('should navigate to selected item on Enter', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Control+k');
    await page.getByPlaceholder('Type a command or search...').fill('people');
    // Press Enter to navigate to the first match
    await page.keyboard.press('Enter');
    // Should navigate to the People page
    await expect(page.getByRole('heading', { name: 'People' })).toBeVisible({ timeout: 10000 });
  });

  test('should navigate on click', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog', { name: 'Command palette' });
    await dialog.getByText('Media').click();
    await expect(page.getByRole('heading', { name: 'Media' })).toBeVisible({ timeout: 10000 });
  });

  test('should support arrow key navigation', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Control+k');
    // First item should be selected by default (Dashboard)
    await expect(page.locator('[data-selected="true"]').first()).toContainText('Dashboard');
    // Press down arrow to select next
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-selected="true"]').first()).toContainText('Content');
  });

  test('should search by keywords', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Control+k');
    // Search for 'modules' should find 'Extend'
    await page.getByPlaceholder('Type a command or search...').fill('modules');
    const dialog = page.getByRole('dialog', { name: 'Command palette' });
    await expect(dialog.getByText('Extend')).toBeVisible();
  });

  test('should show search button in header bar', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Search commands' })).toBeVisible();
  });
});
