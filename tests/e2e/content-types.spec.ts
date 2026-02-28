import { test, expect, apiPost } from './fixtures';

test.describe('Content Type Management', () => {
  test('should display content types list', async ({ authenticatedPage: page }) => {
    // Navigate directly to the content types page
    await page.goto('/structure/types');
    await expect(page).toHaveURL(/.*structure\/types/);

    // ContentTypes.tsx renders <h1>Content Types</h1>
    await expect(page.getByRole('heading', { name: 'Content Types' })).toBeVisible();
  });

  test('should create a new content type', async ({ authenticatedPage: page }) => {
    // Navigate to content types
    await page.goto('/structure/types');

    // Click "+ Add content type" link
    await page.getByRole('link', { name: '+ Add content type' }).click();
    await expect(page).toHaveURL(/.*structure\/types\/add/);

    // Fill in the form — ContentTypeForm.tsx: <label htmlFor="label">Label *</label>
    await page.getByLabel('Label *').fill('Blog Post');

    // Machine name auto-generates — input has id="machine-name"
    const machineNameInput = page.locator('#machine-name');
    await expect(machineNameInput).toHaveValue('blog_post');

    await page.getByLabel('Description').fill('A blog post content type for testing');

    // Submit — button text is "Save content type"
    await page.getByRole('button', { name: 'Save content type' }).click();

    // Should redirect back to content types list
    await page.waitForURL('**/structure/types', { timeout: 10000 });

    // Verify the new type appears — use link role to avoid matching description text
    await expect(page.getByRole('link', { name: 'Blog Post' })).toBeVisible();
  });

  test('should show fields for a content type', async ({ authenticatedPage: page }) => {
    // Create a content type via API first to ensure it exists (with auth)
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: 'article',
      label: 'Article',
      description: 'An article content type',
    }).catch(() => {});

    // Navigate to the fields page
    await page.goto('/structure/types/node/article/fields');

    // ContentTypeFields.tsx renders "{label} — Fields" heading (em dash U+2014)
    await expect(page.getByRole('heading', { name: /Article/ })).toBeVisible();

    // Should show the entity_type:bundle identifier
    await expect(page.getByText('node:article')).toBeVisible();
  });

  test('should add fields to a content type', async ({ authenticatedPage: page }) => {
    // Ensure article type exists (with auth)
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: 'article',
      label: 'Article',
      description: 'An article content type',
    }).catch(() => {});

    // Navigate to article fields page
    await page.goto('/structure/types/node/article/fields');

    // Click "+ Add field" link
    await page.getByRole('link', { name: '+ Add field' }).click();
    await expect(page).toHaveURL(/.*fields\/add/);

    // Add a text_long field called "Body"
    await page.getByLabel('Label *').fill('Body');

    // Select field type — AddField.tsx: <select id="field-type">
    await page.locator('#field-type').selectOption('text_long');

    // Submit — button text is "Save field"
    await page.getByRole('button', { name: 'Save field' }).click();

    // Should redirect back to fields list
    await page.waitForURL('**/fields', { timeout: 10000 });

    // ContentTypeFields.tsx shows field names in <code> tags
    await expect(page.getByText('field_body')).toBeVisible();

    // Add a boolean field called "Featured"
    await page.getByRole('link', { name: '+ Add field' }).click();
    await page.getByLabel('Label *').fill('Featured');
    await page.locator('#field-type').selectOption('boolean');
    await page.getByRole('button', { name: 'Save field' }).click();

    await page.waitForURL('**/fields', { timeout: 10000 });
    await expect(page.getByText('field_featured')).toBeVisible();
  });

  test('should navigate from content types to fields via manage link', async ({ authenticatedPage: page }) => {
    // Ensure article type exists via API (with auth)
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: 'article',
      label: 'Article',
      description: 'An article content type',
    }).catch(() => {});

    await page.goto('/structure/types');

    // Find the "Manage fields" link within the Article row
    const articleRow = page.locator('tr', { has: page.getByText('Article', { exact: true }) });
    await articleRow.getByRole('link', { name: 'Manage fields' }).first().click();

    // Should navigate to the article fields page
    await expect(page).toHaveURL(/.*structure\/types\/node\/article\/fields/);
  });
});
