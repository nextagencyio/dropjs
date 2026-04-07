import { test, expect } from './fixtures';

test.describe('Media Browser Modal', () => {
  test('should show Browse media button on file field widget', async ({ authenticatedPage: page }) => {
    // Navigate to a content type that has file/image fields
    // Go to add content page for article (has field_image)
    await page.goto('/node/add/article');
    await expect(page.getByRole('heading')).toBeVisible({ timeout: 10000 });
    // The image field should have a "Browse media library" link
    await expect(page.getByText('Browse media library')).toBeVisible();
  });

  test('should open media browser modal when clicking browse', async ({ authenticatedPage: page }) => {
    await page.goto('/node/add/article');
    await expect(page.getByRole('heading')).toBeVisible({ timeout: 10000 });
    await page.getByText('Browse media library').click();
    // Modal should appear with heading
    await expect(page.getByRole('heading', { name: 'Media library' })).toBeVisible();
  });

  test('should show search input in media browser', async ({ authenticatedPage: page }) => {
    await page.goto('/node/add/article');
    await expect(page.getByRole('heading')).toBeVisible({ timeout: 10000 });
    await page.getByText('Browse media library').click();
    await expect(page.getByRole('heading', { name: 'Media library' })).toBeVisible();
    await expect(page.getByPlaceholder('Search media by filename...')).toBeVisible();
  });

  test('should show Insert selected button in media browser', async ({ authenticatedPage: page }) => {
    await page.goto('/node/add/article');
    await expect(page.getByRole('heading')).toBeVisible({ timeout: 10000 });
    await page.getByText('Browse media library').click();
    await expect(page.getByRole('heading', { name: 'Media library' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Insert selected' })).toBeVisible();
    // Insert should be disabled when nothing is selected
    await expect(page.getByRole('button', { name: 'Insert selected' })).toBeDisabled();
  });

  test('should close media browser with X button', async ({ authenticatedPage: page }) => {
    await page.goto('/node/add/article');
    await expect(page.getByRole('heading')).toBeVisible({ timeout: 10000 });
    await page.getByText('Browse media library').click();
    await expect(page.getByRole('heading', { name: 'Media library' })).toBeVisible();
    // Click the close button (X)
    await page.locator('.fixed button').filter({ has: page.locator('svg.lucide-x') }).click();
    // Modal should be gone
    await expect(page.getByRole('heading', { name: 'Media library' })).not.toBeVisible();
  });

  test('should show empty state when no media exists', async ({ authenticatedPage: page }) => {
    await page.goto('/node/add/article');
    await expect(page.getByRole('heading')).toBeVisible({ timeout: 10000 });
    await page.getByText('Browse media library').click();
    await expect(page.getByRole('heading', { name: 'Media library' })).toBeVisible();
    // With no media files, should show empty message
    await expect(page.getByText('No media files found.')).toBeVisible({ timeout: 5000 });
  });
});
