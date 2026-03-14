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

export async function loadRevisionsAction(
  entityType: string,
  bundle: string,
  id: number,
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('view content revisions');
  if (!auth.success) return auth;

  try {
    const { Entity } = await import('../../../core/entity');
    const entity = await Entity.load(entityType, id);
    if (!entity) return { success: false, error: 'Entity not found' };
    const revisions = await Entity.listRevisions(entityType, id);
    const current = entity.toJSON();
    return {
      success: true,
      data: {
        revisions,
        current_vid: current.vid ?? current.revision_id ?? revisions[0]?.vid,
      },
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function revertRevisionAction(
  entityType: string,
  bundle: string,
  id: number,
  vid: number,
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('revert content revisions');
  if (!auth.success) return auth;

  try {
    const { Entity } = await import('../../../core/entity');
    await Entity.revertToRevision(entityType, id, vid);
    const revisions = await Entity.listRevisions(entityType, id);
    const entity = await Entity.load(entityType, id);
    const current = entity?.toJSON();
    revalidatePath(`/content/revisions/node/${bundle}/${id}`);
    return {
      success: true,
      data: {
        revisions,
        current_vid: current?.vid ?? current?.revision_id ?? revisions[0]?.vid,
      },
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function loadRevisionDiffAction(
  entityType: string,
  bundle: string,
  id: number,
  fromVid: number,
  toVid: number,
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('view content revisions');
  if (!auth.success) return auth;

  try {
    const { Entity } = await import('../../../core/entity');
    const fromEntity = await Entity.loadRevision(entityType, id, fromVid);
    const toEntity = await Entity.loadRevision(entityType, id, toVid);
    if (!fromEntity || !toEntity) {
      return { success: false, error: 'One or both revisions not found' };
    }

    const fromData = fromEntity.toJSON();
    const toData = toEntity.toJSON();
    const changes: Array<{ field: string; old_value: unknown; new_value: unknown }> = [];

    const allKeys = new Set([...Object.keys(fromData), ...Object.keys(toData)]);
    for (const key of allKeys) {
      if (['vid', 'revision_id', 'revision_uid', 'revision_timestamp', 'changed'].includes(key)) continue;
      const oldVal = fromData[key];
      const newVal = toData[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ field: key, old_value: oldVal, new_value: newVal });
      }
    }

    return {
      success: true,
      data: { from_vid: fromVid, to_vid: toVid, changes },
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
