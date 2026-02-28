import { test, expect } from './fixtures';

test.describe('User Login Redirect', () => {
  test('should redirect /user/login to /login', async ({ page }) => {
    await page.goto('/user/login');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should show the login form after redirect from /user/login', async ({ page }) => {
    await page.goto('/user/login');

    // Login form should be visible
    await expect(page.getByRole('heading', { name: 'drop.js' })).toBeVisible();
    await expect(page.getByText('Log in to your account')).toBeVisible();
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
  });

  test('should be able to log in after redirecting from /user/login', async ({ page }) => {
    await page.goto('/user/login');
    await expect(page).toHaveURL(/.*\/login/);

    // Fill in credentials and log in
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill('DropJs2024Admin');
    await page.getByRole('button', { name: 'Log in' }).click();

    // Should arrive at Dashboard
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/.*\/$/);
  });
});
