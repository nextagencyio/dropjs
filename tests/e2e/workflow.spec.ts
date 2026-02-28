import { test, expect, apiPost, apiGet, apiDelete } from './fixtures';

test.describe('Workflow CRUD API', () => {
  test('should list workflows', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, '/api/workflows');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('should create a workflow', async ({ authenticatedPage: page }) => {
    const workflow = {
      id: 'test_crud_create',
      label: 'Test CRUD Create',
      states: {
        draft: { id: 'draft', label: 'Draft', weight: 0, published: false },
        published: { id: 'published', label: 'Published', weight: 10, published: true },
      },
      transitions: {
        publish: {
          id: 'publish',
          label: 'Publish',
          from: ['draft'],
          to: 'published',
        },
      },
      entity_types: [],
    };

    const res = await apiPost(page, '/api/workflows', workflow);
    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.data.id).toBe('test_crud_create');
    expect(body.data.label).toBe('Test CRUD Create');
    expect(body.data.states.draft).toBeDefined();
    expect(body.data.states.published).toBeDefined();
    expect(body.data.transitions.publish).toBeDefined();

    // Cleanup
    await apiDelete(page, '/api/workflows/test_crud_create');
  });

  test('should get a specific workflow', async ({ authenticatedPage: page }) => {
    // Create a workflow first
    await apiPost(page, '/api/workflows', {
      id: 'test_crud_get',
      label: 'Test CRUD Get',
      states: {
        draft: { id: 'draft', label: 'Draft', weight: 0, published: false },
      },
      transitions: {},
      entity_types: [],
    });

    const res = await apiGet(page, '/api/workflows/test_crud_get');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data.id).toBe('test_crud_get');
    expect(body.data.label).toBe('Test CRUD Get');
    expect(body.data.states.draft).toBeDefined();

    // Cleanup
    await apiDelete(page, '/api/workflows/test_crud_get');
  });

  test('should return 404 for non-existent workflow', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, '/api/workflows/nonexistent_workflow_xyz');
    expect(res.status()).toBe(404);
  });

  test('should delete a workflow', async ({ authenticatedPage: page }) => {
    // Create a workflow to delete
    await apiPost(page, '/api/workflows', {
      id: 'test_crud_delete',
      label: 'Test CRUD Delete',
      states: {},
      transitions: {},
      entity_types: [],
    });

    const delRes = await apiDelete(page, '/api/workflows/test_crud_delete');
    expect(delRes.status()).toBe(204);

    // Verify it no longer exists
    const getRes = await apiGet(page, '/api/workflows/test_crud_delete');
    expect(getRes.status()).toBe(404);
  });

  test('should return 404 when deleting non-existent workflow', async ({ authenticatedPage: page }) => {
    const res = await apiDelete(page, '/api/workflows/nonexistent_delete_xyz');
    expect(res.status()).toBe(404);
  });

  test('should reject workflow creation without id', async ({ authenticatedPage: page }) => {
    const res = await apiPost(page, '/api/workflows', {
      label: 'Missing ID',
      states: {},
      transitions: {},
      entity_types: [],
    });
    expect(res.status()).toBe(400);
  });

  test('should reject workflow creation without label', async ({ authenticatedPage: page }) => {
    const res = await apiPost(page, '/api/workflows', {
      id: 'test_no_label',
      states: {},
      transitions: {},
      entity_types: [],
    });
    expect(res.status()).toBe(400);
  });

  test('should reject duplicate workflow creation', async ({ authenticatedPage: page }) => {
    await apiPost(page, '/api/workflows', {
      id: 'test_crud_dup',
      label: 'Test Duplicate',
      states: {},
      transitions: {},
      entity_types: [],
    });

    const res = await apiPost(page, '/api/workflows', {
      id: 'test_crud_dup',
      label: 'Test Duplicate Again',
      states: {},
      transitions: {},
      entity_types: [],
    });
    expect(res.status()).toBe(400);

    // Cleanup
    await apiDelete(page, '/api/workflows/test_crud_dup');
  });

  test('should list workflows including newly created one', async ({ authenticatedPage: page }) => {
    await apiPost(page, '/api/workflows', {
      id: 'test_crud_list',
      label: 'Test CRUD List',
      states: {},
      transitions: {},
      entity_types: [],
    });

    const res = await apiGet(page, '/api/workflows');
    expect(res.status()).toBe(200);

    const body = await res.json();
    const ids = body.data.map((w: any) => w.id);
    expect(ids).toContain('test_crud_list');

    // Cleanup
    await apiDelete(page, '/api/workflows/test_crud_list');
  });
});

test.describe('Workflow Transitions API', () => {
  const WORKFLOW_ID = 'test_transitions';

  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Ensure the test workflow exists
    await apiPost(page, '/api/workflows', {
      id: WORKFLOW_ID,
      label: 'Test Transitions Workflow',
      states: {
        draft: { id: 'draft', label: 'Draft', weight: 0, published: false },
        review: { id: 'review', label: 'In Review', weight: 5, published: false },
        published: { id: 'published', label: 'Published', weight: 10, published: true },
      },
      transitions: {
        submit_for_review: {
          id: 'submit_for_review',
          label: 'Submit for Review',
          from: ['draft'],
          to: 'review',
        },
        publish: {
          id: 'publish',
          label: 'Publish',
          from: ['review', 'draft'],
          to: 'published',
        },
        unpublish: {
          id: 'unpublish',
          label: 'Unpublish',
          from: ['published'],
          to: 'draft',
        },
      },
      entity_types: [],
    }).catch(() => {}); // Ignore if already exists
  });

  test.afterEach(async ({ authenticatedPage: page }) => {
    await apiDelete(page, `/api/workflows/${WORKFLOW_ID}`).catch(() => {});
  });

  test('should get available transitions from draft state', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, `/api/workflows/${WORKFLOW_ID}/transitions/draft`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);

    const transitionIds = body.data.map((t: any) => t.id);
    expect(transitionIds).toContain('submit_for_review');
    expect(transitionIds).toContain('publish');
    // unpublish should NOT be available from draft
    expect(transitionIds).not.toContain('unpublish');
  });

  test('should get available transitions from review state', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, `/api/workflows/${WORKFLOW_ID}/transitions/review`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    const transitionIds = body.data.map((t: any) => t.id);
    // Only 'publish' allows from: ['review', 'draft']
    expect(transitionIds).toContain('publish');
    // submit_for_review only from: ['draft']
    expect(transitionIds).not.toContain('submit_for_review');
  });

  test('should get available transitions from published state', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, `/api/workflows/${WORKFLOW_ID}/transitions/published`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    const transitionIds = body.data.map((t: any) => t.id);
    expect(transitionIds).toContain('unpublish');
    // publish and submit_for_review should not be available from published
    expect(transitionIds).not.toContain('publish');
    expect(transitionIds).not.toContain('submit_for_review');
  });

  test('should return empty transitions for unknown state', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, `/api/workflows/${WORKFLOW_ID}/transitions/unknown_state`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    // No transitions explicitly list 'unknown_state' in their from arrays
    // But transitions with from: [] (empty) would match any state - none here
    expect(body.data.length).toBe(0);
  });

  test('should return 404 for transitions on non-existent workflow', async ({ authenticatedPage: page }) => {
    const res = await apiGet(page, '/api/workflows/nonexistent_xyz/transitions/draft');
    expect(res.status()).toBe(404);
  });
});

test.describe('Content Moderation API', () => {
  const WORKFLOW_ID = 'test_moderation';
  const BUNDLE = 'wf_test_article';

  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Ensure content type exists
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: BUNDLE,
      label: 'Workflow Test Article',
    }).catch(() => {});

    // Create the workflow assigned to node:wf_test_article
    await apiPost(page, '/api/workflows', {
      id: WORKFLOW_ID,
      label: 'Test Moderation Workflow',
      states: {
        draft: { id: 'draft', label: 'Draft', weight: 0, published: false },
        review: { id: 'review', label: 'In Review', weight: 5, published: false },
        published: { id: 'published', label: 'Published', weight: 10, published: true },
      },
      transitions: {
        submit_for_review: {
          id: 'submit_for_review',
          label: 'Submit for Review',
          from: ['draft'],
          to: 'review',
        },
        publish: {
          id: 'publish',
          label: 'Publish',
          from: ['review', 'draft'],
          to: 'published',
        },
        unpublish: {
          id: 'unpublish',
          label: 'Unpublish',
          from: ['published'],
          to: 'draft',
        },
      },
      entity_types: [`node:${BUNDLE}`],
    }).catch(() => {}); // Ignore if already exists
  });

  test.afterEach(async ({ authenticatedPage: page }) => {
    await apiDelete(page, `/api/workflows/${WORKFLOW_ID}`).catch(() => {});
  });

  test('should apply a transition to an entity', async ({ authenticatedPage: page }) => {
    // Create an article
    const createRes = await apiPost(page, `/api/node/${BUNDLE}`, {
      title: 'Moderation Transition Test',
      status: false,
    });
    expect(createRes.status()).toBe(201);
    const article = (await createRes.json()).data;
    const nid = article.nid;

    // Apply submit_for_review transition (draft -> review)
    const modRes = await apiPost(page, `/api/node/${BUNDLE}/${nid}/moderation`, {
      transition: 'submit_for_review',
    });
    expect(modRes.status()).toBe(200);

    const modBody = await modRes.json();
    expect(modBody.data).toBeDefined();
    expect(modBody.data.moderation_state).toBe('review');

    // Cleanup
    await apiDelete(page, `/api/node/${BUNDLE}/${nid}`);
  });

  test('should get moderation history for an entity', async ({ authenticatedPage: page }) => {
    // Create an article
    const createRes = await apiPost(page, `/api/node/${BUNDLE}`, {
      title: 'Moderation History Test',
      status: false,
    });
    const article = (await createRes.json()).data;
    const nid = article.nid;

    // Apply a transition to generate history
    await apiPost(page, `/api/node/${BUNDLE}/${nid}/moderation`, {
      transition: 'submit_for_review',
    });

    // Get moderation history
    const histRes = await apiGet(page, `/api/node/${BUNDLE}/${nid}/moderation`);
    expect(histRes.status()).toBe(200);

    const histBody = await histRes.json();
    expect(Array.isArray(histBody.data)).toBe(true);
    expect(histBody.data.length).toBeGreaterThanOrEqual(1);

    const lastEntry = histBody.data[histBody.data.length - 1];
    expect(lastEntry.from_state).toBe('draft');
    expect(lastEntry.to_state).toBe('review');
    expect(lastEntry.transition).toBe('submit_for_review');
    expect(lastEntry.timestamp).toBeDefined();

    // Cleanup
    await apiDelete(page, `/api/node/${BUNDLE}/${nid}`);
  });

  test('should reject invalid transition from current state', async ({ authenticatedPage: page }) => {
    // Create an article (starts in draft state)
    const createRes = await apiPost(page, `/api/node/${BUNDLE}`, {
      title: 'Invalid Transition Test',
      status: false,
    });
    const article = (await createRes.json()).data;
    const nid = article.nid;

    // Try to apply 'unpublish' from draft (only allowed from published)
    const modRes = await apiPost(page, `/api/node/${BUNDLE}/${nid}/moderation`, {
      transition: 'unpublish',
    });
    expect(modRes.status()).toBe(400);

    // Cleanup
    await apiDelete(page, `/api/node/${BUNDLE}/${nid}`);
  });

  test('should reject transition without transition field', async ({ authenticatedPage: page }) => {
    const createRes = await apiPost(page, `/api/node/${BUNDLE}`, {
      title: 'Missing Transition Field Test',
      status: false,
    });
    const article = (await createRes.json()).data;
    const nid = article.nid;

    const modRes = await apiPost(page, `/api/node/${BUNDLE}/${nid}/moderation`, {});
    expect(modRes.status()).toBe(400);

    // Cleanup
    await apiDelete(page, `/api/node/${BUNDLE}/${nid}`);
  });

  test('should return moderation history for entity with no transitions', async ({ authenticatedPage: page }) => {
    // Create an article and immediately check history (should be empty)
    const createRes = await apiPost(page, `/api/node/${BUNDLE}`, {
      title: 'Empty History Test',
      status: false,
    });
    const article = (await createRes.json()).data;
    const nid = article.nid;

    const histRes = await apiGet(page, `/api/node/${BUNDLE}/${nid}/moderation`);
    expect(histRes.status()).toBe(200);

    const histBody = await histRes.json();
    expect(Array.isArray(histBody.data)).toBe(true);
    expect(histBody.data.length).toBe(0);

    // Cleanup
    await apiDelete(page, `/api/node/${BUNDLE}/${nid}`);
  });
});

test.describe('Full Workflow Lifecycle', () => {
  const WORKFLOW_ID = 'test_lifecycle';
  const BUNDLE = 'wf_lifecycle_article';

  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Ensure content type exists
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: BUNDLE,
      label: 'Workflow Lifecycle Article',
    }).catch(() => {});

    // Create workflow with full editorial states
    await apiPost(page, '/api/workflows', {
      id: WORKFLOW_ID,
      label: 'Lifecycle Test Workflow',
      states: {
        draft: { id: 'draft', label: 'Draft', weight: 0, published: false },
        review: { id: 'review', label: 'In Review', weight: 5, published: false },
        published: { id: 'published', label: 'Published', weight: 10, published: true },
      },
      transitions: {
        submit_for_review: {
          id: 'submit_for_review',
          label: 'Submit for Review',
          from: ['draft'],
          to: 'review',
        },
        publish: {
          id: 'publish',
          label: 'Publish',
          from: ['review'],
          to: 'published',
        },
        unpublish: {
          id: 'unpublish',
          label: 'Unpublish',
          from: ['published'],
          to: 'draft',
        },
      },
      entity_types: [`node:${BUNDLE}`],
    }).catch(() => {});
  });

  test.afterEach(async ({ authenticatedPage: page }) => {
    await apiDelete(page, `/api/workflows/${WORKFLOW_ID}`).catch(() => {});
  });

  test('should complete full draft -> review -> publish lifecycle', async ({ authenticatedPage: page }) => {
    // Step 1: Create an article (starts as draft, unpublished)
    const createRes = await apiPost(page, `/api/node/${BUNDLE}`, {
      title: 'Lifecycle Article',
      status: false,
    });
    expect(createRes.status()).toBe(201);
    const article = (await createRes.json()).data;
    const nid = article.nid;

    // Step 2: Verify initial state — no moderation history yet
    const hist0Res = await apiGet(page, `/api/node/${BUNDLE}/${nid}/moderation`);
    expect(hist0Res.status()).toBe(200);
    const hist0 = (await hist0Res.json()).data;
    expect(hist0.length).toBe(0);

    // Step 3: Apply draft -> review transition
    const reviewRes = await apiPost(page, `/api/node/${BUNDLE}/${nid}/moderation`, {
      transition: 'submit_for_review',
    });
    expect(reviewRes.status()).toBe(200);

    const reviewBody = await reviewRes.json();
    expect(reviewBody.data.moderation_state).toBe('review');
    // Content should still be unpublished in review state
    expect(reviewBody.data.status).toBeFalsy();

    // Step 4: Verify available transitions from review
    const transRes = await apiGet(page, `/api/workflows/${WORKFLOW_ID}/transitions/review`);
    expect(transRes.status()).toBe(200);
    const availableTransitions = (await transRes.json()).data;
    const transIds = availableTransitions.map((t: any) => t.id);
    expect(transIds).toContain('publish');
    expect(transIds).not.toContain('submit_for_review');

    // Step 5: Apply review -> publish transition
    const publishRes = await apiPost(page, `/api/node/${BUNDLE}/${nid}/moderation`, {
      transition: 'publish',
    });
    expect(publishRes.status()).toBe(200);

    const publishBody = await publishRes.json();
    expect(publishBody.data.moderation_state).toBe('published');
    // Content should now be published
    expect(publishBody.data.status).toBeTruthy();

    // Step 6: Verify the entity is actually published via GET
    const getRes = await apiGet(page, `/api/node/${BUNDLE}/${nid}`);
    expect(getRes.status()).toBe(200);
    const entityBody = await getRes.json();
    expect(entityBody.data.status).toBeTruthy();

    // Step 7: Verify full moderation history
    const histRes = await apiGet(page, `/api/node/${BUNDLE}/${nid}/moderation`);
    expect(histRes.status()).toBe(200);
    const history = (await histRes.json()).data;
    expect(history.length).toBe(2);

    // First transition: draft -> review
    expect(history[0].from_state).toBe('draft');
    expect(history[0].to_state).toBe('review');
    expect(history[0].transition).toBe('submit_for_review');
    expect(history[0].timestamp).toBeDefined();

    // Second transition: review -> published
    expect(history[1].from_state).toBe('review');
    expect(history[1].to_state).toBe('published');
    expect(history[1].transition).toBe('publish');
    expect(history[1].timestamp).toBeDefined();

    // Timestamps should be in order
    expect(history[1].timestamp).toBeGreaterThanOrEqual(history[0].timestamp);

    // Cleanup
    await apiDelete(page, `/api/node/${BUNDLE}/${nid}`);
  });

  test('should complete full lifecycle including unpublish', async ({ authenticatedPage: page }) => {
    // Create article
    const createRes = await apiPost(page, `/api/node/${BUNDLE}`, {
      title: 'Full Lifecycle Unpublish',
      status: false,
    });
    const article = (await createRes.json()).data;
    const nid = article.nid;

    // draft -> review
    await apiPost(page, `/api/node/${BUNDLE}/${nid}/moderation`, {
      transition: 'submit_for_review',
    });

    // review -> published
    await apiPost(page, `/api/node/${BUNDLE}/${nid}/moderation`, {
      transition: 'publish',
    });

    // Verify published
    const pubGet = await apiGet(page, `/api/node/${BUNDLE}/${nid}`);
    expect((await pubGet.json()).data.status).toBeTruthy();

    // published -> draft (unpublish)
    const unpubRes = await apiPost(page, `/api/node/${BUNDLE}/${nid}/moderation`, {
      transition: 'unpublish',
    });
    expect(unpubRes.status()).toBe(200);

    const unpubBody = await unpubRes.json();
    expect(unpubBody.data.moderation_state).toBe('draft');
    expect(unpubBody.data.status).toBeFalsy();

    // Verify entity is unpublished
    const draftGet = await apiGet(page, `/api/node/${BUNDLE}/${nid}`);
    expect((await draftGet.json()).data.status).toBeFalsy();

    // Verify full history has 3 entries
    const histRes = await apiGet(page, `/api/node/${BUNDLE}/${nid}/moderation`);
    const history = (await histRes.json()).data;
    expect(history.length).toBe(3);

    expect(history[0].transition).toBe('submit_for_review');
    expect(history[1].transition).toBe('publish');
    expect(history[2].transition).toBe('unpublish');
    expect(history[2].from_state).toBe('published');
    expect(history[2].to_state).toBe('draft');

    // Cleanup
    await apiDelete(page, `/api/node/${BUNDLE}/${nid}`);
  });
});
