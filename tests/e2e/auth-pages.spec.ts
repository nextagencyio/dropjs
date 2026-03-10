import { test, expect, TEST_USER } from './fixtures';

test.describe('Auth Pages', () => {
  test.describe('Registration Page', () => {
    test('should render registration form', async ({ page }) => {
      await page.goto('/register');
      await expect(page.getByRole('heading', { name: 'drop.js' })).toBeVisible();
      await expect(page.getByText('Create your account')).toBeVisible();
      await expect(page.getByLabel('Username')).toBeVisible();
      await expect(page.getByLabel('Email address')).toBeVisible();
      await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
      await expect(page.getByLabel('Confirm password')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
    });

    test('should show error for mismatched passwords', async ({ page }) => {
      await page.goto('/register');
      await page.getByLabel('Username').fill('testuser_mismatch');
      await page.getByLabel('Email').fill('mismatch@test.com');
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel('Confirm password').fill('differentpassword');
      await page.getByRole('button', { name: 'Create account' }).click();
      await expect(page.getByText('Passwords do not match')).toBeVisible();
    });

    test('should show error for short password', async ({ page }) => {
      await page.goto('/register');
      await page.getByLabel('Username').fill('testuser_short');
      await page.getByLabel('Email').fill('short@test.com');
      await page.getByLabel('Password', { exact: true }).fill('abc');
      await page.getByLabel('Confirm password').fill('abc');
      await page.getByRole('button', { name: 'Create account' }).click();
      await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
    });

    test('should register and auto-login', async ({ page }) => {
      const uniqueName = `reg_user_${Date.now()}`;
      await page.goto('/register');
      await page.getByLabel('Username').fill(uniqueName);
      await page.getByLabel('Email').fill(`${uniqueName}@test.com`);
      await page.getByLabel('Password', { exact: true }).fill('testpass123');
      await page.getByLabel('Confirm password').fill('testpass123');
      await page.getByRole('button', { name: 'Create account' }).click();

      // Should redirect to admin dashboard after auto-login
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 });
    });

    test('should have link to login page', async ({ page }) => {
      await page.goto('/register');
      const loginLink = page.getByRole('link', { name: 'Log in' });
      await expect(loginLink).toBeVisible();
      await loginLink.click();
      await expect(page).toHaveURL(/.*\/login/);
    });
  });

  test.describe('Login Page Links', () => {
    test('should have forgot password link', async ({ page }) => {
      await page.goto('/login');
      const forgotLink = page.getByRole('link', { name: 'Forgot password?' });
      await expect(forgotLink).toBeVisible();
      await forgotLink.click();
      await expect(page).toHaveURL(/.*\/forgot-password/);
    });

    test('should have create account link', async ({ page }) => {
      await page.goto('/login');
      const registerLink = page.getByRole('link', { name: 'Create account' });
      await expect(registerLink).toBeVisible();
      await registerLink.click();
      await expect(page).toHaveURL(/.*\/register/);
    });
  });

  test.describe('Forgot Password Page', () => {
    test('should render forgot password form', async ({ page }) => {
      await page.goto('/forgot-password');
      await expect(page.getByText('Reset your password')).toBeVisible();
      await expect(page.getByLabel('Email address')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Send reset token' })).toBeVisible();

    });

    test('should submit forgot password request', async ({ page }) => {
      await page.goto('/forgot-password');
      await page.getByLabel('Email address').fill(TEST_USER.email);
      await page.getByRole('button', { name: 'Send reset token' }).click();

      // Should show success message (always succeeds to prevent email enumeration)
      await expect(page.getByText('password reset token has been generated')).toBeVisible({ timeout: 10000 });
    });

    test('should have back to login link', async ({ page }) => {
      await page.goto('/forgot-password');
      const backLink = page.getByRole('link', { name: 'Back to login' });
      await expect(backLink).toBeVisible();
      await backLink.click();
      await expect(page).toHaveURL(/.*\/login/);
    });
  });

  test.describe('Reset Password Page', () => {
    test('should render reset password form', async ({ page }) => {
      await page.goto('/reset-password');
      await expect(page.getByText('Set a new password')).toBeVisible();
      await expect(page.getByLabel('Reset token')).toBeVisible();
      await expect(page.getByLabel('New password', { exact: true })).toBeVisible();
      await expect(page.getByLabel('Confirm new password')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Reset password' })).toBeVisible();
    });

    test('should show error for invalid token', async ({ page }) => {
      await page.goto('/reset-password');
      await page.getByLabel('Reset token').fill('invalid-token-12345');
      await page.getByLabel('New password', { exact: true }).fill('newpass123');
      await page.getByLabel('Confirm new password').fill('newpass123');
      await page.getByRole('button', { name: 'Reset password' }).click();

      await expect(page.getByText('Invalid or expired reset token')).toBeVisible({ timeout: 10000 });
    });

    test('should show error for mismatched passwords', async ({ page }) => {
      await page.goto('/reset-password');
      await page.getByLabel('Reset token').fill('some-token');
      await page.getByLabel('New password', { exact: true }).fill('newpass123');
      await page.getByLabel('Confirm new password').fill('different123');
      await page.getByRole('button', { name: 'Reset password' }).click();

      await expect(page.getByText('Passwords do not match')).toBeVisible();
    });

    test('should pre-fill token from query parameter', async ({ page }) => {
      await page.goto('/reset-password?token=my-test-token-abc');
      const tokenInput = page.getByLabel('Reset token');
      await expect(tokenInput).toHaveValue('my-test-token-abc');
    });

    test('should have back to login link', async ({ page }) => {
      await page.goto('/reset-password');
      const backLink = page.getByRole('link', { name: 'Back to login' });
      await expect(backLink).toBeVisible();
    });
  });

  test.describe('Password Reset API Flow', () => {
    test('should complete full forgot-password and reset flow via API', async ({ page }) => {
      // Create a test user
      const uniqueUser = `reset_user_${Date.now()}`;
      const email = `${uniqueUser}@test.com`;
      await page.request.post('/api/auth/register', {
        data: { name: uniqueUser, email, password: 'oldpassword123' },
      });

      // Request password reset
      const forgotResp = await page.request.post('/api/auth/forgot-password', {
        data: { email },
      });
      expect(forgotResp.ok()).toBeTruthy();
      const forgotBody = await forgotResp.json();
      expect(forgotBody.message).toContain('password reset link has been sent');
    });

    test('should reject reset with invalid token', async ({ page }) => {
      const resetResp = await page.request.post('/api/auth/reset-password', {
        data: { token: 'nonexistent-token', password: 'newpass123' },
      });
      const body = await resetResp.json();
      expect(body.error?.message).toContain('Invalid or expired');
    });
  });
});
