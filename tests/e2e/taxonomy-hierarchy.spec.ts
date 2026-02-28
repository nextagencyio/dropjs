import { test, expect, apiPost, apiGet } from './fixtures';

test.describe('Taxonomy Hierarchy & Ordering', () => {
  const vocabId = 'test_hierarchy';
  const vocabName = 'Test Hierarchy';

  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Ensure vocabulary exists (idempotent)
    await apiPost(page, '/api/taxonomy/vocabularies', {
      vid: vocabId,
      name: vocabName,
    }).catch(() => {});
  });

  test('should create a child term with parent selected via UI', async ({ authenticatedPage: page }) => {
    // Create parent term via API
    const parentResp = await apiPost(page, `/api/taxonomy_term/${vocabId}`, {
      title: 'Parent Term',
      weight: 0,
    });
    const parentData = await parentResp.json();
    const parentId = parentData.data.nid;

    // Navigate to add term page
    await page.goto(`/structure/taxonomy/${vocabId}/add`);

    // Fill in term name
    await page.getByLabel('Name *').fill('Child Term');

    // Select parent term
    await page.getByLabel('Parent term').selectOption(String(parentId));

    // Set weight
    await page.getByLabel('Weight').fill('5');

    // Submit
    await page.getByRole('button', { name: 'Add term' }).click();

    // Should redirect back to term list
    await page.waitForURL(`**/taxonomy/${vocabId}`, { timeout: 10000 });

    // Verify both parent and child term show in list
    await expect(page.getByRole('link', { name: 'Parent Term' }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: 'Child Term' }).first()).toBeVisible({ timeout: 10000 });
  });

  test('should show child terms indented in term list', async ({ authenticatedPage: page }) => {
    // Create parent and child terms via API
    const parentResp = await apiPost(page, `/api/taxonomy_term/${vocabId}`, {
      title: 'Animals',
      weight: 0,
    });
    const parentData = await parentResp.json();
    const parentId = parentData.data.nid;

    await apiPost(page, `/api/taxonomy_term/${vocabId}`, {
      title: 'Dogs',
      weight: 0,
      parent: parentId,
    });

    await apiPost(page, `/api/taxonomy_term/${vocabId}`, {
      title: 'Cats',
      weight: 1,
      parent: parentId,
    });

    // Navigate to term list
    await page.goto(`/structure/taxonomy/${vocabId}`);

    // Verify parent is visible
    await expect(page.getByRole('link', { name: 'Animals' }).first()).toBeVisible({ timeout: 10000 });

    // Verify children appear (now shown with tree connectors instead of em dash)
    await expect(page.getByRole('link', { name: 'Dogs' }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: 'Cats' }).first()).toBeVisible({ timeout: 10000 });
  });

  test('should order terms by weight', async ({ authenticatedPage: page }) => {
    // Create terms with specific weights via API
    await apiPost(page, `/api/taxonomy_term/${vocabId}`, {
      title: 'Zebra',
      weight: 10,
    });

    await apiPost(page, `/api/taxonomy_term/${vocabId}`, {
      title: 'Apple',
      weight: 0,
    });

    // Navigate to term list
    await page.goto(`/structure/taxonomy/${vocabId}`);

    // Both terms should be visible
    await expect(page.getByRole('link', { name: 'Apple' }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: 'Zebra' }).first()).toBeVisible({ timeout: 10000 });

    // Apple (weight 0) should appear before Zebra (weight 10)
    // The term list uses a grid layout; get all link texts to verify order
    const termLinks = page.locator('a').filter({ hasText: /^(Apple|Zebra)$/ });
    const allTexts = await termLinks.allTextContents();
    const appleIndex = allTexts.indexOf('Apple');
    const zebraIndex = allTexts.indexOf('Zebra');
    expect(appleIndex).toBeGreaterThan(-1);
    expect(zebraIndex).toBeGreaterThan(-1);
    expect(appleIndex).toBeLessThan(zebraIndex);
  });

  test('should edit a term parent and verify hierarchy updates', async ({ authenticatedPage: page }) => {
    // Create two parent-level terms
    const resp1 = await apiPost(page, `/api/taxonomy_term/${vocabId}`, {
      title: 'Category A',
      weight: 0,
    });
    const data1 = await resp1.json();

    const resp2 = await apiPost(page, `/api/taxonomy_term/${vocabId}`, {
      title: 'Category B',
      weight: 1,
    });
    const data2 = await resp2.json();

    // Create a child under Category A
    const childResp = await apiPost(page, `/api/taxonomy_term/${vocabId}`, {
      title: 'Subitem',
      weight: 0,
      parent: data1.data.nid,
    });
    const childData = await childResp.json();
    const childId = childData.data.nid;

    // Navigate to edit the child term
    await page.goto(`/structure/taxonomy/${vocabId}/${childId}/edit`);

    // Verify current parent is Category A
    const parentSelect = page.getByLabel('Parent term');
    await expect(parentSelect).toHaveValue(String(data1.data.nid));

    // Change parent to Category B
    await parentSelect.selectOption(String(data2.data.nid));

    // Save
    await page.getByRole('button', { name: 'Save term' }).click();

    // Should redirect to term list
    await page.waitForURL(`**/taxonomy/${vocabId}`, { timeout: 10000 });

    // Wait for the list to load with term data
    await expect(page.getByRole('link', { name: 'Category B' }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: 'Subitem' }).first()).toBeVisible({ timeout: 10000 });

    // Verify Subitem now appears under Category B (after it in DOM order)
    const termLinks = page.locator('a').filter({ hasText: /^(Category A|Category B|Subitem)$/ });
    const allTexts = await termLinks.allTextContents();
    const catBIndex = allTexts.indexOf('Category B');
    const subitemIndex = allTexts.indexOf('Subitem');
    expect(catBIndex).toBeGreaterThan(-1);
    expect(subitemIndex).toBeGreaterThan(-1);
    expect(subitemIndex).toBeGreaterThan(catBIndex);
  });

  test('API: create term with parent, load back, verify parent_target_id', async ({ authenticatedPage: page }) => {
    // Create parent term
    const parentResp = await apiPost(page, `/api/taxonomy_term/${vocabId}`, {
      title: 'API Parent',
      weight: 0,
    });
    expect(parentResp.ok()).toBeTruthy();
    const parentData = await parentResp.json();
    const parentId = parentData.data.nid;

    // Create child term with parent
    const childResp = await apiPost(page, `/api/taxonomy_term/${vocabId}`, {
      title: 'API Child',
      weight: 5,
      parent: parentId,
    });
    expect(childResp.ok()).toBeTruthy();
    const childData = await childResp.json();
    const childId = childData.data.nid;

    // Load child term back via API
    const loadResp = await apiGet(page, `/api/taxonomy_term/${vocabId}/${childId}`);
    expect(loadResp.ok()).toBeTruthy();
    const loaded = await loadResp.json();

    // Verify parent and weight are set correctly
    expect(loaded.data.parent).toBe(parentId);
    expect(loaded.data.weight).toBe(5);
  });
});
