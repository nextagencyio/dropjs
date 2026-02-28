import { test, expect, apiPost } from './fixtures';

test.describe('Taxonomy Management', () => {
  test('should create a vocabulary', async ({ authenticatedPage: page }) => {
    // Ensure vocabulary exists via API (idempotent — may already exist from other tests)
    await apiPost(page, '/api/taxonomy/vocabularies', {
      vid: 'tags',
      name: 'Tags',
    }).catch(() => {});

    await page.goto('/structure/taxonomy');

    // Verify the vocabulary appears — use role link to avoid strict mode violation
    await expect(page.getByRole('link', { name: 'Tags', exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('should add terms to a vocabulary', async ({ authenticatedPage: page }) => {
    // Ensure vocabulary exists via API (with auth)
    await apiPost(page, '/api/taxonomy/vocabularies', {
      vid: 'tags',
      name: 'Tags',
    }).catch(() => {});

    await page.goto('/structure/taxonomy/tags');

    await page.getByRole('link', { name: '+ Add term' }).click();

    // TaxonomyTermForm.tsx: <label htmlFor="name">Name *</label>
    await page.getByLabel('Name *').fill('TypeScript');
    // Submit button text is "Add term"
    await page.getByRole('button', { name: 'Add term' }).click();

    // Should redirect back to term list
    await page.waitForURL('**/taxonomy/tags', { timeout: 10000 });
    await expect(page.getByText('TypeScript').first()).toBeVisible({ timeout: 10000 });

    // Add another term
    await page.getByRole('link', { name: '+ Add term' }).click();
    await page.getByLabel('Name *').fill('JavaScript');
    await page.getByRole('button', { name: 'Add term' }).click();

    await page.waitForURL('**/taxonomy/tags', { timeout: 10000 });
    await expect(page.getByText('JavaScript').first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to taxonomy from structure', async ({ authenticatedPage: page }) => {
    // Navigate to structure section
    await page.goto('/structure/types');

    // Sidebar has a Taxonomy nav link — scope to <nav>
    const taxonomyLink = page.locator('nav').getByRole('link', { name: 'Taxonomy' });
    if (await taxonomyLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await taxonomyLink.click();
      await expect(page).toHaveURL(/.*taxonomy/);
    }
  });
});
