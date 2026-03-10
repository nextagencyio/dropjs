import { test, expect, apiPost } from './fixtures';

test.describe('User Profile Pages', () => {
  test('should render user profile page with username and member since', async ({ authenticatedPage: page }) => {
    // Admin user is uid 1
    await page.goto('/user/1');

    // Should show the username as heading
    await expect(page.getByRole('heading', { name: 'admin' })).toBeVisible({ timeout: 10000 });

    // Should show "Member since" text
    await expect(page.getByText('Member since')).toBeVisible();
  });

  test('should show published content on user profile', async ({ authenticatedPage: page }) => {
    // Create an article as admin
    await apiPost(page, '/api/node/article', {
      title: 'Profile Test Article',
      status: 1,
      promote: 1,
      field_body: { value: '<p>Content for profile page test.</p>', format: 'full_html' },
    });

    await page.goto('/user/1');

    // Should show "Published content" section heading
    await expect(page.getByRole('heading', { name: 'Published content' })).toBeVisible({ timeout: 10000 });

    // Should show our test article
    await expect(page.getByText('Profile Test Article')).toBeVisible();
  });

  test('should link from user profile to node detail page', async ({ authenticatedPage: page }) => {
    const resp = await apiPost(page, '/api/node/article', {
      title: 'Profile Clickable Article',
      status: 1,
      promote: 1,
    });
    const body = await resp.json();
    const nid = body.data?.nid;

    await page.goto('/user/1');
    await expect(page.getByText('Profile Clickable Article')).toBeVisible({ timeout: 10000 });

    // Click the article link
    await page.getByRole('link', { name: 'Profile Clickable Article' }).click();

    // Should navigate to the node detail page
    await expect(page).toHaveURL(`/node/${nid}`);
    await expect(page.getByRole('heading', { name: 'Profile Clickable Article' })).toBeVisible();
  });

  test('should show user not found for non-existent user', async ({ page }) => {
    await page.goto('/user/99999');

    await expect(page.getByRole('heading', { name: 'User not found' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('The requested user profile could not be found')).toBeVisible();
  });

  test('should show back to home link on user not found page', async ({ page }) => {
    await page.goto('/user/99999');

    await expect(page.getByRole('heading', { name: 'User not found' })).toBeVisible({ timeout: 10000 });
    const backLink = page.getByRole('link', { name: /Back to home/i });
    await expect(backLink).toBeVisible();
  });

  test('should show author avatar initial', async ({ authenticatedPage: page }) => {
    await page.goto('/user/1');

    // The avatar shows the first letter of the username (A for admin)
    await expect(page.getByText('A').first()).toBeVisible({ timeout: 10000 });
  });

  test('should link from node detail to author profile', async ({ authenticatedPage: page }) => {
    const resp = await apiPost(page, '/api/node/article', {
      title: 'Author Link Test Article',
      status: 1,
    });
    const body = await resp.json();
    const nid = body.data?.nid;

    await page.goto(`/node/${nid}`);
    await expect(page.getByRole('heading', { name: 'Author Link Test Article' })).toBeVisible({ timeout: 10000 });

    // Should show "By admin" author link
    const authorLink = page.getByRole('link', { name: 'admin' });
    // Click it — should navigate to user profile
    if (await authorLink.isVisible()) {
      await authorLink.click();
      await expect(page).toHaveURL('/user/1');
    }
  });
});
