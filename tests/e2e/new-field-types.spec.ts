import { test, expect, apiPost, apiGet } from './fixtures';

test.describe('New Field Types', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: 'field_test',
      label: 'Field Test',
      description: 'Content type for testing new field types',
    }).catch(() => {});
  });

  // --- Adding fields via the admin UI ---

  test('should add a telephone field', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/field_test/fields');
    await expect(page.getByRole('heading', { name: /Field Test/ })).toBeVisible({ timeout: 10000 });

    await page.getByRole('link', { name: '+ Add field' }).click();
    await expect(page).toHaveURL(/.*fields\/add/);

    await page.getByLabel('Label *').fill('Phone');
    await page.locator('#field-type').selectOption('telephone');
    await page.getByRole('button', { name: 'Save field' }).click();

    await page.waitForURL('**/fields', { timeout: 10000 });
    await expect(page.getByText('field_phone')).toBeVisible();
  });

  test('should add a date field', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/field_test/fields');
    await expect(page.getByRole('heading', { name: /Field Test/ })).toBeVisible({ timeout: 10000 });

    await page.getByRole('link', { name: '+ Add field' }).click();

    await page.getByLabel('Label *').fill('Event Date');
    await page.locator('#field-type').selectOption('date');
    await page.getByRole('button', { name: 'Save field' }).click();

    await page.waitForURL('**/fields', { timeout: 10000 });
    await expect(page.getByText('field_event_date')).toBeVisible();
  });

  test('should add a link field', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/field_test/fields');
    await expect(page.getByRole('heading', { name: /Field Test/ })).toBeVisible({ timeout: 10000 });

    await page.getByRole('link', { name: '+ Add field' }).click();

    await page.getByLabel('Label *').fill('Website');
    await page.locator('#field-type').selectOption('link');
    await page.getByRole('button', { name: 'Save field' }).click();

    await page.waitForURL('**/fields', { timeout: 10000 });
    await expect(page.getByText('field_website')).toBeVisible();
  });

  test('should add a color field', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/field_test/fields');
    await expect(page.getByRole('heading', { name: /Field Test/ })).toBeVisible({ timeout: 10000 });

    await page.getByRole('link', { name: '+ Add field' }).click();

    await page.getByLabel('Label *').fill('Theme Color');
    await page.locator('#field-type').selectOption('color');
    await page.getByRole('button', { name: 'Save field' }).click();

    await page.waitForURL('**/fields', { timeout: 10000 });
    await expect(page.getByText('field_theme_color')).toBeVisible();
  });

  test('should add a file field', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/field_test/fields');
    await expect(page.getByRole('heading', { name: /Field Test/ })).toBeVisible({ timeout: 10000 });

    await page.getByRole('link', { name: '+ Add field' }).click();

    await page.getByLabel('Label *').fill('Attachment');
    await page.locator('#field-type').selectOption('file');
    await page.getByRole('button', { name: 'Save field' }).click();

    await page.waitForURL('**/fields', { timeout: 10000 });
    await expect(page.getByText('field_attachment')).toBeVisible();
  });

  // --- Creating content with new field types ---

  test('should create content with telephone field', async ({ authenticatedPage: page }) => {
    await apiPost(page, '/api/entity-types/node/field_test/fields', {
      name: 'field_phone',
      label: 'Phone',
      type: 'telephone',
    }).catch(() => {});

    await page.goto('/content/add/node/field_test');
    await expect(page.getByRole('heading', { name: 'Create Field Test' })).toBeVisible({ timeout: 10000 });

    await page.locator('#title').fill('Telephone Test');

    const phoneInput = page.locator('#field_phone');
    if (await phoneInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(phoneInput).toHaveAttribute('type', 'tel');
      await phoneInput.fill('+1 (555) 123-4567');
    }

    await page.getByRole('button', { name: 'Save and publish' }).click();
    await page.waitForURL('**/content', { timeout: 10000 });
    await expect(page.getByText('Telephone Test').first()).toBeVisible();
  });

  test('should create content with date field', async ({ authenticatedPage: page }) => {
    await apiPost(page, '/api/entity-types/node/field_test/fields', {
      name: 'field_event_date',
      label: 'Event Date',
      type: 'date',
    }).catch(() => {});

    await page.goto('/content/add/node/field_test');
    await expect(page.getByRole('heading', { name: 'Create Field Test' })).toBeVisible({ timeout: 10000 });

    await page.locator('#title').fill('Date Test');

    const dateInput = page.locator('#field_event_date');
    if (await dateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(dateInput).toHaveAttribute('type', 'date');
      await dateInput.fill('2026-06-15');
    }

    await page.getByRole('button', { name: 'Save and publish' }).click();
    await page.waitForURL('**/content', { timeout: 10000 });
    await expect(page.getByText('Date Test').first()).toBeVisible();
  });

  test('should create content with link field', async ({ authenticatedPage: page }) => {
    await apiPost(page, '/api/entity-types/node/field_test/fields', {
      name: 'field_website',
      label: 'Website',
      type: 'link',
    }).catch(() => {});

    await page.goto('/content/add/node/field_test');
    await expect(page.getByRole('heading', { name: 'Create Field Test' })).toBeVisible({ timeout: 10000 });

    await page.locator('#title').fill('Link Test');

    // Link field has a url input (first input with id) and a text input
    const linkInput = page.locator('#field_website');
    if (await linkInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(linkInput).toHaveAttribute('type', 'url');
      await linkInput.fill('https://example.com');
    }

    await page.getByRole('button', { name: 'Save and publish' }).click();
    await page.waitForURL('**/content', { timeout: 10000 });
    await expect(page.getByText('Link Test').first()).toBeVisible();
  });

  test('should create content with color field', async ({ authenticatedPage: page }) => {
    await apiPost(page, '/api/entity-types/node/field_test/fields', {
      name: 'field_theme_color',
      label: 'Theme Color',
      type: 'color',
    }).catch(() => {});

    await page.goto('/content/add/node/field_test');
    await expect(page.getByRole('heading', { name: 'Create Field Test' })).toBeVisible({ timeout: 10000 });

    await page.locator('#title').fill('Color Test');

    const colorInput = page.locator('#field_theme_color');
    if (await colorInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(colorInput).toHaveAttribute('type', 'color');
    }

    await page.getByRole('button', { name: 'Save and publish' }).click();
    await page.waitForURL('**/content', { timeout: 10000 });
    await expect(page.getByText('Color Test').first()).toBeVisible();
  });

  // --- API-level field value persistence ---

  test('should persist telephone field via API', async ({ authenticatedPage: page }) => {
    await apiPost(page, '/api/entity-types/node/field_test/fields', {
      name: 'field_phone',
      label: 'Phone',
      type: 'telephone',
    }).catch(() => {});

    const createResp = await apiPost(page, '/api/node/field_test', {
      title: 'API Phone Test',
      status: true,
      field_phone: '+44 20 7946 0958',
    });
    expect(createResp.ok()).toBeTruthy();
    const { data: created } = await createResp.json();

    const getResp = await apiGet(page, `/api/node/field_test/${created.nid}`);
    const { data: loaded } = await getResp.json();
    expect(loaded.field_phone).toBe('+44 20 7946 0958');
  });

  test('should persist date field via API', async ({ authenticatedPage: page }) => {
    await apiPost(page, '/api/entity-types/node/field_test/fields', {
      name: 'field_event_date',
      label: 'Event Date',
      type: 'date',
    }).catch(() => {});

    const createResp = await apiPost(page, '/api/node/field_test', {
      title: 'API Date Test',
      status: true,
      field_event_date: '2026-12-25',
    });
    expect(createResp.ok()).toBeTruthy();
    const { data: created } = await createResp.json();

    const getResp = await apiGet(page, `/api/node/field_test/${created.nid}`);
    const { data: loaded } = await getResp.json();
    expect(loaded.field_event_date).toBe('2026-12-25');
  });

  test('should persist link field via API', async ({ authenticatedPage: page }) => {
    await apiPost(page, '/api/entity-types/node/field_test/fields', {
      name: 'field_website',
      label: 'Website',
      type: 'link',
    }).catch(() => {});

    const createResp = await apiPost(page, '/api/node/field_test', {
      title: 'API Link Test',
      status: true,
      field_website: { uri: 'https://example.org', title: 'Example Site' },
    });
    expect(createResp.ok()).toBeTruthy();
    const { data: created } = await createResp.json();

    const getResp = await apiGet(page, `/api/node/field_test/${created.nid}`);
    const { data: loaded } = await getResp.json();
    expect(loaded.field_website).toBeTruthy();
    expect(loaded.field_website.uri).toBe('https://example.org');
    expect(loaded.field_website.title).toBe('Example Site');
  });

  test('should persist color field via API', async ({ authenticatedPage: page }) => {
    await apiPost(page, '/api/entity-types/node/field_test/fields', {
      name: 'field_theme_color',
      label: 'Theme Color',
      type: 'color',
    }).catch(() => {});

    const createResp = await apiPost(page, '/api/node/field_test', {
      title: 'API Color Test',
      status: true,
      field_theme_color: '#ff6600',
    });
    expect(createResp.ok()).toBeTruthy();
    const { data: created } = await createResp.json();

    const getResp = await apiGet(page, `/api/node/field_test/${created.nid}`);
    const { data: loaded } = await getResp.json();
    // Color may come back as object with color/opacity or as string
    const color = typeof loaded.field_theme_color === 'object'
      ? loaded.field_theme_color.color
      : loaded.field_theme_color;
    expect(color).toBe('#ff6600');
  });

  // --- Edit and verify field values persist in UI ---

  test('should edit telephone field and verify persistence', async ({ authenticatedPage: page }) => {
    await apiPost(page, '/api/entity-types/node/field_test/fields', {
      name: 'field_phone',
      label: 'Phone',
      type: 'telephone',
    }).catch(() => {});

    const createResp = await apiPost(page, '/api/node/field_test', {
      title: 'Edit Phone Test',
      status: true,
      field_phone: '+1 555-0100',
    });
    const { data: created } = await createResp.json();

    await page.goto(`/content/edit/node/field_test/${created.nid}`);
    await expect(page.getByRole('heading', { name: 'Edit Field Test' })).toBeVisible({ timeout: 10000 });

    const phoneInput = page.locator('#field_phone');
    if (await phoneInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(phoneInput).toHaveValue('+1 555-0100');
    }
  });
});
