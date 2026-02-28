import { test as base, expect, type Page } from '@playwright/test';

// Credentials used for test user
const TEST_USER = {
  name: 'admin',
  email: 'admin@test.com',
  password: 'DropJs2024Admin',
};

// Cached auth token for API calls within tests
let cachedToken: string | null = null;

async function getAuthToken(page: Page): Promise<string> {
  if (cachedToken) return cachedToken;

  // Register (ignore if exists) and login via API to get token
  await page.request.post('/api/auth/register', {
    data: {
      name: TEST_USER.name,
      email: TEST_USER.email,
      password: TEST_USER.password,
    },
  }).catch(() => {});

  const loginResp = await page.request.post('/api/auth/login', {
    data: { name: TEST_USER.name, password: TEST_USER.password },
  });
  const body = await loginResp.json();
  if (!body.data?.token) {
    throw new Error(
      `Login API failed (status ${loginResp.status()}): ${JSON.stringify(body)}`
    );
  }
  cachedToken = body.data.token;
  return cachedToken!;
}

export const test = base.extend<{
  authenticatedPage: Page;
  authToken: string;
}>({
  authToken: async ({ page }, use) => {
    const token = await getAuthToken(page);
    await use(token);
  },

  authenticatedPage: async ({ page }, use) => {
    // Get auth token via API
    const token = await getAuthToken(page);

    // Login via the UI - matches actual Login.tsx form structure
    await page.goto('/login');

    // Login.tsx uses <label>Username</label> and <label>Password</label>
    await page.getByLabel('Username').fill(TEST_USER.name);
    await page.getByLabel('Password').fill(TEST_USER.password);

    // Button text is "Log in" (see Login.tsx line 75)
    await page.getByRole('button', { name: 'Log in' }).click();

    // After login, navigates to / which renders Dashboard
    // Wait for the Dashboard heading to appear (more reliable than URL matching)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 });

    // Set extra HTTP headers for API requests made via page.request
    await page.request.storageState();

    await use(page);
  },
});

// Helper function for making authenticated API requests from tests
export async function apiPost(page: Page, url: string, data: unknown) {
  const token = await getAuthToken(page);
  return page.request.post(url, {
    data,
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function apiGet(page: Page, url: string) {
  const token = await getAuthToken(page);
  return page.request.get(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function apiPatch(page: Page, url: string, data: unknown) {
  const token = await getAuthToken(page);
  return page.request.patch(url, {
    data,
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function apiPut(page: Page, url: string, data: unknown) {
  const token = await getAuthToken(page);
  return page.request.put(url, {
    data,
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function apiDelete(page: Page, url: string) {
  const token = await getAuthToken(page);
  return page.request.delete(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export { expect };
export { TEST_USER };
