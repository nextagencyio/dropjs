import { test, expect, apiGet, apiPost } from './fixtures';

test.describe('Config Export API', () => {
  test('should export all config as JSON', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, '/api/config/export');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(typeof body.data).toBe('object');
  });

  test('should export config containing known config keys', async ({ authenticatedPage: page }) => {
    // First import a known config item so we know it exists
    await apiPost(page, '/api/config/import', {
      configs: {
        'test.config_export_check': { setting: 'check_value' },
      },
    });

    const res = await apiGet(page, '/api/config/export');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data['test.config_export_check']).toBeDefined();
    expect(body.data['test.config_export_check'].setting).toBe('check_value');

    // Cleanup: remove the test config by importing empty (overwrite)
    // Config doesn't have a delete endpoint, so we leave it as a no-op entry
  });
});

test.describe('Config Import API', () => {
  test('should import config and create new config items', async ({ authenticatedPage: page }) => {
    const configs = {
      'test.import_basic': { color: 'blue', count: 42 },
      'test.import_second': { enabled: true, name: 'example' },
    };

    const res = await apiPost(page, '/api/config/import', { configs });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data.imported).toBe(2);

    // Verify the imported configs appear in export
    const exportRes = await apiGet(page, '/api/config/export');
    const exportBody = await exportRes.json();
    expect(exportBody.data['test.import_basic']).toBeDefined();
    expect(exportBody.data['test.import_basic'].color).toBe('blue');
    expect(exportBody.data['test.import_basic'].count).toBe(42);
    expect(exportBody.data['test.import_second']).toBeDefined();
    expect(exportBody.data['test.import_second'].enabled).toBe(true);
  });

  test('should overwrite existing config on re-import', async ({ authenticatedPage: page }) => {
    // Import initial value
    await apiPost(page, '/api/config/import', {
      configs: {
        'test.import_overwrite': { version: 1, label: 'Original' },
      },
    });

    // Import updated value
    const res = await apiPost(page, '/api/config/import', {
      configs: {
        'test.import_overwrite': { version: 2, label: 'Updated' },
      },
    });
    expect(res.status()).toBe(200);

    // Verify the overwritten config
    const exportRes = await apiGet(page, '/api/config/export');
    const exportBody = await exportRes.json();
    expect(exportBody.data['test.import_overwrite'].version).toBe(2);
    expect(exportBody.data['test.import_overwrite'].label).toBe('Updated');
  });

  test('should reject import without configs field', async ({ authenticatedPage: page }) => {
    const res = await apiPost(page, '/api/config/import', {});
    expect(res.status()).toBe(400);
  });

  test('should reject import with non-object configs', async ({ authenticatedPage: page }) => {
    const res = await apiPost(page, '/api/config/import', { configs: 'not-an-object' });
    expect(res.status()).toBe(400);
  });
});

test.describe('Config Diff API', () => {
  test('should diff incoming config against current state', async ({ authenticatedPage: page }) => {
    // First import a known config item
    await apiPost(page, '/api/config/import', {
      configs: {
        'test.diff_existing': { value: 'current' },
      },
    });

    // Diff with changes: modify existing, add new, omit existing (removed)
    const res = await apiPost(page, '/api/config/diff', {
      configs: {
        'test.diff_existing': { value: 'modified' }, // changed
        'test.diff_new_item': { value: 'brand_new' }, // added
        // test.diff_existing is changed, not removed since it's still present
      },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.added).toBeInstanceOf(Array);
    expect(body.data.changed).toBeInstanceOf(Array);
    expect(body.data.removed).toBeInstanceOf(Array);

    // The new item should appear in added
    expect(body.data.added).toContain('test.diff_new_item');
    // The modified item should appear in changed
    expect(body.data.changed).toContain('test.diff_existing');
  });

  test('should show no changes when config matches current', async ({ authenticatedPage: page }) => {
    // Import a config
    await apiPost(page, '/api/config/import', {
      configs: {
        'test.diff_same': { value: 'no_change' },
      },
    });

    // Export to get all current config
    const exportRes = await apiGet(page, '/api/config/export');
    const exportBody = await exportRes.json();

    // Diff with the exact same config
    const res = await apiPost(page, '/api/config/diff', {
      configs: exportBody.data,
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    // When diffing identical configs, there should be no added, changed, or removed
    expect(body.data.added).toEqual([]);
    expect(body.data.changed).toEqual([]);
    expect(body.data.removed).toEqual([]);
  });

  test('should detect removed configs in diff', async ({ authenticatedPage: page }) => {
    // Import two items
    await apiPost(page, '/api/config/import', {
      configs: {
        'test.diff_remove_a': { value: 'a' },
        'test.diff_remove_b': { value: 'b' },
      },
    });

    // Export current state
    const exportRes = await apiGet(page, '/api/config/export');
    const currentConfig = (await exportRes.json()).data;

    // Diff with only one of the two items (the other is "removed")
    const incoming = { ...currentConfig };
    delete incoming['test.diff_remove_b'];

    const res = await apiPost(page, '/api/config/diff', { configs: incoming });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data.removed).toContain('test.diff_remove_b');
  });

  test('should reject diff without configs field', async ({ authenticatedPage: page }) => {
    const res = await apiPost(page, '/api/config/diff', {});
    expect(res.status()).toBe(400);
  });
});

test.describe('Config Round-trip', () => {
  test('should round-trip: export, modify, diff shows changes, import, re-export matches', async ({ authenticatedPage: page }) => {
    // Step 1: Import a known baseline config
    const baselineConfigs = {
      'test.roundtrip_alpha': { title: 'Alpha', version: 1 },
      'test.roundtrip_beta': { title: 'Beta', version: 1 },
    };
    await apiPost(page, '/api/config/import', { configs: baselineConfigs });

    // Step 2: Export current state
    const exportRes1 = await apiGet(page, '/api/config/export');
    expect(exportRes1.status()).toBe(200);
    const exported1 = (await exportRes1.json()).data;

    // Verify baseline configs are in the export
    expect(exported1['test.roundtrip_alpha']).toBeDefined();
    expect(exported1['test.roundtrip_alpha'].title).toBe('Alpha');
    expect(exported1['test.roundtrip_beta']).toBeDefined();
    expect(exported1['test.roundtrip_beta'].title).toBe('Beta');

    // Step 3: Modify the exported config (simulate changes)
    // Use a unique key for the "added" config to avoid collisions with previous runs
    const gammaKey = `test.roundtrip_gamma_${Date.now()}`;
    const modified = { ...exported1 };
    modified['test.roundtrip_alpha'] = { ...modified['test.roundtrip_alpha'], title: 'Alpha Updated', version: 2 };
    modified[gammaKey] = { title: 'Gamma', version: 1 };

    // Step 4: Diff shows the changes
    const diffRes = await apiPost(page, '/api/config/diff', { configs: modified });
    expect(diffRes.status()).toBe(200);

    const diffBody = await diffRes.json();
    expect(diffBody.data.changed).toContain('test.roundtrip_alpha');
    expect(diffBody.data.added).toContain(gammaKey);
    // Nothing should be removed since we kept all keys
    expect(diffBody.data.removed).toEqual([]);

    // Step 5: Import the modified config
    const importRes = await apiPost(page, '/api/config/import', { configs: modified });
    expect(importRes.status()).toBe(200);

    // Step 6: Re-export and verify it matches the modified state
    const exportRes2 = await apiGet(page, '/api/config/export');
    expect(exportRes2.status()).toBe(200);
    const exported2 = (await exportRes2.json()).data;

    expect(exported2['test.roundtrip_alpha'].title).toBe('Alpha Updated');
    expect(exported2['test.roundtrip_alpha'].version).toBe(2);
    expect(exported2['test.roundtrip_beta'].title).toBe('Beta');
    expect(exported2[gammaKey]).toBeDefined();
    expect(exported2[gammaKey].title).toBe('Gamma');

    // Step 7: Diff again — should show no changes
    const diffRes2 = await apiPost(page, '/api/config/diff', { configs: exported2 });
    expect(diffRes2.status()).toBe(200);

    const diffBody2 = await diffRes2.json();
    expect(diffBody2.data.added).toEqual([]);
    expect(diffBody2.data.changed).toEqual([]);
    expect(diffBody2.data.removed).toEqual([]);
  });
});
