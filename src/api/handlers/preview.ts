import type { Request, Response } from '../types.js';
import {
  createPreview,
  loadPreview,
  deletePreview,
} from '../../core/index.js';
import { BadRequestError, NotFoundError } from '../errors.js';

/**
 * POST /api/preview
 * Create a content preview. Requires authentication.
 * Body: { entity_type, bundle, data }
 * Returns: { data: { id, url } }
 */
export async function handleCreatePreview(
  req: Request,
  res: Response
): Promise<void> {
  const { entity_type, bundle, data } = req.body;

  if (!entity_type || typeof entity_type !== 'string') {
    throw new BadRequestError('entity_type is required');
  }
  if (!bundle || typeof bundle !== 'string') {
    throw new BadRequestError('bundle is required');
  }
  if (!data || typeof data !== 'object') {
    throw new BadRequestError('data must be a JSON object');
  }

  const user = (req as any).user;
  const uid = user?.uid ?? 0;

  const id = await createPreview(entity_type, bundle, data, uid);

  res.status(201).json({
    data: {
      id,
      url: `/admin/preview/${id}`,
    },
  });
}

/**
 * GET /api/preview/:previewId
 * Get preview data. No authentication required (preview ID acts as token).
 * Returns the entity data as if it were a real entity.
 */
export async function handleGetPreview(
  req: Request,
  res: Response
): Promise<void> {
  const { previewId } = req.params;

  if (!previewId) {
    throw new BadRequestError('Preview ID is required');
  }

  const preview = await loadPreview(previewId);
  if (!preview) {
    throw new NotFoundError('Preview not found or has expired');
  }

  res.json({
    data: {
      id: preview.id,
      entity_type: preview.entity_type,
      bundle: preview.bundle,
      data: preview.data,
      uid: preview.uid,
      created: preview.created,
      expires: preview.expires,
    },
  });
}

/**
 * DELETE /api/preview/:previewId
 * Delete a preview. Requires authentication.
 */
export async function handleDeletePreview(
  req: Request,
  res: Response
): Promise<void> {
  const { previewId } = req.params;

  if (!previewId) {
    throw new BadRequestError('Preview ID is required');
  }

  const deleted = await deletePreview(previewId);
  if (!deleted) {
    throw new NotFoundError('Preview not found');
  }

  res.status(204).send();
}
