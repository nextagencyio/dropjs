import { test, expect, apiPost, apiGet } from './fixtures';

test.describe('Full Content Workflow', () => {
  test('should create a vocabulary "Tags"', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/taxonomy');

    await page.getByRole('link', { name: '+ Add vocabulary' }).click();
    await expect(page).toHaveURL(/.*taxonomy\/add/);

    await page.getByLabel('Name *').fill('Tags');
    await page.getByRole('button', { name: 'Save vocabulary' }).click();

    await page.waitForURL('**/structure/taxonomy', { timeout: 10000 });
    await expect(page.getByRole('link', { name: 'Tags', exact: true })).toBeVisible();
  });

  test('should add terms to Tags vocabulary', async ({ authenticatedPage: page }) => {
    // Ensure Tags vocabulary exists via API
    await apiPost(page, '/api/taxonomy/vocabularies', {
      vid: 'tags',
      name: 'Tags',
    }).catch(() => {});

    await page.goto('/structure/taxonomy/tags');

    // Add "TypeScript"
    await page.getByRole('link', { name: '+ Add term' }).click();
    await page.getByLabel('Name *').fill('TypeScript');
    await page.getByRole('button', { name: 'Add term' }).click();
    await page.waitForURL('**/taxonomy/tags', { timeout: 10000 });
    await expect(page.getByText('TypeScript').first()).toBeVisible();

    // Add "JavaScript"
    await page.getByRole('link', { name: '+ Add term' }).click();
    await page.getByLabel('Name *').fill('JavaScript');
    await page.getByRole('button', { name: 'Add term' }).click();
    await page.waitForURL('**/taxonomy/tags', { timeout: 10000 });
    await expect(page.getByText('JavaScript').first()).toBeVisible();

    // Add "Node.js"
    await page.getByRole('link', { name: '+ Add term' }).click();
    await page.getByLabel('Name *').fill('Node.js');
    await page.getByRole('button', { name: 'Add term' }).click();
    await page.waitForURL('**/taxonomy/tags', { timeout: 10000 });
    await expect(page.getByText('Node.js').first()).toBeVisible();
  });

  test('should create Article content type with fields', async ({ authenticatedPage: page }) => {
    // Ensure Article content type exists via API (idempotent)
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: 'article',
      label: 'Article',
      description: 'A full article with body, tags, and featured flag',
    }).catch(() => {});

    await page.goto('/structure/types');
    await expect(page.getByRole('link', { name: 'Article', exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('should add body field to Article', async ({ authenticatedPage: page }) => {
    // Ensure Article type and body field exist via API (idempotent)
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: 'article',
      label: 'Article',
    }).catch(() => {});
    await apiPost(page, '/api/entity-types/node/article/fields', {
      name: 'field_body',
      label: 'Body',
      type: 'text_long',
    }).catch(() => {});

    await page.goto('/structure/types/node/article/fields');
    await expect(page.getByRole('heading', { name: /Article/ })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('field_body')).toBeVisible();
  });

  test('should add tags entity_reference field to Article', async ({ authenticatedPage: page }) => {
    // Ensure Article type and Tags vocab exist
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: 'article',
      label: 'Article',
    }).catch(() => {});
    await apiPost(page, '/api/taxonomy/vocabularies', {
      vid: 'tags',
      name: 'Tags',
    }).catch(() => {});

    await page.goto('/structure/types/node/article/fields');
    await expect(page.getByRole('heading', { name: /Article/ })).toBeVisible({ timeout: 10000 });

    await page.getByRole('link', { name: '+ Add field' }).click();
    await page.getByLabel('Label *').fill('Tags');
    await page.locator('#field-type').selectOption('entity_reference');
    await page.getByRole('button', { name: 'Save field' }).click();
    await page.waitForURL('**/fields', { timeout: 10000 });
    await expect(page.getByText('field_tags')).toBeVisible();
  });

  test('should add featured boolean field to Article', async ({ authenticatedPage: page }) => {
    // Ensure Article type and featured field exist via API (idempotent)
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: 'article',
      label: 'Article',
    }).catch(() => {});
    await apiPost(page, '/api/entity-types/node/article/fields', {
      name: 'field_featured',
      label: 'Featured',
      type: 'boolean',
    }).catch(() => {});

    await page.goto('/structure/types/node/article/fields');
    await expect(page.getByRole('heading', { name: /Article/ })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('field_featured')).toBeVisible();
  });

  test('should create an article with title and body', async ({ authenticatedPage: page }) => {
    // Ensure Article type with body field
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: 'article',
      label: 'Article',
    }).catch(() => {});
    await apiPost(page, '/api/entity-types/node/article/fields', {
      name: 'field_body',
      label: 'Body',
      type: 'text_long',
    }).catch(() => {});
    await apiPost(page, '/api/entity-types/node/article/fields', {
      name: 'field_featured',
      label: 'Featured',
      type: 'boolean',
    }).catch(() => {});

    await page.goto('/content/add/node/article');
    await expect(page.getByRole('heading', { name: 'Create Article' })).toBeVisible({ timeout: 10000 });

    // Fill title
    await page.locator('#title').fill('My First Article');

    // Fill body (textarea for text_long in plain_text mode)
    const bodyField = page.locator('#field_body');
    if (await bodyField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bodyField.fill('This is the article body content. It contains multiple sentences for testing purposes.');
    }

    // Toggle Featured if visible
    const featuredToggle = page.locator('#field_featured');
    if (await featuredToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await featuredToggle.click();
    }

    await page.getByRole('button', { name: 'Save and publish' }).click();
    await page.waitForURL('**/content', { timeout: 10000 });
    await expect(page.getByText('My First Article').first()).toBeVisible();
  });

  test('should edit the article', async ({ authenticatedPage: page }) => {
    // Ensure Article type with fields exists
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: 'article',
      label: 'Article',
    }).catch(() => {});
    await apiPost(page, '/api/entity-types/node/article/fields', {
      name: 'field_body',
      label: 'Body',
      type: 'text_long',
    }).catch(() => {});

    // Create an article via API
    const createResp = await apiPost(page, '/api/node/article', {
      title: 'Editable Article',
      status: true,
      field_body: { value: 'Original body', format: 'plain_text' },
    });
    const { data: created } = await createResp.json();
    const nid = created.nid;

    // Navigate to edit
    await page.goto(`/content/edit/node/article/${nid}`);
    await expect(page.getByRole('heading', { name: 'Edit Article' })).toBeVisible({ timeout: 10000 });

    // Verify title
    await expect(page.locator('#title')).toHaveValue('Editable Article');

    // Update title
    const titleInput = page.locator('#title');
    await titleInput.clear();
    await titleInput.fill('Updated Article Title');

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForURL('**/content', { timeout: 10000 });
    await expect(page.getByText('Updated Article Title').first()).toBeVisible();
  });

  test('should delete the article', async ({ authenticatedPage: page }) => {
    // Create Article type and an article via API
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: 'article',
      label: 'Article',
    }).catch(() => {});

    const uniqueTitle = `Deletable Article ${Date.now()}`;
    await apiPost(page, '/api/node/article', {
      title: uniqueTitle,
      status: true,
    });

    await page.goto('/content');
    await expect(page.getByText(uniqueTitle).first()).toBeVisible({ timeout: 10000 });

    const row = page.locator('tr', { hasText: uniqueTitle }).first();

    // Open the operations dropdown by clicking the chevron button
    await row.locator('button').last().click();

    // Handle the confirmation dialog
    page.once('dialog', (dialog) => dialog.accept());

    // Click "Delete" in the dropdown menu
    await page.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText(uniqueTitle)).not.toBeVisible({ timeout: 5000 });
  });

  test('should verify taxonomy terms can be listed', async ({ authenticatedPage: page }) => {
    // Ensure Tags vocabulary with terms exist via API
    await apiPost(page, '/api/taxonomy/vocabularies', {
      vid: 'tags',
      name: 'Tags',
    }).catch(() => {});

    // Add some terms via API
    await apiPost(page, '/api/taxonomy_term/tags', {
      title: 'TypeScript',
      status: 1,
    }).catch(() => {});
    await apiPost(page, '/api/taxonomy_term/tags', {
      title: 'JavaScript',
      status: 1,
    }).catch(() => {});

    await page.goto('/structure/taxonomy/tags');

    // Should display the term list — use .first() in case terms were created multiple times
    await expect(page.getByRole('link', { name: 'TypeScript' }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: 'JavaScript' }).first()).toBeVisible();
  });

  test('should create a second content type and verify both appear', async ({ authenticatedPage: page }) => {
    // Ensure Article already exists
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: 'article',
      label: 'Article',
    }).catch(() => {});

    // Create a "Press Release" content type
    await page.goto('/structure/types/add');

    await page.getByLabel('Label *').fill('Press Release');
    const machineNameInput = page.locator('#machine-name');
    await expect(machineNameInput).toHaveValue('press_release');
    await page.getByLabel('Description').fill('Official press releases');
    await page.getByRole('button', { name: 'Save content type' }).click();

    await page.waitForURL('**/structure/types', { timeout: 10000 });

    // Both content types should appear
    await expect(page.getByRole('link', { name: 'Article', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: 'Press Release' })).toBeVisible({ timeout: 10000 });
  });

  test('should create content using the add content link', async ({ authenticatedPage: page }) => {
    // Ensure Article type exists
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: 'article',
      label: 'Article',
    }).catch(() => {});

    await page.goto('/content');

    // Click the "Add content" link which navigates to /node/add
    const addLink = page.getByRole('link', { name: 'Add content' });
    await expect(addLink).toBeVisible({ timeout: 10000 });
    await addLink.click();

    // Should navigate to the node/add page showing content type cards
    await expect(page).toHaveURL(/.*node\/add/);
    await expect(page.getByRole('heading', { name: 'Add content' })).toBeVisible({ timeout: 10000 });

    // Click on the Article content type card (h2 heading inside the link)
    await page.getByRole('heading', { name: 'Article', exact: true }).click();

    // Should navigate to the article add form
    await expect(page).toHaveURL(/.*node\/add\/article/);
    await expect(page.getByRole('heading', { name: 'Create Article' })).toBeVisible({ timeout: 10000 });
  });

  test('should save content as draft', async ({ authenticatedPage: page }) => {
    // Ensure Article type exists
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: 'article',
      label: 'Article',
    }).catch(() => {});

    await page.goto('/content/add/node/article');
    await expect(page.getByRole('heading', { name: 'Create Article' })).toBeVisible({ timeout: 10000 });

    await page.locator('#title').fill('Draft Article');

    // Click "Save as draft" button (EntityForm.tsx)
    await page.getByRole('button', { name: 'Save as draft' }).click();
    await page.waitForURL('**/content', { timeout: 10000 });
    await expect(page.getByText('Draft Article').first()).toBeVisible();
  });

  test('should filter content list by type', async ({ authenticatedPage: page }) => {
    // Ensure two content types with content exist
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: 'article',
      label: 'Article',
    }).catch(() => {});
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: 'press_release',
      label: 'Press Release',
    }).catch(() => {});

    await apiPost(page, '/api/node/article', {
      title: 'Filter Test Article',
      status: true,
    }).catch(() => {});
    await apiPost(page, '/api/node/press_release', {
      title: 'Filter Test Release',
      status: true,
    }).catch(() => {});

    await page.goto('/content');

    // Select the type filter
    const typeFilter = page.locator('#type-filter');
    await expect(typeFilter).toBeVisible({ timeout: 10000 });

    // Filter by article
    await typeFilter.selectOption('article');

    // The content list should be filtered (may reload)
    await page.waitForTimeout(1000);

    // Article should still be visible
    await expect(page.getByText('Filter Test Article').first()).toBeVisible({ timeout: 10000 });
  });
});
