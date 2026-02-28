import { test, expect, apiPost, apiGet } from './fixtures';

test.describe('Edit Content Types', () => {
  test('should load edit form with existing data and save changes', async ({ authenticatedPage: page }) => {
    // Create a content type via API
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: 'edit_test_ct',
      label: 'Edit Test CT',
      description: 'Original description',
    }).catch(() => {});

    // Navigate to the edit page
    await page.goto('/structure/types/node/edit_test_ct/edit');

    // Wait for form to load with existing data
    await expect(page.getByRole('heading', { name: 'Edit content type' })).toBeVisible({ timeout: 10000 });

    // Verify form is pre-populated
    const labelInput = page.getByLabel('Label *');
    await expect(labelInput).toHaveValue('Edit Test CT');

    const machineNameInput = page.locator('#machine-name');
    await expect(machineNameInput).toHaveValue('edit_test_ct');
    await expect(machineNameInput).toBeDisabled();

    const descriptionInput = page.getByLabel('Description');
    await expect(descriptionInput).toHaveValue('Original description');

    // Change the label
    await labelInput.clear();
    await labelInput.fill('Updated CT Label');

    // Change the description
    await descriptionInput.clear();
    await descriptionInput.fill('Updated description');

    // Save
    await page.getByRole('button', { name: 'Save content type' }).click();

    // Should redirect back to content types list
    await page.waitForURL('**/structure/types', { timeout: 10000 });

    // Verify the updated label appears
    await expect(page.getByRole('link', { name: 'Updated CT Label' })).toBeVisible({ timeout: 10000 });

    // Verify via API that the update persisted
    const resp = await apiGet(page, '/api/entity-types/node/edit_test_ct');
    const body = await resp.json();
    expect(body.data.label).toBe('Updated CT Label');
    expect(body.data.description).toBe('Updated description');
  });

  test('should show machine name as read-only in content type edit mode', async ({ authenticatedPage: page }) => {
    // Create a content type via API
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: 'readonly_ct',
      label: 'Readonly CT',
    }).catch(() => {});

    await page.goto('/structure/types/node/readonly_ct/edit');
    await expect(page.getByRole('heading', { name: 'Edit content type' })).toBeVisible({ timeout: 10000 });

    // Machine name input should be disabled
    const machineNameInput = page.locator('#machine-name');
    await expect(machineNameInput).toBeDisabled();

    // Verify the help text says it cannot be changed
    await expect(page.getByText('Machine name cannot be changed.')).toBeVisible();
  });
});

test.describe('Edit Vocabularies', () => {
  test('should load edit form with existing data and save changes', async ({ authenticatedPage: page }) => {
    // Create a vocabulary via API
    await apiPost(page, '/api/taxonomy/vocabularies', {
      vid: 'edit_test_vocab',
      name: 'Edit Test Vocab',
      description: 'Original vocab description',
    }).catch(() => {});

    // Navigate to the edit page
    await page.goto('/structure/taxonomy/edit_test_vocab/edit');

    // Wait for form to load with existing data
    await expect(page.getByRole('heading', { name: 'Edit vocabulary' })).toBeVisible({ timeout: 10000 });

    // Verify form is pre-populated
    const nameInput = page.getByLabel('Name *');
    await expect(nameInput).toHaveValue('Edit Test Vocab');

    const vidInput = page.locator('#vid');
    await expect(vidInput).toHaveValue('edit_test_vocab');
    await expect(vidInput).toBeDisabled();

    const descriptionInput = page.getByLabel('Description');
    await expect(descriptionInput).toHaveValue('Original vocab description');

    // Change the name
    await nameInput.clear();
    await nameInput.fill('Updated Vocab Name');

    // Change the description
    await descriptionInput.clear();
    await descriptionInput.fill('Updated vocab description');

    // Save
    await page.getByRole('button', { name: 'Save vocabulary' }).click();

    // Should redirect back to taxonomy list
    await page.waitForURL('**/structure/taxonomy', { timeout: 10000 });

    // Verify the updated name appears
    await expect(page.getByRole('link', { name: 'Updated Vocab Name' })).toBeVisible({ timeout: 10000 });

    // Verify via API that the update persisted
    const resp = await apiGet(page, '/api/taxonomy/vocabularies/edit_test_vocab');
    const body = await resp.json();
    expect(body.data.label).toBe('Updated Vocab Name');
    expect(body.data.description).toBe('Updated vocab description');
  });

  test('should show machine name as read-only in vocabulary edit mode', async ({ authenticatedPage: page }) => {
    // Create a vocabulary via API
    await apiPost(page, '/api/taxonomy/vocabularies', {
      vid: 'readonly_vocab',
      name: 'Readonly Vocab',
    }).catch(() => {});

    await page.goto('/structure/taxonomy/readonly_vocab/edit');
    await expect(page.getByRole('heading', { name: 'Edit vocabulary' })).toBeVisible({ timeout: 10000 });

    // Machine name input should be disabled
    const vidInput = page.locator('#vid');
    await expect(vidInput).toBeDisabled();

    // Verify the help text says it cannot be changed
    await expect(page.getByText('Machine name cannot be changed.')).toBeVisible();
  });
});
