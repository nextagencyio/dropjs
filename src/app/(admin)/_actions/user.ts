'use server';

import { revalidatePath } from 'next/cache';
import { ensureInitialized } from '../../../api/init';
import {
  createUser as coreCreateUser,
  updateUser as coreUpdateUser,
  deleteUser as coreDeleteUser,
  type UserCreateInput,
} from '../../../auth/user';
import {
  createRole as coreCreateRole,
  deleteRole as coreDeleteRole,
  updateRolePermissions as coreUpdateRolePermissions,
} from '../../../auth/access';
import { getSessionUser } from '../../../lib/server/auth';
import { userHasPermission } from '../../../auth/access';

interface ActionResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

async function requirePerm(permission: string) {
  const user = await getSessionUser();
  if (!user) return { success: false as const, error: 'Authentication required' };
  const allowed = await userHasPermission(user, permission);
  if (!allowed) return { success: false as const, error: 'Access denied' };
  return { success: true as const, user };
}

export async function createUser(input: UserCreateInput): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer users');
  if (!auth.success) return auth;

  try {
    const user = await coreCreateUser(input);
    revalidatePath('/people');
    return { success: true, data: user };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateUser(
  uid: number,
  changes: Partial<UserCreateInput>,
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer users');
  if (!auth.success) return auth;

  try {
    await coreUpdateUser(uid, changes);
    revalidatePath('/people');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteUser(uid: number): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer users');
  if (!auth.success) return auth;

  try {
    await coreDeleteUser(uid);
    revalidatePath('/people');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function createRole(name: string, label: string): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer permissions');
  if (!auth.success) return auth;

  try {
    await coreCreateRole(name, label);
    revalidatePath('/people/roles');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteRole(name: string): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer permissions');
  if (!auth.success) return auth;

  try {
    await coreDeleteRole(name);
    revalidatePath('/people/roles');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateRolePermissions(
  roleName: string,
  permissions: string[],
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer permissions');
  if (!auth.success) return auth;

  try {
    await coreUpdateRolePermissions(roleName, permissions);
    revalidatePath(`/people/roles/${roleName}/permissions`);
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
