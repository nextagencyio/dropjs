import { test, expect } from './fixtures';

test.describe('Auth Pages', () => {
  test('should show forgot password page', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: 'Reset password' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send reset link' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to login' })).toBeVisible();
  });

  test('should show registration page', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Already have an account/ })).toBeVisible();
  });

  test('should show reset password page with invalid token message', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.getByRole('heading', { name: 'Invalid reset link' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: 'Request a new reset link' })).toBeVisible();
  });

  test('should show reset password form when token is present', async ({ page }) => {
    await page.goto('/reset-password?token=fake-token');
    await expect(page.getByRole('heading', { name: 'Set new password' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel('New password')).toBeVisible();
    await expect(page.getByLabel('Confirm password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset password' })).toBeVisible();
  });

  test('login page should have forgot password and register links', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('link', { name: 'Forgot password?' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: 'Create account' })).toBeVisible();
  });

  test('should submit forgot password form', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByLabel('Email address')).toBeVisible({ timeout: 10000 });
    await page.getByLabel('Email address').fill('nonexistent@test.com');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    // Should show success message even for non-existent email (security)
    await expect(page.getByText('reset link has been sent')).toBeVisible({ timeout: 10000 });
  });

  test('should show error on reset password with invalid token', async ({ page }) => {
    await page.goto('/reset-password?token=invalid-token');
    await expect(page.getByRole('heading', { name: 'Set new password' })).toBeVisible({ timeout: 10000 });
    await page.getByLabel('New password').fill('newpassword123');
    await page.getByLabel('Confirm password').fill('newpassword123');
    await page.getByRole('button', { name: 'Reset password' }).click();
    await expect(page.getByText('Invalid or expired reset link')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Available Updates Report', () => {
  test('should show available updates page', async ({ authenticatedPage: page }) => {
    await page.goto('/reports/updates');
    await expect(page.getByRole('heading', { name: 'Available updates' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('drop.js (core)')).toBeVisible();
    await expect(page.getByText('Next.js')).toBeVisible();
    await expect(page.getByText('Node.js')).toBeVisible();
  });

  test('should link from reports index to available updates', async ({ authenticatedPage: page }) => {
    await page.goto('/reports');
    const link = page.getByRole('link', { name: 'Available updates' });
    await expect(link).toBeVisible({ timeout: 10000 });
    await link.click();
    await expect(page).toHaveURL(/.*\/reports\/updates/);
    await expect(page.getByRole('heading', { name: 'Available updates' })).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Audit Log Filtering', () => {
  test('should show filter controls on audit log page', async ({ authenticatedPage: page }) => {
    await page.goto('/reports/audit-log');
    await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel('Action')).toBeVisible();
    await expect(page.getByLabel('Entity type')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Filter' })).toBeVisible();
  });

  test('should filter audit log by action', async ({ authenticatedPage: page }) => {
    await page.goto('/reports/audit-log?action=insert');
    await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible({ timeout: 10000 });
    // Should show Clear button when filters are active
    await expect(page.getByRole('link', { name: 'Clear' })).toBeVisible();
  });
});
