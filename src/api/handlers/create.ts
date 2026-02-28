import type { Request, Response } from '../types.js';
import { Entity, getEntityTypeDefinition } from '../../core/index.js';
import { checkEntityAccess } from '../../auth/index.js';
import { formatSingleResponse } from '../response.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../errors.js';

export async function handleCreate(
  req: Request,
  res: Response
): Promise<void> {
  const { entityType, bundle } = req.params;

  const definition = getEntityTypeDefinition(entityType, bundle);
  if (!definition) {
    throw new NotFoundError(`Unknown entity type: ${entityType}/${bundle}`);
  }

  const user = (req as any).user;

  // Check create access
  const allowed = await checkEntityAccess('create', {
    entityType,
    bundle,
    user,
  });
  if (!allowed) {
    throw new ForbiddenError('You do not have permission to create this content');
  }

  const values = req.body;
  if (!values || typeof values !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  // Set uid from authenticated user if available
  if (user?.uid) {
    values.uid = user.uid;
  }

  try {
    const entity = await Entity.create(entityType, bundle, values);
    res.status(201).json(formatSingleResponse(entity.toJSON()));
  } catch (err: any) {
    if (err.status === 422 && err.details) {
      throw new ValidationError('Validation failed', err.details);
    }
    throw err;
  }
}
