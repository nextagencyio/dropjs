import { test, expect } from './fixtures';

test.describe('Node Add Page', () => {
  test('should load /node/add page', async ({ authenticatedPage: page }) => {
    await page.goto('/node/add');
    await expect(page).toHaveURL(/.*\/node\/add/);
  });

  test('should show content type list on /node/add', async ({ authenticatedPage: page }) => {
    // Article and Basic page are seeded by default
    await page.goto('/node/add');
    await expect(page.getByRole('heading', { name: 'Add content' })).toBeVisible({ timeout: 10000 });

    // Should show content types as card links with their labels
    await expect(page.getByRole('heading', { name: 'Article', exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to add form when clicking a content type', async ({ authenticatedPage: page }) => {
    await page.goto('/node/add');
    await expect(page.getByRole('heading', { name: 'Add content' })).toBeVisible({ timeout: 10000 });

    // Click on the Article content type card
    await page.getByRole('heading', { name: 'Article', exact: true }).click();

    // Should navigate to /node/add/article
    await expect(page).toHaveURL(/.*\/node\/add\/article/);
    // Heading uses bundle name: "Create Article"
    await expect(page.getByRole('heading', { name: 'Create Article' })).toBeVisible({ timeout: 10000 });
  });

  test('should create content through the node/add flow', async ({ authenticatedPage: page }) => {
    // Start from node/add page
    await page.goto('/node/add');
    await expect(page.getByRole('heading', { name: 'Add content' })).toBeVisible({ timeout: 10000 });

    // Click on Article
    await page.getByRole('heading', { name: 'Article', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Create Article' })).toBeVisible({ timeout: 10000 });

    // Fill in the title and submit
    await page.locator('#title').fill('Node Add Flow Article');
    await page.getByRole('button', { name: 'Save and publish' }).click();

    // Should redirect to content list
    await page.waitForURL('**/content', { timeout: 10000 });
    await expect(page.getByText('Node Add Flow Article').first()).toBeVisible();
  });

  test('should list multiple content types on add content page', async ({ authenticatedPage: page }) => {
    // Article and Basic page are seeded by default
    await page.goto('/node/add');
    await expect(page.getByRole('heading', { name: 'Add content' })).toBeVisible({ timeout: 10000 });

    // Both content types should be listed as cards with headings
    await expect(page.getByRole('heading', { name: 'Article', exact: true })).toBeVisible({ timeout: 10000 });
    // Page content type may be labeled "Basic page" or "Page" depending on DB state
    await expect(page.getByRole('heading', { name: /^(Basic )?Page$/i })).toBeVisible({ timeout: 10000 });
  });

  test('should show content type descriptions', async ({ authenticatedPage: page }) => {
    await page.goto('/node/add');
    await expect(page.getByRole('heading', { name: 'Add content' })).toBeVisible({ timeout: 10000 });

    // At least one content type card should have a description (sub-heading text)
    // Basic Page description contains "basic page"
    await expect(page.getByText(/basic page/i).first()).toBeVisible({ timeout: 5000 });
  });
});
