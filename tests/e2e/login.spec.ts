import { test, expect } from './fixtures';

test.describe('Login', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');

    // Login page renders an h1 "drop.js" and subtitle
    await expect(page.getByRole('heading', { name: 'drop.js' })).toBeVisible();
    await expect(page.getByText('Log in to your account')).toBeVisible();

    // Form elements should be visible
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill('wronguser');
    await page.getByLabel('Password').fill('wrongpass');
    await page.getByRole('button', { name: 'Log in' }).click();

    // Login.tsx shows error — wait for any error text to appear
    await expect(page.getByText(/invalid|failed|error/i)).toBeVisible({ timeout: 5000 });

    // Should still be on login page
    await expect(page).toHaveURL(/.*login/);
  });

  test('should login successfully', async ({ authenticatedPage: page }) => {
    // authenticatedPage fixture handles login
    await expect(page).toHaveURL(/.*\/$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // ProtectedRoute redirects to /login
    await page.goto('/');
    await expect(page).toHaveURL(/.*login/);
  });
});
