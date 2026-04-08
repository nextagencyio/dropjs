import { test, expect } from './fixtures';

test.describe('Inline Status Toggle', () => {
  test('should show clickable status badges in content list', async ({ authenticatedPage: page }) => {
    await page.goto('/content');
    await expect(page.getByRole('heading', { name: 'Content' })).toBeVisible({ timeout: 10000 });
    // Status badges should be buttons with aria-labels
    const statusButtons = page.getByRole('button', { name: /Publish|Unpublish/ });
    await expect(statusButtons.first()).toBeVisible({ timeout: 5000 });
  });

  test('should have tooltip on status badge', async ({ authenticatedPage: page }) => {
    await page.goto('/content');
    await expect(page.getByRole('heading', { name: 'Content' })).toBeVisible({ timeout: 10000 });
    const statusButton = page.getByRole('button', { name: /Publish|Unpublish/ }).first();
    const title = await statusButton.getAttribute('title');
    expect(title).toMatch(/Click to (un)?publish/);
  });

  test('should toggle status when clicking Published badge', async ({ authenticatedPage: page }) => {
    await page.goto('/content');
    await expect(page.getByRole('heading', { name: 'Content' })).toBeVisible({ timeout: 10000 });
    // Find first published item
    const publishedButton = page.getByRole('button', { name: /^Unpublish / }).first();
    if (await publishedButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await publishedButton.click();
      // Should show "Updating..." briefly
      // After refresh, the item should now show as Draft
      await expect(page.getByText('Draft').first()).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Ctrl+S Save Shortcut', () => {
  test('should save form when pressing Ctrl+S on edit page', async ({ authenticatedPage: page }) => {
    // Navigate to create a new article so we have a clean entity to test
    await page.goto('/node/add/article');
    await expect(page.locator('#title')).toBeVisible({ timeout: 10000 });
    // Fill in title
    await page.locator('#title').fill('Ctrl+S Test Article');
    // Press Ctrl+S to save
    await page.keyboard.press('Control+s');
    // Should navigate to content list after successful save
    await expect(page.getByRole('heading', { name: 'Content' })).toBeVisible({ timeout: 15000 });
    // Verify the article was created
    await expect(page.getByText('Ctrl+S Test Article')).toBeVisible();
  });
});
