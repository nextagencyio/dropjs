import { test, expect, apiPost, apiGet, apiPut, apiDelete } from './fixtures';

test.describe('Validation API', () => {
  // Ensure a content type exists before tests
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: 'val_test',
      label: 'Validation Test',
      description: 'Content type for validation testing',
    }).catch(() => {});
  });

  test('should set constraints on a field', async ({ authenticatedPage: page }) => {
    const res = await apiPut(page, '/api/constraints/node/val_test/title', {
      constraints: [
        { type: 'required', message: 'Title is required' },
        { type: 'min_length', message: 'Title must be at least 3 characters', options: { min: 3 } },
      ],
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data.entityType).toBe('node');
    expect(body.data.bundle).toBe('val_test');
    expect(body.data.fieldName).toBe('title');
    expect(body.data.constraints).toHaveLength(2);
    expect(body.data.constraints[0].type).toBe('required');
    expect(body.data.constraints[1].type).toBe('min_length');
  });

  test('should get constraints for an entity type/bundle', async ({ authenticatedPage: page }) => {
    // Set constraints first
    await apiPut(page, '/api/constraints/node/val_test/title', {
      constraints: [
        { type: 'required', message: 'Title is required' },
      ],
    });

    const res = await apiGet(page, '/api/constraints/node/val_test');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data).toBeTruthy();
    expect(body.data.title).toBeTruthy();
    expect(body.data.title).toHaveLength(1);
    expect(body.data.title[0].type).toBe('required');
  });

  test('should validate data and return valid result', async ({ authenticatedPage: page }) => {
    // Set a required constraint on title
    await apiPut(page, '/api/constraints/node/val_test/title', {
      constraints: [
        { type: 'required', message: 'Title is required' },
      ],
    });

    // Validate with valid data
    const res = await apiPost(page, '/api/validate/node/val_test', {
      title: 'A Valid Title',
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data.valid).toBe(true);
    expect(body.data.errors).toHaveLength(0);
  });

  test('should validate data and return errors for invalid data', async ({ authenticatedPage: page }) => {
    // Set constraints
    await apiPut(page, '/api/constraints/node/val_test/title', {
      constraints: [
        { type: 'required', message: 'Title is required' },
        { type: 'min_length', message: 'Title must be at least 5 characters', options: { min: 5 } },
      ],
    });

    // Validate with missing title
    const res1 = await apiPost(page, '/api/validate/node/val_test', {});
    expect(res1.status()).toBe(200);

    const body1 = await res1.json();
    expect(body1.data.valid).toBe(false);
    expect(body1.data.errors.length).toBeGreaterThanOrEqual(1);
    expect(body1.data.errors[0].field).toBe('title');
    expect(body1.data.errors[0].constraint).toBe('required');

    // Validate with short title
    const res2 = await apiPost(page, '/api/validate/node/val_test', {
      title: 'Hi',
    });
    expect(res2.status()).toBe(200);

    const body2 = await res2.json();
    expect(body2.data.valid).toBe(false);
    expect(body2.data.errors.some((e: any) => e.constraint === 'min_length')).toBe(true);
  });

  test('should validate max_length constraint', async ({ authenticatedPage: page }) => {
    await apiPut(page, '/api/constraints/node/val_test/title', {
      constraints: [
        { type: 'max_length', message: 'Title must be at most 10 characters', options: { max: 10 } },
      ],
    });

    // Valid: short title
    const res1 = await apiPost(page, '/api/validate/node/val_test', {
      title: 'Short',
    });
    const body1 = await res1.json();
    expect(body1.data.valid).toBe(true);

    // Invalid: long title
    const res2 = await apiPost(page, '/api/validate/node/val_test', {
      title: 'This title is way too long for the constraint',
    });
    const body2 = await res2.json();
    expect(body2.data.valid).toBe(false);
    expect(body2.data.errors[0].constraint).toBe('max_length');
  });

  test('should validate pattern constraint', async ({ authenticatedPage: page }) => {
    await apiPut(page, '/api/constraints/node/val_test/title', {
      constraints: [
        { type: 'pattern', message: 'Title must start with a capital letter', options: { pattern: '^[A-Z]' } },
      ],
    });

    // Valid: starts with capital
    const res1 = await apiPost(page, '/api/validate/node/val_test', {
      title: 'Hello World',
    });
    const body1 = await res1.json();
    expect(body1.data.valid).toBe(true);

    // Invalid: starts with lowercase
    const res2 = await apiPost(page, '/api/validate/node/val_test', {
      title: 'hello world',
    });
    const body2 = await res2.json();
    expect(body2.data.valid).toBe(false);
    expect(body2.data.errors[0].constraint).toBe('pattern');
  });

  test('should reject entity creation when constraints are violated', async ({ authenticatedPage: page }) => {
    // Set a required + min_length constraint on title
    await apiPut(page, '/api/constraints/node/val_test/title', {
      constraints: [
        { type: 'required', message: 'Title is required' },
        { type: 'min_length', message: 'Title must be at least 5 characters', options: { min: 5 } },
      ],
    });

    // Attempt to create entity with empty title — should fail
    const res = await apiPost(page, '/api/node/val_test', {
      title: '',
      status: true,
    });

    // The entity:presave hook should cause a 422 error
    expect(res.status()).toBe(422);

    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('should remove constraints for a field', async ({ authenticatedPage: page }) => {
    // Set constraints
    await apiPut(page, '/api/constraints/node/val_test/title', {
      constraints: [
        { type: 'required', message: 'Title is required' },
      ],
    });

    // Verify they exist
    const getRes = await apiGet(page, '/api/constraints/node/val_test');
    const getBefore = await getRes.json();
    expect(getBefore.data.title).toBeTruthy();

    // Delete constraints
    const delRes = await apiDelete(page, '/api/constraints/node/val_test/title');
    expect(delRes.status()).toBe(204);

    // Verify they are gone
    const getRes2 = await apiGet(page, '/api/constraints/node/val_test');
    const getAfter = await getRes2.json();
    expect(getAfter.data.title).toBeUndefined();
  });

  test('should return 404 when deleting non-existent constraints', async ({ authenticatedPage: page }) => {
    const res = await apiDelete(page, '/api/constraints/node/val_test/nonexistent_field');
    expect(res.status()).toBe(404);
  });

  test('should reject invalid constraint types in PUT', async ({ authenticatedPage: page }) => {
    const res = await apiPut(page, '/api/constraints/node/val_test/title', {
      constraints: [
        { type: 'invalid_type', message: 'Bad constraint' },
      ],
    });
    expect(res.status()).toBe(400);
  });

  test('should allow entity creation after constraints are removed', async ({ authenticatedPage: page }) => {
    // Set constraints
    await apiPut(page, '/api/constraints/node/val_test/title', {
      constraints: [
        { type: 'required', message: 'Title is required' },
        { type: 'min_length', message: 'Title must be at least 100 characters', options: { min: 100 } },
      ],
    });

    // Attempt to create — should fail
    const failRes = await apiPost(page, '/api/node/val_test', {
      title: 'Short',
      status: true,
    });
    expect(failRes.status()).toBe(422);

    // Remove constraints
    await apiDelete(page, '/api/constraints/node/val_test/title');

    // Now create should succeed
    const successRes = await apiPost(page, '/api/node/val_test', {
      title: 'Short',
      status: true,
    });
    expect(successRes.status()).toBe(201);

    const body = await successRes.json();
    expect(body.data.title).toBe('Short');
  });
});
