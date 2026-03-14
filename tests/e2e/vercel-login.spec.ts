import { test, expect } from '@playwright/test';

const BASE = 'https://dropjs.vercel.app';

test('front page works', async ({ request }) => {
  const resp = await request.get(`${BASE}/front`, { timeout: 30000 });
  console.log('Front page status:', resp.status());
  expect(resp.status()).toBe(200);
});

test('login page loads', async ({ page }) => {
  await page.goto(`${BASE}/login`, { timeout: 30000 });
  await expect(page.locator('h1')).toContainText('drop.js');
  await expect(page.locator('#username')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
});

test('login with credentials via next-auth', async ({ page }) => {
  await page.goto(`${BASE}/login`, { timeout: 30000 });

  await page.fill('#username', 'admin');
  await page.fill('#password', 'DropJs2024Admin');

  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('/api/auth') || url.includes('/login')) {
      console.log(`Response: ${response.status()} ${url}`);
    }
  });

  await page.click('button[type="submit"]');

  // Should redirect to dashboard after login
  await page.waitForURL('**/', { timeout: 30000 }).catch(() => {});
  console.log('After login URL:', page.url());

  // Should not be on login page anymore
  expect(page.url()).not.toContain('/login');

  await page.screenshot({ path: 'tests/e2e/vercel-dashboard.png' });
});

test('login and access admin page', async ({ page }) => {
  // Login first
  await page.goto(`${BASE}/login`, { timeout: 30000 });
  await page.fill('#username', 'admin');
  await page.fill('#password', 'DropJs2024Admin');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/', { timeout: 30000 }).catch(() => {});

  // Navigate to reports/status which is a lighter admin page
  await page.goto(`${BASE}/reports/status`, { timeout: 60000 });
  console.log('Reports page URL:', page.url());
  await page.screenshot({ path: 'tests/e2e/vercel-admin.png' });

  // Should have admin toolbar with user name
  await expect(page.locator('body')).toContainText('admin');
  // Should still be on reports page (not redirected to login)
  expect(page.url()).toContain('/reports/status');
});
