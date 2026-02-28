import { test, expect, apiPost, apiGet, apiPatch, apiDelete } from './fixtures';

test.describe('Language Management API', () => {
  test('should list all languages', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, '/api/languages');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);

    // English should always be present
    const en = body.data.find((l: any) => l.id === 'en');
    expect(en).toBeDefined();
    expect(en.label).toBe('English');
    expect(en.enabled).toBe(true);
  });

  test('should list enabled languages', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, '/api/languages/enabled');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);

    // At minimum, English should be enabled
    const en = body.data.find((l: any) => l.id === 'en');
    expect(en).toBeDefined();
  });

  test('should get default language', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, '/api/languages/default');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data.id).toBeDefined();
    expect(body.data.label).toBeDefined();
  });

  test('should enable a language', async ({ authenticatedPage: page }) => {
    // Enable French
    const res = await apiPatch(page, '/api/languages/fr', { enabled: true });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data.id).toBe('fr');
    expect(body.data.enabled).toBe(true);

    // Verify it's in enabled list
    const enabledRes = await apiGet(page, '/api/languages/enabled');
    const enabledBody = await enabledRes.json();
    const fr = enabledBody.data.find((l: any) => l.id === 'fr');
    expect(fr).toBeDefined();
  });

  test('should add a custom language', async ({ authenticatedPage: page }) => {
    const res = await apiPost(page, '/api/languages', {
      id: 'cy',
      label: 'Welsh',
      direction: 'ltr',
      weight: 20,
      enabled: true,
    });

    // May return 201 (first time) or 400 (already exists from previous run)
    if (res.status() === 201) {
      const body = await res.json();
      expect(body.data.id).toBe('cy');
      expect(body.data.label).toBe('Welsh');
    } else {
      expect(res.status()).toBe(400);
    }
  });

  test('should reject invalid language code', async ({ authenticatedPage: page }) => {
    const res = await apiPost(page, '/api/languages', {
      id: '12invalid',
      label: 'Invalid',
    });
    expect(res.status()).toBe(400);
  });

  test('should reject removing English', async ({ authenticatedPage: page }) => {
    const res = await apiDelete(page, '/api/languages/en');
    expect(res.status()).toBe(400);
  });
});

test.describe('Content Translation API', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Ensure article content type exists
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: 'article',
      label: 'Article',
    }).catch(() => {});

    // Enable French for translations
    await apiPatch(page, '/api/languages/fr', { enabled: true }).catch(() => {});
    // Enable Spanish for translations
    await apiPatch(page, '/api/languages/es', { enabled: true }).catch(() => {});
  });

  test('should get translation status for an entity', async ({ authenticatedPage: page }) => {
    // Create an article
    const createRes = await apiPost(page, '/api/node/article', {
      title: 'Translation Status Test',
      status: true,
    });
    const created = (await createRes.json()).data;
    const nid = created.nid;

    // Get translation status
    const res = await apiGet(page, `/api/node/article/${nid}/translations`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data.entity_id).toBe(nid);
    expect(body.data.entity_type).toBe('node');
    expect(body.data.default_langcode).toBe('en');
    expect(Array.isArray(body.data.translations)).toBe(true);
    expect(Array.isArray(body.data.existing_languages)).toBe(true);

    // English should be existing
    expect(body.data.existing_languages).toContain('en');

    // French should be untranslated
    const frStatus = body.data.translations.find((t: any) => t.langcode === 'fr');
    if (frStatus) {
      expect(frStatus.status).toBe('untranslated');
    }

    // Clean up
    await apiDelete(page, `/api/node/article/${nid}`);
  });

  test('should create a translation', async ({ authenticatedPage: page }) => {
    // Create an English article
    const createRes = await apiPost(page, '/api/node/article', {
      title: 'English Article for Translation',
      status: true,
    });
    const created = (await createRes.json()).data;
    const nid = created.nid;

    // Create French translation
    const transRes = await apiPost(page, `/api/node/article/${nid}/translations/fr`, {
      title: 'Article en Fran\u00e7ais',
    });
    expect(transRes.status()).toBe(201);

    const transBody = await transRes.json();
    expect(transBody.data.title).toBe('Article en Fran\u00e7ais');
    expect(transBody.data.langcode).toBe('fr');
    expect(transBody.data.nid).toBe(nid);

    // Clean up
    await apiDelete(page, `/api/node/article/${nid}`);
  });

  test('should get a specific translation', async ({ authenticatedPage: page }) => {
    // Create article and add French translation
    const createRes = await apiPost(page, '/api/node/article', {
      title: 'Get Translation Test',
      status: true,
    });
    const created = (await createRes.json()).data;
    const nid = created.nid;

    await apiPost(page, `/api/node/article/${nid}/translations/fr`, {
      title: 'Test de Traduction',
    });

    // Fetch the French translation
    const getRes = await apiGet(page, `/api/node/article/${nid}/translations/fr`);
    expect(getRes.status()).toBe(200);

    const body = await getRes.json();
    expect(body.data.title).toBe('Test de Traduction');
    expect(body.data.langcode).toBe('fr');

    // Fetch the English original — should still work
    const getEnRes = await apiGet(page, `/api/node/article/${nid}/translations/en`);
    expect(getEnRes.status()).toBe(200);

    const enBody = await getEnRes.json();
    expect(enBody.data.title).toBe('Get Translation Test');

    // Clean up
    await apiDelete(page, `/api/node/article/${nid}`);
  });

  test('should update a translation', async ({ authenticatedPage: page }) => {
    const createRes = await apiPost(page, '/api/node/article', {
      title: 'Update Translation Test',
      status: true,
    });
    const created = (await createRes.json()).data;
    const nid = created.nid;

    // Create French translation
    await apiPost(page, `/api/node/article/${nid}/translations/fr`, {
      title: 'Titre Original',
    });

    // Update the French translation
    const updateRes = await apiPatch(page, `/api/node/article/${nid}/translations/fr`, {
      title: 'Titre Mis \u00e0 Jour',
    });
    expect(updateRes.status()).toBe(200);

    const body = await updateRes.json();
    expect(body.data.title).toBe('Titre Mis \u00e0 Jour');

    // Clean up
    await apiDelete(page, `/api/node/article/${nid}`);
  });

  test('should delete a translation', async ({ authenticatedPage: page }) => {
    const createRes = await apiPost(page, '/api/node/article', {
      title: 'Delete Translation Test',
      status: true,
    });
    const created = (await createRes.json()).data;
    const nid = created.nid;

    // Create French translation
    await apiPost(page, `/api/node/article/${nid}/translations/fr`, {
      title: 'Traduction \u00e0 Supprimer',
    });

    // Delete the French translation
    const delRes = await apiDelete(page, `/api/node/article/${nid}/translations/fr`);
    expect(delRes.status()).toBe(204);

    // Verify it's gone
    const getRes = await apiGet(page, `/api/node/article/${nid}/translations/fr`);
    expect(getRes.status()).toBe(404);

    // English should still exist
    const getEnRes = await apiGet(page, `/api/node/article/${nid}/translations/en`);
    expect(getEnRes.status()).toBe(200);

    // Clean up
    await apiDelete(page, `/api/node/article/${nid}`);
  });

  test('should not allow deleting default language translation', async ({ authenticatedPage: page }) => {
    const createRes = await apiPost(page, '/api/node/article', {
      title: 'Cannot Delete Default',
      status: true,
    });
    const created = (await createRes.json()).data;
    const nid = created.nid;

    // Try to delete English (default) translation
    const delRes = await apiDelete(page, `/api/node/article/${nid}/translations/en`);
    expect(delRes.status()).toBe(400);

    // Clean up
    await apiDelete(page, `/api/node/article/${nid}`);
  });

  test('should reject translation for disabled language', async ({ authenticatedPage: page }) => {
    const createRes = await apiPost(page, '/api/node/article', {
      title: 'Disabled Language Test',
      status: true,
    });
    const created = (await createRes.json()).data;
    const nid = created.nid;

    // Try to create translation for Japanese (disabled by default)
    const transRes = await apiPost(page, `/api/node/article/${nid}/translations/ja`, {
      title: '\u7ffb\u8a33\u30c6\u30b9\u30c8',
    });
    expect(transRes.status()).toBe(400);

    // Clean up
    await apiDelete(page, `/api/node/article/${nid}`);
  });

  test('should reject duplicate translation', async ({ authenticatedPage: page }) => {
    const createRes = await apiPost(page, '/api/node/article', {
      title: 'Duplicate Translation Test',
      status: true,
    });
    const created = (await createRes.json()).data;
    const nid = created.nid;

    // Create French translation
    await apiPost(page, `/api/node/article/${nid}/translations/fr`, {
      title: 'Premi\u00e8re Traduction',
    });

    // Try to create another French translation — should fail
    const dupRes = await apiPost(page, `/api/node/article/${nid}/translations/fr`, {
      title: 'Deuxi\u00e8me Traduction',
    });
    expect(dupRes.status()).toBe(400);

    // Clean up
    await apiDelete(page, `/api/node/article/${nid}`);
  });

  test('should show updated translation status after adding translation', async ({ authenticatedPage: page }) => {
    const createRes = await apiPost(page, '/api/node/article', {
      title: 'Status Update Test',
      status: true,
    });
    const created = (await createRes.json()).data;
    const nid = created.nid;

    // Add French translation
    await apiPost(page, `/api/node/article/${nid}/translations/fr`, {
      title: 'Test du Statut',
    });

    // Check translation status
    const statusRes = await apiGet(page, `/api/node/article/${nid}/translations`);
    const statusBody = await statusRes.json();

    expect(statusBody.data.existing_languages).toContain('en');
    expect(statusBody.data.existing_languages).toContain('fr');

    const frStatus = statusBody.data.translations.find((t: any) => t.langcode === 'fr');
    if (frStatus) {
      expect(frStatus.status).toBe('translated');
    }

    // Clean up
    await apiDelete(page, `/api/node/article/${nid}`);
  });
});
