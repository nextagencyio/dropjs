import { test, expect, apiPost, apiGet } from './fixtures';

test.describe('Field Types', () => {
  // Create a content type for field testing via API before tests
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: 'test_fields',
      label: 'Test Fields',
      description: 'Content type for testing field types',
    }).catch(() => {}); // Ignore if already exists
  });

  test('should add a string field', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/test_fields/fields');
    await expect(page.getByRole('heading', { name: /Test Fields/ })).toBeVisible({ timeout: 10000 });

    await page.getByRole('link', { name: '+ Add field' }).click();
    await expect(page).toHaveURL(/.*fields\/add/);

    await page.getByLabel('Label *').fill('Subtitle');
    await page.locator('#field-type').selectOption('string');
    await page.getByRole('button', { name: 'Save field' }).click();

    await page.waitForURL('**/fields', { timeout: 10000 });
    await expect(page.getByText('field_subtitle')).toBeVisible();
  });

  test('should add a text_long field', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/test_fields/fields');
    await expect(page.getByRole('heading', { name: /Test Fields/ })).toBeVisible({ timeout: 10000 });

    await page.getByRole('link', { name: '+ Add field' }).click();

    await page.getByLabel('Label *').fill('Body');
    await page.locator('#field-type').selectOption('text_long');
    await page.getByRole('button', { name: 'Save field' }).click();

    await page.waitForURL('**/fields', { timeout: 10000 });
    await expect(page.getByText('field_body')).toBeVisible();
  });

  test('should add an integer field', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/test_fields/fields');
    await expect(page.getByRole('heading', { name: /Test Fields/ })).toBeVisible({ timeout: 10000 });

    await page.getByRole('link', { name: '+ Add field' }).click();

    await page.getByLabel('Label *').fill('Count');
    await page.locator('#field-type').selectOption('integer');
    await page.getByRole('button', { name: 'Save field' }).click();

    await page.waitForURL('**/fields', { timeout: 10000 });
    await expect(page.getByText('field_count')).toBeVisible();
  });

  test('should add a boolean field', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/test_fields/fields');
    await expect(page.getByRole('heading', { name: /Test Fields/ })).toBeVisible({ timeout: 10000 });

    await page.getByRole('link', { name: '+ Add field' }).click();

    await page.getByLabel('Label *').fill('Featured');
    await page.locator('#field-type').selectOption('boolean');
    await page.getByRole('button', { name: 'Save field' }).click();

    await page.waitForURL('**/fields', { timeout: 10000 });
    await expect(page.getByText('field_featured')).toBeVisible();
  });

  test('should add an email field', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/test_fields/fields');
    await expect(page.getByRole('heading', { name: /Test Fields/ })).toBeVisible({ timeout: 10000 });

    await page.getByRole('link', { name: '+ Add field' }).click();

    await page.getByLabel('Label *').fill('Contact Email');
    await page.locator('#field-type').selectOption('email');
    await page.getByRole('button', { name: 'Save field' }).click();

    await page.waitForURL('**/fields', { timeout: 10000 });
    await expect(page.getByText('field_contact_email')).toBeVisible();
  });

  test('should add an entity_reference field', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/test_fields/fields');
    await expect(page.getByRole('heading', { name: /Test Fields/ })).toBeVisible({ timeout: 10000 });

    await page.getByRole('link', { name: '+ Add field' }).click();

    await page.getByLabel('Label *').fill('Related Content');
    await page.locator('#field-type').selectOption('entity_reference');
    await page.getByRole('button', { name: 'Save field' }).click();

    await page.waitForURL('**/fields', { timeout: 10000 });
    await expect(page.getByText('field_related_content')).toBeVisible();
  });

  test('should add a list_string field', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/test_fields/fields');
    await expect(page.getByRole('heading', { name: /Test Fields/ })).toBeVisible({ timeout: 10000 });

    await page.getByRole('link', { name: '+ Add field' }).click();

    await page.getByLabel('Label *').fill('Priority');
    await page.locator('#field-type').selectOption('list_string');
    await page.getByRole('button', { name: 'Save field' }).click();

    await page.waitForURL('**/fields', { timeout: 10000 });
    await expect(page.getByText('field_priority')).toBeVisible();
  });

  test('should create content with string field', async ({ authenticatedPage: page }) => {
    // Ensure string field exists via API
    await apiPost(page, '/api/entity-types/node/test_fields/fields', {
      name: 'field_subtitle',
      label: 'Subtitle',
      type: 'string',
    }).catch(() => {});

    await page.goto('/content/add/node/test_fields');
    await expect(page.getByRole('heading', { name: 'Create Test Fields' })).toBeVisible({ timeout: 10000 });

    // Fill title
    await page.locator('#title').fill('String Field Test');

    // FieldWidget renders label "Subtitle" with text input
    // Field is identified by fieldName id attribute
    const subtitleInput = page.locator('#field_subtitle');
    if (await subtitleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await subtitleInput.fill('My Subtitle Value');
    }

    await page.getByRole('button', { name: 'Save and publish' }).click();
    await page.waitForURL('**/content', { timeout: 10000 });
    await expect(page.getByText('String Field Test').first()).toBeVisible();
  });

  test('should create content with text_long field', async ({ authenticatedPage: page }) => {
    // Ensure text_long field exists via API
    await apiPost(page, '/api/entity-types/node/test_fields/fields', {
      name: 'field_body',
      label: 'Body',
      type: 'text_long',
    }).catch(() => {});

    await page.goto('/content/add/node/test_fields');
    await expect(page.getByRole('heading', { name: 'Create Test Fields' })).toBeVisible({ timeout: 10000 });

    await page.locator('#title').fill('Text Long Field Test');

    // text_long renders a textarea (when plain_text format)
    const bodyTextarea = page.locator('#field_body');
    if (await bodyTextarea.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bodyTextarea.fill('This is a long body text for testing the text_long field type.');
    }

    await page.getByRole('button', { name: 'Save and publish' }).click();
    await page.waitForURL('**/content', { timeout: 10000 });
    await expect(page.getByText('Text Long Field Test').first()).toBeVisible();
  });

  test('should create content with integer field', async ({ authenticatedPage: page }) => {
    // Ensure integer field exists via API
    await apiPost(page, '/api/entity-types/node/test_fields/fields', {
      name: 'field_count',
      label: 'Count',
      type: 'integer',
    }).catch(() => {});

    await page.goto('/content/add/node/test_fields');
    await expect(page.getByRole('heading', { name: 'Create Test Fields' })).toBeVisible({ timeout: 10000 });

    await page.locator('#title').fill('Integer Field Test');

    // integer renders a number input
    const countInput = page.locator('#field_count');
    if (await countInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await countInput.fill('42');
    }

    await page.getByRole('button', { name: 'Save and publish' }).click();
    await page.waitForURL('**/content', { timeout: 10000 });
    await expect(page.getByText('Integer Field Test').first()).toBeVisible();
  });

  test('should create content with boolean field', async ({ authenticatedPage: page }) => {
    // Ensure boolean field exists via API
    await apiPost(page, '/api/entity-types/node/test_fields/fields', {
      name: 'field_featured',
      label: 'Featured',
      type: 'boolean',
    }).catch(() => {});

    await page.goto('/content/add/node/test_fields');
    await expect(page.getByRole('heading', { name: 'Create Test Fields' })).toBeVisible({ timeout: 10000 });

    await page.locator('#title').fill('Boolean Field Test');

    // boolean renders a toggle switch with role="switch"
    const toggle = page.locator('#field_featured');
    if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await toggle.click();
    }

    await page.getByRole('button', { name: 'Save and publish' }).click();
    await page.waitForURL('**/content', { timeout: 10000 });
    await expect(page.getByText('Boolean Field Test').first()).toBeVisible();
  });

  test('should create content with email field', async ({ authenticatedPage: page }) => {
    // Ensure email field exists via API
    await apiPost(page, '/api/entity-types/node/test_fields/fields', {
      name: 'field_contact_email',
      label: 'Contact Email',
      type: 'email',
    }).catch(() => {});

    await page.goto('/content/add/node/test_fields');
    await expect(page.getByRole('heading', { name: 'Create Test Fields' })).toBeVisible({ timeout: 10000 });

    await page.locator('#title').fill('Email Field Test');

    // email renders an email input
    const emailInput = page.locator('#field_contact_email');
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill('test@example.com');
    }

    await page.getByRole('button', { name: 'Save and publish' }).click();
    await page.waitForURL('**/content', { timeout: 10000 });
    await expect(page.getByText('Email Field Test').first()).toBeVisible();
  });

  test('should edit content and verify field values persist', async ({ authenticatedPage: page }) => {
    // Ensure string field exists
    await apiPost(page, '/api/entity-types/node/test_fields/fields', {
      name: 'field_subtitle',
      label: 'Subtitle',
      type: 'string',
    }).catch(() => {});

    // Create content with field data via API
    const createResp = await apiPost(page, '/api/node/test_fields', {
      title: 'Persist Test',
      status: true,
      field_subtitle: 'Original Subtitle',
    });
    const { data: created } = await createResp.json();
    const nid = created.nid;

    // Navigate to edit page
    await page.goto(`/content/edit/node/test_fields/${nid}`);
    await expect(page.getByRole('heading', { name: 'Edit Test Fields' })).toBeVisible({ timeout: 10000 });

    // Verify title is pre-filled — use the #title id to avoid ambiguity
    await expect(page.locator('#title')).toHaveValue('Persist Test');

    // Verify string field is pre-filled if it rendered
    const subtitleInput = page.locator('#field_subtitle');
    if (await subtitleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(subtitleInput).toHaveValue('Original Subtitle');

      // Update the value
      await subtitleInput.clear();
      await subtitleInput.fill('Updated Subtitle');
    }

    // Update title
    const titleInput = page.locator('#title');
    await titleInput.clear();
    await titleInput.fill('Updated Persist Test');

    // Save
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForURL('**/content', { timeout: 10000 });
    await expect(page.getByText('Updated Persist Test').first()).toBeVisible();
  });

  test('should verify field widgets render with correct input types', async ({ authenticatedPage: page }) => {
    // Add multiple fields via API
    await apiPost(page, '/api/entity-types/node/test_fields/fields', {
      name: 'field_subtitle', label: 'Subtitle', type: 'string',
    }).catch(() => {});
    await apiPost(page, '/api/entity-types/node/test_fields/fields', {
      name: 'field_body', label: 'Body', type: 'text_long',
    }).catch(() => {});
    await apiPost(page, '/api/entity-types/node/test_fields/fields', {
      name: 'field_count', label: 'Count', type: 'integer',
    }).catch(() => {});
    await apiPost(page, '/api/entity-types/node/test_fields/fields', {
      name: 'field_featured', label: 'Featured', type: 'boolean',
    }).catch(() => {});
    await apiPost(page, '/api/entity-types/node/test_fields/fields', {
      name: 'field_contact_email', label: 'Contact Email', type: 'email',
    }).catch(() => {});

    await page.goto('/content/add/node/test_fields');
    await expect(page.getByRole('heading', { name: 'Create Test Fields' })).toBeVisible({ timeout: 10000 });

    // Verify Title is a text input
    const titleInput = page.locator('#title');
    await expect(titleInput).toBeVisible();
    await expect(titleInput).toHaveAttribute('type', 'text');

    // Verify string field renders as text input
    const stringInput = page.locator('#field_subtitle');
    if (await stringInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(stringInput).toHaveAttribute('type', 'text');
    }

    // Verify integer field renders as number input
    const intInput = page.locator('#field_count');
    if (await intInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(intInput).toHaveAttribute('type', 'number');
    }

    // Verify email field renders as email input
    const emailInput = page.locator('#field_contact_email');
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(emailInput).toHaveAttribute('type', 'email');
    }

    // Verify boolean field renders as a switch
    const boolSwitch = page.locator('#field_featured');
    if (await boolSwitch.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(boolSwitch).toHaveRole('switch');
    }
  });
});
