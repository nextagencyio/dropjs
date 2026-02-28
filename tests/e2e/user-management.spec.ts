import { test, expect, apiPost, apiGet } from './fixtures';

test.describe('User Management', () => {
  test('should navigate to People page', async ({ authenticatedPage: page }) => {
    // Sidebar has "People" direct link
    await page.locator('nav').first().getByRole('link', { name: 'People' }).click();
    await expect(page).toHaveURL(/.*\/people/);

    // UserList.tsx renders <h1>People</h1>
    await expect(page.getByRole('heading', { name: 'People' })).toBeVisible();
  });

  test('should show admin user in list', async ({ authenticatedPage: page }) => {
    await page.goto('/people');

    await expect(page.getByRole('heading', { name: 'People' })).toBeVisible({ timeout: 10000 });

    // DataTable should show the admin user — use the Username column header to confirm the table loaded
    // then look for admin in the table rows
    await expect(page.getByRole('columnheader', { name: 'Username' })).toBeVisible({ timeout: 10000 });

    // The admin username appears as a button in the table
    await expect(page.locator('table button').filter({ hasText: 'admin' }).first()).toBeVisible();
  });

  test('should have Add user button', async ({ authenticatedPage: page }) => {
    await page.goto('/people');

    // UserList.tsx has "+ Add user" button
    const addButton = page.getByRole('button', { name: '+ Add user' });
    await expect(addButton).toBeVisible();
  });

  test('should open Create User modal', async ({ authenticatedPage: page }) => {
    await page.goto('/people');

    // Click "+ Add user" button to open modal
    await page.getByRole('button', { name: '+ Add user' }).click();

    // UserFormModal renders heading "Create User"
    await expect(page.getByRole('heading', { name: 'Create User' })).toBeVisible();

    // Form fields should be visible (labels have htmlFor ids)
    await expect(page.locator('#user-name')).toBeVisible();
    await expect(page.locator('#user-email')).toBeVisible();
    await expect(page.locator('#user-password')).toBeVisible();

    // Cancel and Create buttons
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create' })).toBeVisible();
  });

  test('should create a new user', async ({ authenticatedPage: page }) => {
    const username = `testuser_${Date.now()}`;
    await page.goto('/people');

    // Click "+ Add user"
    await page.getByRole('button', { name: '+ Add user' }).click();
    await expect(page.getByRole('heading', { name: 'Create User' })).toBeVisible();

    // Fill in the form
    await page.locator('#user-name').fill(username);
    await page.locator('#user-email').fill(`${username}@example.com`);
    await page.locator('#user-password').fill('testpass123');

    // Submit
    await page.getByRole('button', { name: 'Create' }).click();

    // Modal should close and user should appear in list
    await expect(page.getByRole('heading', { name: 'Create User' })).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('table button').filter({ hasText: username })).toBeVisible({ timeout: 10000 });
  });

  test('should open Edit User modal when clicking username', async ({ authenticatedPage: page }) => {
    await page.goto('/people');

    // Wait for user list table to load
    await expect(page.getByRole('columnheader', { name: 'Username' })).toBeVisible({ timeout: 10000 });

    // Click on the admin username button in the table to open edit modal
    await page.locator('table button').filter({ hasText: 'admin' }).first().click();

    // UserFormModal renders "Edit User" heading in edit mode
    await expect(page.getByRole('heading', { name: 'Edit User' })).toBeVisible();
  });

  test('should navigate to Roles page', async ({ authenticatedPage: page }) => {
    await page.goto('/people/roles');

    // RoleList.tsx renders <h1>Roles</h1>
    await expect(page.getByRole('heading', { name: 'Roles' })).toBeVisible({ timeout: 10000 });

    // Should show built-in roles in the table — look for the "Role" column header
    await expect(page.getByRole('columnheader', { name: 'Role' })).toBeVisible();
  });

  test('should have Add role button', async ({ authenticatedPage: page }) => {
    await page.goto('/people/roles');

    await expect(page.getByRole('heading', { name: 'Roles' })).toBeVisible({ timeout: 10000 });

    // RoleList.tsx has "+ Add role" button
    await expect(page.getByRole('button', { name: '+ Add role' })).toBeVisible();
  });

  test('should create a new role', async ({ authenticatedPage: page }) => {
    await page.goto('/people/roles');

    await expect(page.getByRole('heading', { name: 'Roles' })).toBeVisible({ timeout: 10000 });

    // Click "+ Add role"
    await page.getByRole('button', { name: '+ Add role' }).click();

    // Modal renders "Add Role" heading
    await expect(page.getByRole('heading', { name: 'Add Role' })).toBeVisible();

    // Fill in label and machine name
    await page.locator('#role-label').fill('Editor');
    await page.locator('#role-name').fill('editor');

    // Submit
    await page.getByRole('button', { name: 'Create' }).click();

    // Modal should close and role should appear in list
    await expect(page.getByRole('heading', { name: 'Add Role' })).not.toBeVisible({ timeout: 10000 });
    // Use exact match to avoid matching the machine name "editor" too
    await expect(page.getByText('Editor', { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to Permissions page for a role', async ({ authenticatedPage: page }) => {
    await page.goto('/people/roles');

    await expect(page.getByRole('heading', { name: 'Roles' })).toBeVisible({ timeout: 10000 });

    // Each role row has a "Permissions" link
    await page.getByRole('link', { name: 'Permissions' }).first().click();

    // RolePermissions.tsx renders "Permissions for {role}" heading
    await expect(page.getByRole('heading', { name: /Permissions for/ })).toBeVisible({ timeout: 10000 });
  });

  test('should display permissions table', async ({ authenticatedPage: page }) => {
    // Navigate to admin role permissions
    await page.goto('/people/roles/admin/permissions');

    await expect(page.getByRole('heading', { name: /Permissions for/ })).toBeVisible({ timeout: 10000 });

    // Should show "Permission" and "Granted" table headers
    await expect(page.getByRole('columnheader', { name: 'Permission' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Granted' })).toBeVisible();

    // Should have "Save permissions" button
    await expect(page.getByRole('button', { name: 'Save permissions' })).toBeVisible();

    // Should show "All permissions (superadmin)" option
    await expect(page.getByText('All permissions (superadmin)')).toBeVisible();
  });

  test('should have Roles breadcrumb link on permissions page', async ({ authenticatedPage: page }) => {
    await page.goto('/people/roles/admin/permissions');

    await expect(page.getByRole('heading', { name: /Permissions for/ })).toBeVisible({ timeout: 10000 });

    // RolePermissions.tsx has a "Roles" breadcrumb link
    await expect(page.getByRole('main').getByRole('link', { name: 'Roles' })).toBeVisible();
  });
});
