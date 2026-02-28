import { test, expect, apiPost } from './fixtures';

test.describe('Content CRUD', () => {
  // Article content type is seeded by default — no need to create it

  test('should navigate to content list', async ({ authenticatedPage: page }) => {
    // Sidebar uses icon links — click the Content link
    await page.locator('nav').first().getByRole('link', { name: 'Content' }).click();
    await expect(page).toHaveURL(/.*\/content/);

    // ContentList.tsx renders <h1>Content</h1>
    await expect(page.locator('h1', { hasText: 'Content' })).toBeVisible();
  });

  test('should create content', async ({ authenticatedPage: page }) => {
    // Navigate directly to the add form for article
    await page.goto('/node/add/article');

    // Content form heading: "Create Article"
    await expect(page.getByRole('heading', { name: 'Create Article' })).toBeVisible({ timeout: 10000 });

    // Fill in the title
    await page.getByLabel('Title').fill('My First Article');

    // Status toggle — Published label should be visible
    await expect(page.getByText('Published')).toBeVisible();

    // Submit — button says "Save and publish" for new entities
    await page.getByRole('button', { name: 'Save and publish' }).click();

    // After creation, EntityForm navigates to /content
    await page.waitForURL('**/content', { timeout: 10000 });

    // Verify the new content appears in the DataTable
    await expect(page.getByText('My First Article').first()).toBeVisible();
  });

  test('should edit content', async ({ authenticatedPage: page }) => {
    // First create a node via API (with auth) to have something to edit
    const createResp = await apiPost(page, '/api/node/article', {
      title: 'Editable Post',
      status: true,
    });
    const { data: created } = await createResp.json();
    const nid = created.nid;

    // Navigate to the edit page
    await page.goto(`/content/edit/node/article/${nid}`);

    // EntityForm.tsx: heading says "Edit Article"
    await expect(page.getByRole('heading', { name: 'Edit Article' })).toBeVisible({ timeout: 10000 });

    // Update the title
    const titleInput = page.getByLabel('Title');
    await titleInput.clear();
    await titleInput.fill('Updated Article');

    // Submit — EntityForm.tsx button says "Save" for existing entities
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // After save, navigates to /content
    await page.waitForURL('**/content', { timeout: 10000 });

    // Verify the updated title
    await expect(page.getByText('Updated Article').first()).toBeVisible();
  });

  test('should delete content', async ({ authenticatedPage: page }) => {
    // Create content with a unique title so it doesn't collide with previous runs
    const uniqueTitle = `Delete Me ${Date.now()}`;
    await apiPost(page, '/api/node/article', {
      title: uniqueTitle,
      status: true,
    });

    await page.goto('/content');

    // Wait for the content to appear in the list
    await expect(page.getByText(uniqueTitle).first()).toBeVisible({ timeout: 10000 });

    // ContentList: each row has an "Edit" link and a dropdown toggle (ChevronDown)
    const row = page.locator('tr', { hasText: uniqueTitle }).first();

    // Open the operations dropdown by clicking the chevron button
    await row.locator('button').last().click();

    // Set up dialog handler before clicking delete
    page.once('dialog', (dialog) => dialog.accept());

    // Click Delete in the dropdown menu
    await page.getByRole('button', { name: 'Delete' }).click();

    // Verify deletion — content should no longer appear
    await expect(page.getByText(uniqueTitle)).not.toBeVisible({ timeout: 5000 });
  });

  test('should edit content via /node/[id]/edit route', async ({ authenticatedPage: page }) => {
    // Create a basic page via API (fewer fields than article)
    const createResp = await apiPost(page, '/api/node/page', {
      title: 'Node Edit Route Test',
      status: true,
    });
    const { data: created } = await createResp.json();
    const nid = created.nid;

    // Navigate to Drupal-style edit path
    await page.goto(`/node/${nid}/edit`);

    // Should load the edit page with the node's bundle detected
    await expect(page.getByRole('heading', { name: /Edit/ })).toBeVisible({ timeout: 10000 });

    // Title field should be pre-filled
    const titleInput = page.getByLabel('Title');
    await expect(titleInput).toHaveValue('Node Edit Route Test');

    // Update and save
    await titleInput.clear();
    await titleInput.fill('Updated via Node Route');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // After save, navigates to /content
    await page.waitForURL('**/content', { timeout: 10000 });
    await expect(page.getByText('Updated via Node Route').first()).toBeVisible();
  });

  test('should filter content by type', async ({ authenticatedPage: page }) => {
    await page.goto('/content');

    // ContentList.tsx has a type filter <select> with id="type-filter"
    const typeFilter = page.locator('#type-filter');
    await expect(typeFilter).toBeVisible();

    // Should have "All types" as default option (value="")
    await expect(typeFilter).toHaveValue('');
  });

  test('should show add content link', async ({ authenticatedPage: page }) => {
    await page.goto('/content');

    // ContentList: "Add content" link navigates to /node/add
    const addLink = page.getByRole('link', { name: 'Add content' });
    await expect(addLink).toBeVisible({ timeout: 10000 });

    // Click and verify it goes to the node/add page
    await addLink.click();
    await expect(page).toHaveURL(/.*\/node\/add/);
    await expect(page.getByRole('heading', { name: 'Add content' })).toBeVisible({ timeout: 10000 });
  });
});
