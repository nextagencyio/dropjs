'use server';

import { ensureInitialized } from '../../../api/init';
import { getSessionUser } from '../../../lib/server/auth';

interface ActionResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

export async function loadPreviewAction(previewId: string): Promise<ActionResult> {
  await ensureInitialized();
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'Authentication required' };

  try {
    const { loadPreview } = await import('../../../core/preview');
    const preview = await loadPreview(previewId);
    if (!preview) return { success: false, error: 'Preview not found or has expired' };
    return { success: true, data: preview };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function loadEntityTypesForPreviewAction(): Promise<ActionResult> {
  await ensureInitialized();
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'Authentication required' };

  try {
    const { getAllEntityTypes } = await import('../../../core/entity-type');
    const types = getAllEntityTypes();
    return { success: true, data: types };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
