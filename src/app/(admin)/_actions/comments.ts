'use server';

import { revalidatePath } from 'next/cache';
import { ensureInitialized } from '../../../api/init';
import { getSessionUser } from '../../../lib/server/auth';
import { userHasPermission } from '../../../auth/access';

interface ActionResult {
  success: boolean;
  error?: string;
}

async function requirePerm(permission: string) {
  const user = await getSessionUser();
  if (!user) return { success: false as const, error: 'Authentication required' };
  const allowed = await userHasPermission(user, permission);
  if (!allowed) return { success: false as const, error: 'Access denied' };
  return { success: true as const, user };
}

export async function approveComment(cid: number): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer comments');
  if (!auth.success) return auth;

  try {
    const { updateComment } = await import('../../../core/comments');
    await updateComment(cid, { status: 1 });
    revalidatePath('/content/comments');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function unpublishComment(cid: number): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer comments');
  if (!auth.success) return auth;

  try {
    const { updateComment } = await import('../../../core/comments');
    await updateComment(cid, { status: 0 });
    revalidatePath('/content/comments');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteCommentAction(cid: number): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer comments');
  if (!auth.success) return auth;

  try {
    const { deleteComment } = await import('../../../core/comments');
    await deleteComment(cid);
    revalidatePath('/content/comments');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
