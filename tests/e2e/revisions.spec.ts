import { test, expect, apiPost, apiGet, apiPatch } from './fixtures';

test.describe('Content Revisions', () => {
  // Article content type is seeded by default — no need to create it

  test('should list revisions after create and edits', async ({ authenticatedPage: page }) => {
    // Create content
    const createResp = await apiPost(page, '/api/node/article', {
      title: 'Revision Test Post',
      status: true,
    });
    const { data: created } = await createResp.json();
    const nid = created.nid;

    // Edit #1
    await apiPatch(page, `/api/node/article/${nid}`, { title: 'Revision Test Post - Edit 1' });

    // Edit #2
    await apiPatch(page, `/api/node/article/${nid}`, { title: 'Revision Test Post - Edit 2' });

    // Verify revision list shows 3 entries
    const listResp = await apiGet(page, `/api/node/article/${nid}/revisions`);
    expect(listResp.ok()).toBeTruthy();
    const listBody = await listResp.json();
    expect(listBody.data.length).toBe(3);
    // Most recent revision first (DESC order)
    expect(listBody.meta.current_vid).toBeDefined();
  });

  test('should load an old revision with original title', async ({ authenticatedPage: page }) => {
    // Create content
    const createResp = await apiPost(page, '/api/node/article', {
      title: 'Original Title',
      status: true,
    });
    const { data: created } = await createResp.json();
    const nid = created.nid;
    const originalVid = created.vid;

    // Edit to change title
    await apiPatch(page, `/api/node/article/${nid}`, { title: 'Updated Title' });

    // Load old revision
    const revResp = await apiGet(
      page,
      `/api/node/article/${nid}/revisions/${originalVid}`,
    );
    expect(revResp.ok()).toBeTruthy();
    const revBody = await revResp.json();
    expect(revBody.data.title).toBe('Original Title');
  });

  test('should revert to old revision', async ({ authenticatedPage: page }) => {
    // Create content
    const createResp = await apiPost(page, '/api/node/article', {
      title: 'Before Revert',
      status: true,
    });
    const { data: created } = await createResp.json();
    const nid = created.nid;
    const originalVid = created.vid;

    // Edit to change title
    await apiPatch(page, `/api/node/article/${nid}`, { title: 'After Edit' });

    // Verify current title is the edited one
    const currentResp = await apiGet(page, `/api/node/article/${nid}`);
    const currentBody = await currentResp.json();
    expect(currentBody.data.title).toBe('After Edit');

    // Revert to original
    const revertResp = await apiPost(
      page,
      `/api/node/article/${nid}/revisions/${originalVid}/revert`,
      {},
    );
    expect(revertResp.ok()).toBeTruthy();

    // Verify current content now has original title
    const afterRevertResp = await apiGet(page, `/api/node/article/${nid}`);
    const afterRevertBody = await afterRevertResp.json();
    expect(afterRevertBody.data.title).toBe('Before Revert');

    // Verify a new revision was created (should now be 3 total: create, edit, revert)
    const listResp = await apiGet(page, `/api/node/article/${nid}/revisions`);
    const listBody = await listResp.json();
    expect(listBody.data.length).toBe(3);
  });

  test('UI: should show revision history page', async ({ authenticatedPage: page }) => {
    // Create content via API
    const createResp = await apiPost(page, '/api/node/article', {
      title: 'UI Revision Test',
      status: true,
    });
    const { data: created } = await createResp.json();
    const nid = created.nid;

    // Edit to get a second revision
    await apiPatch(page, `/api/node/article/${nid}`, { title: 'UI Revision Test - Edited' });

    // Navigate to revision history page
    await page.goto(`/content/revisions/node/article/${nid}`);

    // Should show "Revision History" heading
    await expect(
      page.getByRole('heading', { name: 'Revision History' }),
    ).toBeVisible({ timeout: 10000 });

    // Timeline layout: each revision is a card with "Revision #N" text
    const revisionCards = page.getByText(/Revision #\d+/);
    await expect(revisionCards).toHaveCount(2, { timeout: 10000 });

    // The current revision should be marked
    await expect(page.getByText('Current')).toBeVisible();

    // Should have a "Revert" button on the non-current revision
    await expect(page.getByRole('button', { name: 'Revert' })).toBeVisible();
  });

  test('UI: should revert via revision history page', async ({ authenticatedPage: page }) => {
    // Create content via API
    const createResp = await apiPost(page, '/api/node/article', {
      title: 'Revert UI Test Original',
      status: true,
    });
    const { data: created } = await createResp.json();
    const nid = created.nid;

    // Edit to change title
    await apiPatch(page, `/api/node/article/${nid}`, { title: 'Revert UI Test Changed' });

    // Navigate to revision history page
    await page.goto(`/content/revisions/node/article/${nid}`);

    await expect(
      page.getByRole('heading', { name: 'Revision History' }),
    ).toBeVisible({ timeout: 10000 });

    // Accept the confirm dialog
    page.once('dialog', (dialog) => dialog.accept());

    // Click the Revert button
    await page.getByRole('button', { name: 'Revert' }).click();

    // After revert, the page should reload and now show 3 revisions (timeline cards)
    await expect(page.getByText(/Revision #\d+/)).toHaveCount(3, {
      timeout: 10000,
    });

    // Verify via API that content has original title
    const afterResp = await apiGet(page, `/api/node/article/${nid}`);
    const afterBody = await afterResp.json();
    expect(afterBody.data.title).toBe('Revert UI Test Original');
  });
});
