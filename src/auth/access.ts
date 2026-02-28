import { db } from '../db/index.js';
import { serialize, unserialize } from 'php-serialize';
import type { UserData } from './user.js';

/**
 * Drupal role config entity structure.
 * Roles are stored in the `config` table as `user.role.{id}`.
 */
export interface RoleConfig {
  uuid?: string;
  id: string;
  label: string;
  weight: number;
  is_admin: boolean;
  permissions: string[];
}

function roleConfigName(roleId: string): string {
  return `user.role.${roleId}`;
}

/** Parse a config value that may be stored as raw JSON or PHP-serialized. */
function parseConfigData(raw: string | Buffer): unknown {
  const str = typeof raw === 'string' ? raw : raw.toString('utf8');
  try {
    return JSON.parse(str);
  } catch {
    return unserialize(str);
  }
}

async function loadRoleConfig(roleId: string): Promise<RoleConfig | null> {
  const rows = await db
    .select('config')
    .fields(['data'])
    .condition('collection', '')
    .condition('name', roleConfigName(roleId))
    .execute<{ data: string | Buffer }>();

  if (rows.length === 0) return null;

  return parseConfigData(rows[0].data) as RoleConfig;
}

async function saveRoleConfig(role: RoleConfig): Promise<void> {
  const name = roleConfigName(role.id);
  // Store as PHP-serialized with Drupal-required metadata for compat
  const fullConfig: Record<string, unknown> = {
    uuid: role.uuid ?? crypto.randomUUID(),
    langcode: 'en',
    status: true,
    ...role,
  };
  const data = Buffer.from(serialize(fullConfig));

  const existing = await db
    .select('config')
    .fields(['name'])
    .condition('collection', '')
    .condition('name', name)
    .execute();

  if (existing.length > 0) {
    await db
      .update('config')
      .set({ data })
      .condition('collection', '')
      .condition('name', name)
      .execute();
  } else {
    await db
      .insert('config')
      .values({ collection: '', name, data })
      .execute();
  }
}

export async function userHasPermission(
  user: UserData | null,
  permission: string
): Promise<boolean> {
  if (!user) {
    return roleHasPermission('anonymous', permission);
  }

  const roles = user.roles ?? ['authenticated'];
  for (const role of roles) {
    if (await roleHasPermission(role, permission)) return true;
  }
  return false;
}

export async function roleHasPermission(
  roleName: string,
  permission: string
): Promise<boolean> {
  const role = await loadRoleConfig(roleName);
  if (!role) return false;

  // Admin role bypasses all permission checks
  if (role.is_admin) return true;

  return role.permissions.some(
    (p) => p === '*' || p === permission
  );
}

export async function assignRolePermission(
  roleName: string,
  permission: string
): Promise<void> {
  const role = await loadRoleConfig(roleName);
  if (!role) {
    throw new Error(`Role "${roleName}" not found`);
  }

  if (!role.permissions.includes(permission)) {
    role.permissions.push(permission);
    await saveRoleConfig(role);
  }
}

export async function removeRolePermission(
  roleName: string,
  permission: string
): Promise<void> {
  const role = await loadRoleConfig(roleName);
  if (!role) return;

  role.permissions = role.permissions.filter((p) => p !== permission);
  await saveRoleConfig(role);
}

export async function createRole(
  name: string,
  label: string
): Promise<void> {
  const existing = await loadRoleConfig(name);
  if (existing) return;

  await saveRoleConfig({
    id: name,
    label,
    weight: 0,
    is_admin: false,
    permissions: [],
  });
}

export async function deleteRole(name: string): Promise<void> {
  const configName = roleConfigName(name);
  await db
    .delete('config')
    .condition('collection', '')
    .condition('name', configName)
    .execute();

  // Also remove user__roles references
  await db
    .delete('user__roles')
    .condition('roles_target_id', name)
    .execute();
}

export async function loadAllRoles(): Promise<RoleConfig[]> {
  const rows = await db
    .select('config')
    .fields(['name', 'data'])
    .condition('collection', '')
    .execute<{ name: string; data: string | Buffer }>();

  const roles: RoleConfig[] = [];
  for (const row of rows) {
    if (!row.name.startsWith('user.role.')) continue;
    roles.push(parseConfigData(row.data) as RoleConfig);
  }

  roles.sort((a, b) => a.weight - b.weight);
  return roles;
}

export async function loadRole(name: string): Promise<RoleConfig | null> {
  return loadRoleConfig(name);
}

export async function updateRolePermissions(
  roleName: string,
  permissions: string[]
): Promise<void> {
  const role = await loadRoleConfig(roleName);
  if (!role) {
    throw new Error(`Role "${roleName}" not found`);
  }

  role.permissions = permissions;
  await saveRoleConfig(role);
}

export async function seedDefaultRoles(): Promise<void> {
  // Anonymous
  const anon = await loadRoleConfig('anonymous');
  if (!anon) {
    await saveRoleConfig({
      id: 'anonymous',
      label: 'Anonymous user',
      weight: 0,
      is_admin: false,
      permissions: ['access content'],
    });
  }

  // Authenticated
  const auth = await loadRoleConfig('authenticated');
  if (!auth) {
    await saveRoleConfig({
      id: 'authenticated',
      label: 'Authenticated user',
      weight: 1,
      is_admin: false,
      permissions: [
        'access content',
        'create content',
        'edit own content',
        'delete own content',
        'view own unpublished content',
        'view revisions',
        'upload files',
      ],
    });
  }

  // Editor
  const editor = await loadRoleConfig('editor');
  if (!editor) {
    await saveRoleConfig({
      id: 'editor',
      label: 'Editor',
      weight: 2,
      is_admin: false,
      permissions: [
        'access content',
        'create content',
        'edit own content',
        'edit any content',
        'delete own content',
        'delete any content',
        'view own unpublished content',
        'view any unpublished content',
        'view revisions',
        'revert revisions',
        'upload files',
        'administer taxonomy',
      ],
    });
  }

  // Administrator — is_admin flag gives all permissions
  const admin = await loadRoleConfig('admin');
  if (!admin) {
    await saveRoleConfig({
      id: 'admin',
      label: 'Administrator',
      weight: 3,
      is_admin: true,
      permissions: [],
    });
  }
}
