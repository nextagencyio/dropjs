import { test, expect } from './fixtures';

test.describe('Admin Toolbar', () => {
  test('should display sidebar after login', async ({ authenticatedPage: page }) => {
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible({ timeout: 10000 });
    await expect(nav.getByRole('link', { name: /drop\.js/ })).toBeVisible({ timeout: 5000 });
  });

  test('should have main navigation links', async ({ authenticatedPage: page }) => {
    const nav = page.locator('nav').first();

    await expect(nav.getByRole('link', { name: 'Content' })).toBeVisible({ timeout: 10000 });
    await expect(nav.getByRole('link', { name: 'Structure' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Appearance' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Extend' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Configuration' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'People' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Reports' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Help' })).toBeVisible();
  });

  test('should navigate to content list', async ({ authenticatedPage: page }) => {
    await page.locator('nav').first().getByRole('link', { name: 'Content' }).click();
    await expect(page).toHaveURL(/.*\/content/);
  });

  test('should navigate to Structure page', async ({ authenticatedPage: page }) => {
    await page.locator('nav').first().getByRole('link', { name: 'Structure' }).click();
    await expect(page).toHaveURL(/.*\/structure/);
  });

  test('should navigate to Appearance page', async ({ authenticatedPage: page }) => {
    await page.locator('nav').first().getByRole('link', { name: 'Appearance' }).click();
    await expect(page).toHaveURL(/.*\/appearance/);
    await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to Extend page', async ({ authenticatedPage: page }) => {
    await page.locator('nav').first().getByRole('link', { name: 'Extend' }).click();
    await expect(page).toHaveURL(/.*\/extend/);
    await expect(page.getByRole('heading', { name: 'Extend' })).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to Configuration page', async ({ authenticatedPage: page }) => {
    await page.locator('nav').first().getByRole('link', { name: 'Configuration' }).click();
    await expect(page).toHaveURL(/.*\/config/);
    await expect(page.getByRole('heading', { name: 'Configuration' })).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to People page', async ({ authenticatedPage: page }) => {
    await page.locator('nav').first().getByRole('link', { name: 'People' }).click();
    await expect(page).toHaveURL(/.*\/people/);
    await expect(page.getByRole('heading', { name: 'People' })).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to Reports page', async ({ authenticatedPage: page }) => {
    await page.locator('nav').first().getByRole('link', { name: 'Reports' }).click();
    await expect(page).toHaveURL(/.*\/reports/);
    await expect(page.getByRole('heading', { name: 'Reports', exact: true }).first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to Help page', async ({ authenticatedPage: page }) => {
    await page.locator('nav').first().getByRole('link', { name: 'Help' }).click();
    await expect(page).toHaveURL(/.*\/help/);
    await expect(page.getByRole('heading', { name: 'Help', exact: true }).first()).toBeVisible({ timeout: 10000 });
  });

  test('should show logged-in username and log out button', async ({ authenticatedPage: page }) => {
    // Dashboard shows "Welcome back, admin." text
    await expect(page.getByText('Welcome back, admin.')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
  });
});
