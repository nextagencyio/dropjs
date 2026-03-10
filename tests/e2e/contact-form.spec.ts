import { test, expect, apiPost, apiGet, apiDelete } from './fixtures';

test.describe('Contact Form API', () => {
  const testFormName = 'e2e_test_contact';

  test('should create a contact form', async ({ authenticatedPage: page }) => {
    // Clean up if exists from previous run
    await apiDelete(page, `/api/contact/forms/${testFormName}`).catch(() => {});

    const resp = await apiPost(page, '/api/contact/forms', {
      machine_name: testFormName,
      label: 'E2E Test Contact Form',
      description: 'A form for E2E testing',
      recipients: 'test@example.com',
      status: 1,
    });

    expect(resp.status()).toBe(201);
    const body = await resp.json();
    expect(body.data.machine_name).toBe(testFormName);
    expect(body.data.label).toBe('E2E Test Contact Form');
  });

  test('should list contact forms', async ({ authenticatedPage: page }) => {
    const resp = await apiGet(page, '/api/contact/forms');
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('should submit a contact message', async ({ authenticatedPage: page }) => {
    // Ensure form exists
    await apiDelete(page, `/api/contact/forms/${testFormName}`).catch(() => {});
    await apiPost(page, '/api/contact/forms', {
      machine_name: testFormName,
      label: 'Submit Test Form',
      status: 1,
    });

    const resp = await apiPost(page, `/api/contact/forms/${testFormName}/submit`, {
      name: 'Test User',
      email: 'test@example.com',
      subject: 'E2E Test Subject',
      message: 'This is an automated E2E test message.',
    });

    expect(resp.status()).toBe(201);
    const body = await resp.json();
    expect(body.data.name).toBe('Test User');
    expect(body.data.email).toBe('test@example.com');
    expect(body.data.subject).toBe('E2E Test Subject');
  });

  test('should reject submission with missing fields', async ({ authenticatedPage: page }) => {
    // Ensure form exists
    await apiDelete(page, `/api/contact/forms/${testFormName}`).catch(() => {});
    await apiPost(page, '/api/contact/forms', {
      machine_name: testFormName,
      label: 'Validation Test Form',
      status: 1,
    });

    const resp = await apiPost(page, `/api/contact/forms/${testFormName}/submit`, {
      name: 'Test User',
      // Missing email, subject, message
    });

    expect(resp.status()).toBe(400);
    const body = await resp.json();
    expect(body.error.message).toContain('required');
  });

  test('should reject submission to disabled form', async ({ authenticatedPage: page }) => {
    const disabledForm = 'e2e_disabled_form';
    await apiDelete(page, `/api/contact/forms/${disabledForm}`).catch(() => {});

    await apiPost(page, '/api/contact/forms', {
      machine_name: disabledForm,
      label: 'Disabled Form',
      status: false,
    });

    const resp = await apiPost(page, `/api/contact/forms/${disabledForm}/submit`, {
      name: 'Test',
      email: 'test@test.com',
      subject: 'Test',
      message: 'Test',
    });

    expect(resp.status()).toBe(400);
    const body = await resp.json();
    expect(body.error.message).toContain('disabled');
  });

  test('should list and read contact messages', async ({ authenticatedPage: page }) => {
    const resp = await apiGet(page, '/api/contact/messages');
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta).toBeDefined();
    expect(typeof body.meta.total).toBe('number');
  });

  test('should update contact message status', async ({ authenticatedPage: page }) => {
    // Create form and submit a message
    const formName = 'e2e_status_form';
    await apiDelete(page, `/api/contact/forms/${formName}`).catch(() => {});
    await apiPost(page, '/api/contact/forms', {
      machine_name: formName,
      label: 'Status Test Form',
      status: 1,
    });

    const submitResp = await apiPost(page, `/api/contact/forms/${formName}/submit`, {
      name: 'Status Test',
      email: 'status@test.com',
      subject: 'Status Test',
      message: 'Testing status update',
    });
    const submitBody = await submitResp.json();
    const messageId = submitBody.data.id;

    // Update status to 'read'
    const patchResp = await page.request.patch(`/api/contact/messages/${messageId}`, {
      data: { status: 'read' },
      headers: { Authorization: `Bearer ${await getToken(page)}` },
    });
    expect(patchResp.ok()).toBeTruthy();
    const patchBody = await patchResp.json();
    expect(patchBody.data.status).toBe('read');
  });

  test('should delete a contact form', async ({ authenticatedPage: page }) => {
    const formName = 'e2e_delete_form';
    await apiPost(page, '/api/contact/forms', {
      machine_name: formName,
      label: 'Delete Test Form',
      status: 1,
    }).catch(() => {});

    const resp = await apiDelete(page, `/api/contact/forms/${formName}`);
    expect(resp.status()).toBe(204);

    // Verify it's gone
    const getResp = await apiGet(page, `/api/contact/forms/${formName}`);
    expect(getResp.status()).toBe(404);
  });

  test('should reject submission to non-existent form', async ({ authenticatedPage: page }) => {
    const resp = await apiPost(page, '/api/contact/forms/nonexistent_form_xyz/submit', {
      name: 'Test',
      email: 'test@test.com',
      subject: 'Test',
      message: 'Test',
    });

    expect(resp.status()).toBe(404);
  });
});

// Helper to get auth token for direct request calls
async function getToken(page: any): Promise<string> {
  const resp = await page.request.post('/api/auth/login', {
    data: { name: 'admin', password: 'DropJs2024Admin' },
  });
  const body = await resp.json();
  return body.data.token;
}
