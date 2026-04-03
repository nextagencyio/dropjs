import { test, expect } from './fixtures';

test.describe('User Profile Edit', () => {
  test('should show edit profile page', async ({ authenticatedPage: page }) => {
    await page.goto('/user/edit');
    await expect(page.getByRole('heading', { name: 'Edit profile' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  test('should display current user info', async ({ authenticatedPage: page }) => {
    await page.goto('/user/edit');
    await expect(page.getByRole('heading', { name: 'Edit profile' })).toBeVisible({ timeout: 10000 });
    // Should show UID in user info card
    await expect(page.getByText('UID: 1')).toBeVisible();
  });

  test('should show password change fields', async ({ authenticatedPage: page }) => {
    await page.goto('/user/edit');
    await expect(page.getByRole('heading', { name: 'Change password' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#current-password')).toBeVisible();
    await expect(page.locator('#new-password')).toBeVisible();
    await expect(page.locator('#confirm-password')).toBeVisible();
  });

  test('should have edit profile link in toolbar', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Edit profile' })).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Comments Admin', () => {
  test('should show comments admin page', async ({ authenticatedPage: page }) => {
    await page.goto('/content/comments');
    await expect(page.getByRole('heading', { name: 'Comments' })).toBeVisible({ timeout: 10000 });
    // Should show status tabs
    await expect(page.getByRole('link', { name: /All/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Published/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Unapproved/ })).toBeVisible();
  });

  test('should filter comments by published status', async ({ authenticatedPage: page }) => {
    await page.goto('/content/comments?status=1');
    await expect(page.getByRole('heading', { name: 'Comments' })).toBeVisible({ timeout: 10000 });
  });

  test('should show comments link in content nav', async ({ authenticatedPage: page }) => {
    await page.goto('/content');
    await expect(page.getByRole('heading', { name: 'Content' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: 'Comments' })).toBeVisible();
  });

  test('should show comments in content dropdown', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    const contentButton = page.locator('nav').getByText('Content');
    await contentButton.hover();
    await expect(page.getByRole('link', { name: 'Comments' })).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Manage Display', () => {
  test('should show manage display tab on fields page', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/article/fields');
    await expect(page.getByText('Manage fields')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: 'Manage display' })).toBeVisible();
  });

  test('should load manage display page', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/article/display');
    await expect(page.getByRole('heading', { name: 'Manage display' })).toBeVisible({ timeout: 10000 });
    // Should show view mode tabs
    await expect(page.getByRole('link', { name: 'Default' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Full content' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Teaser' })).toBeVisible();
  });

  test('should show fields in display configuration', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/article/display');
    await expect(page.getByRole('heading', { name: 'Manage display' })).toBeVisible({ timeout: 10000 });
    // Should have the visible fields table
    await expect(page.getByRole('columnheader', { name: 'Field' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Label' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Formatter' })).toBeVisible();
  });

  test('should navigate between fields and display tabs', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/article/fields');
    await expect(page.getByRole('link', { name: 'Manage display' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('link', { name: 'Manage display' }).click();
    await expect(page).toHaveURL(/.*\/display/);
    await expect(page.getByRole('heading', { name: 'Manage display' })).toBeVisible({ timeout: 10000 });
  });

  test('should switch between view modes', async ({ authenticatedPage: page }) => {
    await page.goto('/structure/types/node/article/display');
    await expect(page.getByRole('heading', { name: 'Manage display' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('link', { name: 'Teaser' }).click();
    await expect(page).toHaveURL(/mode=teaser/);
  });
});
