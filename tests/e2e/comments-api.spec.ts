import { test, expect, apiPost, apiGet, apiPatch, apiDelete } from './fixtures';

test.describe('Comments API', () => {
  let testNodeId: number;

  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Ensure content type exists
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: 'comment_test',
      label: 'Comment Test',
      description: 'Content type for comment testing',
    }).catch(() => {});

    // Create a node to attach comments to
    const nodeRes = await apiPost(page, '/api/node/comment_test', {
      title: 'Comment Host Node',
      status: true,
    });
    const nodeBody = await nodeRes.json();
    testNodeId = nodeBody.data?.nid;
  });

  test('should create a comment', async ({ authenticatedPage: page }) => {
    const res = await apiPost(page, '/api/comments', {
      entity_type: 'node',
      entity_id: testNodeId,
      subject: 'Test Comment',
    });
    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.data.cid).toBeTruthy();
    expect(body.data.entity_type).toBe('node');
    expect(body.data.entity_id).toBe(testNodeId);
    expect(body.data.subject).toBe('Test Comment');
  });

  test('should list comments for an entity', async ({ authenticatedPage: page }) => {
    // Create a couple of comments
    await apiPost(page, '/api/comments', {
      entity_type: 'node',
      entity_id: testNodeId,
      subject: 'First Comment',
    });
    await apiPost(page, '/api/comments', {
      entity_type: 'node',
      entity_id: testNodeId,
      subject: 'Second Comment',
    });

    const res = await apiGet(
      page,
      `/api/comments?entity_type=node&entity_id=${testNodeId}`
    );
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(2);
    expect(body.meta.total).toBeGreaterThanOrEqual(2);
  });

  test('should get a single comment', async ({ authenticatedPage: page }) => {
    const createRes = await apiPost(page, '/api/comments', {
      entity_type: 'node',
      entity_id: testNodeId,
      subject: 'Fetchable Comment',
    });
    const cid = (await createRes.json()).data.cid;

    const res = await apiGet(page, `/api/comments/${cid}`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data.cid).toBe(cid);
    expect(body.data.subject).toBe('Fetchable Comment');
  });

  test('should update a comment', async ({ authenticatedPage: page }) => {
    const createRes = await apiPost(page, '/api/comments', {
      entity_type: 'node',
      entity_id: testNodeId,
      subject: 'Before Update',
    });
    const cid = (await createRes.json()).data.cid;

    const patchRes = await apiPatch(page, `/api/comments/${cid}`, {
      subject: 'After Update',
    });
    expect(patchRes.status()).toBe(200);

    const body = await patchRes.json();
    expect(body.data.subject).toBe('After Update');
  });

  test('should delete a comment', async ({ authenticatedPage: page }) => {
    const createRes = await apiPost(page, '/api/comments', {
      entity_type: 'node',
      entity_id: testNodeId,
      subject: 'Doomed Comment',
    });
    const cid = (await createRes.json()).data.cid;

    const delRes = await apiDelete(page, `/api/comments/${cid}`);
    expect(delRes.status()).toBe(204);

    // Verify deleted
    const getRes = await apiGet(page, `/api/comments/${cid}`);
    expect(getRes.status()).toBe(404);
  });

  test('should require entity_type and entity_id for listing', async ({
    authenticatedPage: page,
  }) => {
    const res = await apiGet(page, '/api/comments');
    expect(res.status()).toBe(400);
  });

  test('should support threaded comments', async ({ authenticatedPage: page }) => {
    // Create parent comment
    const parentRes = await apiPost(page, '/api/comments', {
      entity_type: 'node',
      entity_id: testNodeId,
      subject: 'Parent Comment',
    });
    const parentCid = (await parentRes.json()).data.cid;

    // Create reply
    const replyRes = await apiPost(page, '/api/comments', {
      entity_type: 'node',
      entity_id: testNodeId,
      subject: 'Reply Comment',
      parent_cid: parentCid,
    });
    expect(replyRes.status()).toBe(201);

    const replyBody = await replyRes.json();
    expect(replyBody.data.parent_cid).toBe(parentCid);
  });
});
