'use server';

import { revalidatePath } from 'next/cache';
import { ensureInitialized } from '../../../api/init';
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

export async function loadLayoutTypesAction(): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer content types');
  if (!auth.success) return auth;

  try {
    const { getLayoutTypes } = await import('../../../core/layout-builder');
    const types = getLayoutTypes();
    return { success: true, data: types };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function loadLayoutAction(
  entityType: string,
  bundle: string,
  viewMode: string,
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer content types');
  if (!auth.success) return auth;

  try {
    const { loadLayout } = await import('../../../core/layout-builder');
    const layout = await loadLayout(entityType, bundle, viewMode);
    return { success: true, data: layout ?? null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function addLayoutSectionAction(
  entityType: string,
  bundle: string,
  viewMode: string,
  data: { type: string; weight: number; settings?: Record<string, unknown> },
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer content types');
  if (!auth.success) return auth;

  try {
    const { addSection } = await import('../../../core/layout-builder');
    const layout = await addSection(entityType, bundle, viewMode, { settings: {}, ...data });
    revalidatePath('/config/layout-builder');
    return { success: true, data: layout };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function removeLayoutSectionAction(
  entityType: string,
  bundle: string,
  viewMode: string,
  sectionId: string,
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer content types');
  if (!auth.success) return auth;

  try {
    const { removeSection } = await import('../../../core/layout-builder');
    const layout = await removeSection(entityType, bundle, viewMode, sectionId);
    revalidatePath('/config/layout-builder');
    return { success: true, data: layout };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function addLayoutComponentAction(
  entityType: string,
  bundle: string,
  viewMode: string,
  sectionId: string,
  data: { type: string; region: string; weight: number; configuration?: Record<string, unknown> },
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer content types');
  if (!auth.success) return auth;

  try {
    const { addComponent } = await import('../../../core/layout-builder');
    const layout = await addComponent(entityType, bundle, viewMode, sectionId, { configuration: {}, ...data });
    revalidatePath('/config/layout-builder');
    return { success: true, data: layout };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function removeLayoutComponentAction(
  entityType: string,
  bundle: string,
  viewMode: string,
  sectionId: string,
  componentId: string,
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer content types');
  if (!auth.success) return auth;

  try {
    const { removeComponent } = await import('../../../core/layout-builder');
    const layout = await removeComponent(entityType, bundle, viewMode, sectionId, componentId);
    revalidatePath('/config/layout-builder');
    return { success: true, data: layout };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function loadEntityTypesAction(): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer content types');
  if (!auth.success) return auth;

  try {
    const { getAllEntityTypes } = await import('../../../core/entity-type');
    const types = getAllEntityTypes();
    return { success: true, data: types };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
