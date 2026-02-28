import { test, expect, apiPost, apiGet, apiPut, apiDelete } from './fixtures';

test.describe('Layout Builder API', () => {
  const entityType = 'node';
  const bundle = 'page';
  const viewMode = 'full';
  const layoutBase = `/api/layout/${entityType}/${bundle}/${viewMode}`;

  // Clean up any leftover layout before/after tests
  test.afterEach(async ({ authenticatedPage: page }) => {
    await apiDelete(page, layoutBase).catch(() => {});
  });

  test('should list available layout types', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, '/api/layout-types');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(5);

    const ids = body.data.map((t: any) => t.id);
    expect(ids).toContain('one_column');
    expect(ids).toContain('two_column');
    expect(ids).toContain('three_column');
    expect(ids).toContain('two_column_33_67');
    expect(ids).toContain('two_column_67_33');

    // Each type should have regions
    const twoCol = body.data.find((t: any) => t.id === 'two_column');
    expect(twoCol).toBeDefined();
    expect(twoCol.regions.length).toBe(2);
    expect(twoCol.regions.map((r: any) => r.id)).toContain('first');
    expect(twoCol.regions.map((r: any) => r.id)).toContain('second');
  });

  test('should save and load a layout', async ({ authenticatedPage: page }) => {
    const sections = [
      {
        id: 'section-1',
        type: 'one_column',
        weight: 0,
        settings: {},
        components: [],
      },
      {
        id: 'section-2',
        type: 'two_column',
        weight: 1,
        settings: { label: 'Main content' },
        components: [
          {
            id: 'comp-1',
            type: 'system_powered_by',
            region: 'first',
            weight: 0,
            configuration: {},
          },
        ],
      },
    ];

    // Save layout
    const saveRes = await apiPut(page, layoutBase, { sections });
    expect(saveRes.status()).toBe(200);

    const saveBody = await saveRes.json();
    expect(saveBody.data.entityType).toBe(entityType);
    expect(saveBody.data.bundle).toBe(bundle);
    expect(saveBody.data.viewMode).toBe(viewMode);
    expect(saveBody.data.sections.length).toBe(2);

    // Load layout
    const getRes = await apiGet(page, layoutBase);
    expect(getRes.status()).toBe(200);

    const getBody = await getRes.json();
    expect(getBody.data.sections.length).toBe(2);
    expect(getBody.data.sections[0].id).toBe('section-1');
    expect(getBody.data.sections[0].type).toBe('one_column');
    expect(getBody.data.sections[1].id).toBe('section-2');
    expect(getBody.data.sections[1].components.length).toBe(1);
    expect(getBody.data.sections[1].components[0].id).toBe('comp-1');
  });

  test('should add and remove sections', async ({ authenticatedPage: page }) => {
    // Add first section
    const addRes1 = await apiPost(page, `${layoutBase}/sections`, {
      type: 'one_column',
      weight: 0,
      settings: {},
    });
    expect(addRes1.status()).toBe(201);

    const addBody1 = await addRes1.json();
    expect(addBody1.data.sections.length).toBe(1);
    const sectionId1 = addBody1.data.sections[0].id;
    expect(addBody1.data.sections[0].type).toBe('one_column');

    // Add second section
    const addRes2 = await apiPost(page, `${layoutBase}/sections`, {
      type: 'two_column',
      weight: 1,
      settings: {},
    });
    expect(addRes2.status()).toBe(201);

    const addBody2 = await addRes2.json();
    expect(addBody2.data.sections.length).toBe(2);
    const sectionId2 = addBody2.data.sections[1].id;

    // Verify layout has both sections
    const getRes = await apiGet(page, layoutBase);
    expect(getRes.status()).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.data.sections.length).toBe(2);

    // Remove first section
    const delRes = await apiDelete(page, `${layoutBase}/sections/${sectionId1}`);
    expect(delRes.status()).toBe(200);

    const delBody = await delRes.json();
    expect(delBody.data.sections.length).toBe(1);
    expect(delBody.data.sections[0].id).toBe(sectionId2);
  });

  test('should add and remove components', async ({ authenticatedPage: page }) => {
    // First create a layout with a section
    const sections = [
      {
        id: 'sec-for-components',
        type: 'two_column',
        weight: 0,
        settings: {},
        components: [],
      },
    ];
    await apiPut(page, layoutBase, { sections });

    // Add a component to the section
    const addRes = await apiPost(
      page,
      `${layoutBase}/sections/sec-for-components/components`,
      {
        type: 'system_powered_by',
        region: 'first',
        weight: 0,
        configuration: { label: 'Powered by' },
      },
    );
    expect(addRes.status()).toBe(201);

    const addBody = await addRes.json();
    const section = addBody.data.sections.find((s: any) => s.id === 'sec-for-components');
    expect(section.components.length).toBe(1);
    const componentId = section.components[0].id;
    expect(section.components[0].type).toBe('system_powered_by');
    expect(section.components[0].region).toBe('first');

    // Add a second component
    const addRes2 = await apiPost(
      page,
      `${layoutBase}/sections/sec-for-components/components`,
      {
        type: 'system_branding_block',
        region: 'second',
        weight: 1,
        configuration: {},
      },
    );
    expect(addRes2.status()).toBe(201);

    const addBody2 = await addRes2.json();
    const section2 = addBody2.data.sections.find((s: any) => s.id === 'sec-for-components');
    expect(section2.components.length).toBe(2);

    // Remove the first component
    const delRes = await apiDelete(
      page,
      `${layoutBase}/sections/sec-for-components/components/${componentId}`,
    );
    expect(delRes.status()).toBe(200);

    const delBody = await delRes.json();
    const sectionAfterDel = delBody.data.sections.find((s: any) => s.id === 'sec-for-components');
    expect(sectionAfterDel.components.length).toBe(1);
    expect(sectionAfterDel.components[0].type).toBe('system_branding_block');
  });

  test('should delete a layout', async ({ authenticatedPage: page }) => {
    // Create a layout
    const sections = [
      {
        id: 'section-to-delete',
        type: 'one_column',
        weight: 0,
        settings: {},
        components: [],
      },
    ];
    await apiPut(page, layoutBase, { sections });

    // Verify it exists
    const getRes = await apiGet(page, layoutBase);
    expect(getRes.status()).toBe(200);

    // Delete the layout
    const delRes = await apiDelete(page, layoutBase);
    expect(delRes.status()).toBe(204);

    // Verify it's gone
    const afterRes = await apiGet(page, layoutBase);
    expect(afterRes.status()).toBe(404);
  });

  test('should validate layout type on save', async ({ authenticatedPage: page }) => {
    const sections = [
      {
        id: 'bad-section',
        type: 'nonexistent_layout',
        weight: 0,
        settings: {},
        components: [],
      },
    ];

    const res = await apiPut(page, layoutBase, { sections });
    expect(res.status()).toBe(400);
  });

  test('should validate region when adding component', async ({ authenticatedPage: page }) => {
    // Create a layout with a one_column section
    const sections = [
      {
        id: 'region-test-section',
        type: 'one_column',
        weight: 0,
        settings: {},
        components: [],
      },
    ];
    await apiPut(page, layoutBase, { sections });

    // Try adding a component to an invalid region
    const res = await apiPost(
      page,
      `${layoutBase}/sections/region-test-section/components`,
      {
        type: 'system_powered_by',
        region: 'nonexistent_region',
        weight: 0,
        configuration: {},
      },
    );
    expect(res.status()).toBe(400);
  });
});
