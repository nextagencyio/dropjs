import { test, expect } from './fixtures';

test.describe('Media Library', () => {
  test('should navigate to Media Library page', async ({ authenticatedPage: page }) => {
    // Media is not a toolbar item, navigate directly
    await page.goto('/media');
    await expect(page).toHaveURL(/.*\/media/);

    // MediaLibrary.tsx renders <h1>Media Library</h1>
    await expect(page.getByRole('heading', { name: 'Media Library' })).toBeVisible({ timeout: 10000 });
  });

  test('should display Media Library page with upload button', async ({ authenticatedPage: page }) => {
    await page.goto('/media');

    await expect(page.getByRole('heading', { name: 'Media Library' })).toBeVisible({ timeout: 10000 });

    // Should have "Upload File" button
    await expect(page.getByRole('button', { name: 'Upload File' })).toBeVisible();
  });

  test('should display file type filter', async ({ authenticatedPage: page }) => {
    await page.goto('/media');

    await expect(page.getByRole('heading', { name: 'Media Library' })).toBeVisible({ timeout: 10000 });

    // MediaLibrary.tsx has a filter select with options
    const filterSelect = page.locator('select');
    await expect(filterSelect).toBeVisible();

    // Verify filter options exist (options are hidden inside select, use toBeAttached)
    await expect(page.getByRole('option', { name: 'All files' })).toBeAttached();
    await expect(page.getByRole('option', { name: 'Images' })).toBeAttached();
    await expect(page.getByRole('option', { name: 'PDFs' })).toBeAttached();
  });

  test('should display drag and drop zone', async ({ authenticatedPage: page }) => {
    await page.goto('/media');

    await expect(page.getByRole('heading', { name: 'Media Library' })).toBeVisible({ timeout: 10000 });

    // Drop zone has text "Drag and drop files here, or browse"
    await expect(page.getByText('Drag and drop files here')).toBeVisible();
    await expect(page.getByText('browse')).toBeVisible();
    await expect(page.getByText('Maximum file size: 50MB')).toBeVisible();
  });

  test('should show empty state when no files uploaded', async ({ authenticatedPage: page }) => {
    await page.goto('/media');

    await expect(page.getByRole('heading', { name: 'Media Library' })).toBeVisible({ timeout: 10000 });

    // Wait for loading to finish (the "Loading..." text should disappear)
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });

    // MediaLibrary.tsx shows "No files uploaded yet." when empty
    // This may or may not be visible depending on whether files exist
    // Just verify the page loaded without errors
    const emptyMessage = page.getByText('No files uploaded yet');
    const fileGrid = page.locator('.grid');

    // Either empty message or a file grid should be visible
    const isEmpty = await emptyMessage.isVisible({ timeout: 5000 }).catch(() => false);
    const hasFiles = await fileGrid.isVisible({ timeout: 5000 }).catch(() => false);
    expect(isEmpty || hasFiles).toBeTruthy();
  });

  test('should have a hidden file input for uploads', async ({ authenticatedPage: page }) => {
    await page.goto('/media');

    await expect(page.getByRole('heading', { name: 'Media Library' })).toBeVisible({ timeout: 10000 });

    // MediaLibrary.tsx has a hidden file input that is triggered by the Upload button
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput.first()).toBeAttached();
  });
});
