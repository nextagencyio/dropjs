import type { Request, Response } from '../types.js';
import { Entity } from '../../core/index.js';
import { checkEntityAccess } from '../../auth/index.js';
import { formatSingleResponse } from '../response.js';
import { NotFoundError, BadRequestError, ValidationError, ForbiddenError } from '../errors.js';

export async function handleUpdate(
  req: Request,
  res: Response
): Promise<void> {
  const { entityType, bundle, id } = req.params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) throw new BadRequestError('Invalid entity ID');

  const values = req.body;
  if (!values || typeof values !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const entity = await Entity.load(entityType, numId);
  if (!entity || entity.bundle !== bundle) {
    throw new NotFoundError(`${entityType}/${bundle}/${id} not found`);
  }

  // Check update access
  const user = (req as any).user;
  const allowed = await checkEntityAccess('update', {
    entityType,
    bundle,
    entity: entity.toJSON(),
    user,
  });
  if (!allowed) {
    throw new ForbiddenError('You do not have permission to edit this content');
  }

  // Apply updates, skipping immutable fields
  for (const [key, value] of Object.entries(values)) {
    if (key === 'nid' || key === 'uuid' || key === 'created') continue;
    if (key === 'title' || (key === 'name' && entityType === 'media')) {
      entity.title = value as string;
    } else if (key === 'status') {
      entity.status = Boolean(value);
    } else if (key === 'uid') {
      entity.uid = value as number;
    } else if (key === 'parent' || key === 'weight') {
      entity.set(key, value);
    } else {
      entity.set(key, value);
    }
  }

  try {
    await entity.save();
    res.json(formatSingleResponse(entity.toJSON()));
  } catch (err: any) {
    if (err.status === 422 && err.details) {
      throw new ValidationError('Validation failed', err.details);
    }
    throw err;
  }
}
