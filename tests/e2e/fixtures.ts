import { test as base, expect, type Page } from '@playwright/test';

// Credentials used for test user
const TEST_USER = {
  name: 'admin',
  email: 'admin@test.com',
  password: 'DropJs2024Admin',
};

// Fetch a CSRF token from the API (sets cookie + returns token for header)
async function getCsrfToken(page: Page): Promise<string> {
  const resp = await page.request.get('/api/csrf-token');
  const body = await resp.json();
  return body.csrfToken;
}

export const test = base.extend<{
  authenticatedPage: Page;
  authToken: string;
}>({
  authToken: async ({ page }, use) => {
    // With next-auth, auth is cookie-based. Log in via UI to set cookies,
    // then use the page's cookie jar for subsequent API requests.
    await page.goto('/login');
    await page.getByLabel('Username').fill(TEST_USER.name);
    await page.getByLabel('Password').fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 });
    // Return empty string — API calls use the session cookie automatically
    await use('cookie-auth');
  },

  authenticatedPage: async ({ page }, use) => {
    // Login via the UI using next-auth credentials provider
    await page.goto('/login');

    await page.getByLabel('Username').fill(TEST_USER.name);
    await page.getByLabel('Password').fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Log in' }).click();

    // After login, navigates to / which renders Dashboard
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 });

    await use(page);
  },
});

// Helper function for making authenticated API requests from tests
// With next-auth, the session cookie is automatically sent via page.request
// CSRF token is fetched and sent as X-CSRF-Token header for mutating requests
export async function apiPost(page: Page, url: string, data: unknown) {
  const csrfToken = await getCsrfToken(page);
  return page.request.post(url, {
    data,
    headers: { 'x-csrf-token': csrfToken },
  });
}

export async function apiGet(page: Page, url: string) {
  return page.request.get(url);
}

export async function apiPatch(page: Page, url: string, data: unknown) {
  const csrfToken = await getCsrfToken(page);
  return page.request.patch(url, {
    data,
    headers: { 'x-csrf-token': csrfToken },
  });
}

export async function apiPut(page: Page, url: string, data: unknown) {
  const csrfToken = await getCsrfToken(page);
  return page.request.put(url, {
    data,
    headers: { 'x-csrf-token': csrfToken },
  });
}

export async function apiDelete(page: Page, url: string) {
  const csrfToken = await getCsrfToken(page);
  return page.request.delete(url, {
    headers: { 'x-csrf-token': csrfToken },
  });
}

export { expect };
export { TEST_USER };
