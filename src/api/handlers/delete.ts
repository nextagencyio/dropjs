import type { Request, Response } from '../types.js';
import { Entity } from '../../core/index.js';
import { checkEntityAccess } from '../../auth/index.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../errors.js';

export async function handleDelete(
  req: Request,
  res: Response
): Promise<void> {
  const { entityType, bundle, id } = req.params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) throw new BadRequestError('Invalid entity ID');

  const entity = await Entity.load(entityType, numId);
  if (!entity || entity.bundle !== bundle) {
    throw new NotFoundError(`${entityType}/${bundle}/${id} not found`);
  }

  // Check delete access
  const user = (req as any).user;
  const allowed = await checkEntityAccess('delete', {
    entityType,
    bundle,
    entity: entity.toJSON(),
    user,
  });
  if (!allowed) {
    throw new ForbiddenError('You do not have permission to delete this content');
  }

  await Entity.delete(entityType, numId);
  res.status(204).send();
}
