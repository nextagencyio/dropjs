import { test, expect, apiPost, apiGet, apiPatch } from './fixtures';

test.describe('Field Settings & Cardinality', () => {
  const uniqueId = () => Math.random().toString(36).slice(2, 8);

  test('should create field with cardinality 3 and show 3 value inputs in content form', async ({ authenticatedPage: page }) => {
    const bid = `card_${uniqueId()}`;

    // Create content type
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: bid,
      label: `Cardinality Test ${bid}`,
    });

    // Add a string field with cardinality 3
    await apiPost(page, `/api/entity-types/node/${bid}/fields`, {
      name: 'field_labels',
      label: 'Labels',
      type: 'string',
      cardinality: 3,
    });

    // Navigate to content form
    await page.goto(`/content/add/node/${bid}`);
    await expect(page.getByRole('heading', { name: /Create/ })).toBeVisible({ timeout: 10000 });

    // The multi-value widget should show "Add another item" button
    await expect(page.getByText('Labels')).toBeVisible();
    const addButton = page.getByText('Add another item');
    await expect(addButton).toBeVisible();

    // Add items up to cardinality
    await addButton.click();
    await addButton.click();

    // Should have text inputs for the field values
    const inputs = page.locator('input[id^="field_labels-"]');
    await expect(inputs).toHaveCount(2); // Started with 0 items, clicked twice
  });

  test('should create entity_reference field targeting taxonomy_term', async ({ authenticatedPage: page }) => {
    const bid = `eref_${uniqueId()}`;

    // Create content type
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: bid,
      label: `EntityRef Test ${bid}`,
    });

    // Create a vocabulary
    const vid = `vocab_${uniqueId()}`;
    await apiPost(page, '/api/taxonomy/vocabularies', {
      vid,
      name: `Test Vocab ${vid}`,
    });

    // Add entity_reference field targeting taxonomy_term
    await apiPost(page, `/api/entity-types/node/${bid}/fields`, {
      name: 'field_category',
      label: 'Category',
      type: 'entity_reference',
      settings: { target_type: 'taxonomy_term', target_bundle: vid },
    });

    // Navigate to content form and verify the field renders
    await page.goto(`/content/add/node/${bid}`);
    await expect(page.getByRole('heading', { name: /Create/ })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Category')).toBeVisible();
    // Should show the entity reference autocomplete with target info
    await expect(page.getByText(`Reference to taxonomy_term (${vid})`)).toBeVisible();
  });

  test('should create list_string field with options and show dropdown in content form', async ({ authenticatedPage: page }) => {
    const bid = `list_${uniqueId()}`;

    // Create content type
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: bid,
      label: `List Test ${bid}`,
    });

    // Add list_string field with allowed values
    await apiPost(page, `/api/entity-types/node/${bid}/fields`, {
      name: 'field_color',
      label: 'Color',
      type: 'list_string',
      settings: {
        allowed_values: { red: 'Red', green: 'Green', blue: 'Blue' },
      },
    });

    // Navigate to content form
    await page.goto(`/content/add/node/${bid}`);
    await expect(page.getByRole('heading', { name: /Create/ })).toBeVisible({ timeout: 10000 });

    // Should show a select dropdown with the options
    const colorSelect = page.locator('select#field_color');
    await expect(colorSelect).toBeVisible();
    await expect(colorSelect.locator('option')).toHaveCount(4); // -- Select -- + 3 options

    // Verify option values exist in the select
    await expect(colorSelect).toContainText('Red');
    await expect(colorSelect).toContainText('Green');
    await expect(colorSelect).toContainText('Blue');
  });

  test('should edit field label via API', async ({ authenticatedPage: page }) => {
    const bid = `edit_${uniqueId()}`;

    // Create content type and field
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: bid,
      label: `Edit Test ${bid}`,
    });
    await apiPost(page, `/api/entity-types/node/${bid}/fields`, {
      name: 'field_summary',
      label: 'Summary',
      type: 'string',
    });

    // Update label via PATCH
    const patchResp = await apiPatch(
      page,
      `/api/entity-types/node/${bid}/fields/field_summary`,
      { label: 'Short Summary' },
    );
    expect(patchResp.ok()).toBeTruthy();
    const patchBody = await patchResp.json();
    expect(patchBody.data.label).toBe('Short Summary');

    // Verify via GET
    const getResp = await apiGet(page, `/api/entity-types/node/${bid}`);
    const getBody = await getResp.json();
    expect(getBody.data.fields.field_summary.label).toBe('Short Summary');
  });

  test('should edit field cardinality via API and reflect in content form', async ({ authenticatedPage: page }) => {
    const bid = `card2_${uniqueId()}`;

    // Create content type and single-value field
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: bid,
      label: `CardEdit Test ${bid}`,
    });
    await apiPost(page, `/api/entity-types/node/${bid}/fields`, {
      name: 'field_notes',
      label: 'Notes',
      type: 'string',
      cardinality: 1,
    });

    // Verify single-value (no "Add another item" button)
    await page.goto(`/content/add/node/${bid}`);
    await expect(page.getByRole('heading', { name: /Create/ })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Add another item')).not.toBeVisible();

    // Update cardinality to unlimited
    const patchResp = await apiPatch(
      page,
      `/api/entity-types/node/${bid}/fields/field_notes`,
      { cardinality: -1 },
    );
    expect(patchResp.ok()).toBeTruthy();

    // Reload and verify multi-value widget appears
    await page.goto(`/content/add/node/${bid}`);
    await expect(page.getByRole('heading', { name: /Create/ })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Add another item')).toBeVisible();
  });

  test('should edit field via UI edit page', async ({ authenticatedPage: page }) => {
    const bid = `ui_${uniqueId()}`;

    // Create content type and field
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: bid,
      label: `UI Edit Test ${bid}`,
    });
    await apiPost(page, `/api/entity-types/node/${bid}/fields`, {
      name: 'field_subtitle',
      label: 'Subtitle',
      type: 'string',
      cardinality: 1,
    });

    // Navigate to the field edit page
    await page.goto(`/structure/types/node/${bid}/fields/field_subtitle/edit`);
    await expect(page.getByRole('heading', { name: 'Edit field' })).toBeVisible({ timeout: 10000 });

    // Machine name and type should be read-only (displayed as text, not inputs)
    await expect(page.getByText('field_subtitle', { exact: true })).toBeVisible();
    await expect(page.getByText('Text (plain)', { exact: true })).toBeVisible();

    // Change label
    const labelInput = page.getByLabel('Label *');
    await labelInput.clear();
    await labelInput.fill('New Subtitle');

    // Change cardinality
    await page.getByLabel('Allowed number of values').selectOption('3');

    // Save
    await page.getByRole('button', { name: 'Save' }).click();

    // Should navigate back to the fields list
    await page.waitForURL(`**/structure/types/node/${bid}/fields`, { timeout: 10000 });

    // Verify the updated label appears
    await expect(page.getByText('New Subtitle')).toBeVisible();
    // Verify the updated cardinality
    await expect(page.locator('tr', { hasText: 'field_subtitle' }).getByText('3')).toBeVisible();
  });

  test('should show Edit links on fields page', async ({ authenticatedPage: page }) => {
    const bid = `links_${uniqueId()}`;

    // Create content type and field
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: bid,
      label: `Links Test ${bid}`,
    });
    await apiPost(page, `/api/entity-types/node/${bid}/fields`, {
      name: 'field_body',
      label: 'Body',
      type: 'text_long',
    });

    // Navigate to fields list
    await page.goto(`/structure/types/node/${bid}/fields`);
    await expect(page.getByRole('heading', { name: /Fields/ })).toBeVisible({ timeout: 10000 });

    // Should have an Edit link for the field
    const fieldRow = page.locator('tr', { hasText: 'field_body' });
    const editLink = fieldRow.getByRole('link', { name: 'Edit' });
    await expect(editLink).toBeVisible();

    // Clicking Edit should navigate to the edit page
    await editLink.click();
    await page.waitForURL(`**/structure/types/node/${bid}/fields/field_body/edit`);
    await expect(page.getByRole('heading', { name: 'Edit field' })).toBeVisible();
  });
});
