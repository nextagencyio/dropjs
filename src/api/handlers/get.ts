import type { Request, Response } from '../types.js';
import { Entity, getEntityTypeDefinition } from '../../core/index.js';
import { checkEntityAccess } from '../../auth/index.js';
import { parseQueryParams } from '../query-parser.js';
import { formatSingleResponse } from '../response.js';
import { expandReferences } from '../include.js';
import { NotFoundError, BadRequestError } from '../errors.js';

export async function handleGet(
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

  // Entity-level access check (handles published/unpublished, own content, etc.)
  const user = (req as any).user;
  const allowed = await checkEntityAccess('view', {
    entityType,
    bundle,
    entity: entity.toJSON(),
    user,
  });
  if (!allowed) {
    throw new NotFoundError(`${entityType}/${bundle}/${id} not found`);
  }

  const parsed = parseQueryParams(req.query as Record<string, unknown>);
  let data = entity.toJSON();

  if (parsed.fields?.length) {
    const result: Record<string, unknown> = {
      nid: data.nid,
      uuid: data.uuid,
      type: data.type,
    };
    for (const field of parsed.fields) {
      if (field in data) result[field] = data[field];
    }
    data = result;
  }

  if (parsed.include?.length) {
    const expanded = await expandReferences(
      entityType,
      bundle,
      [data],
      parsed.include
    );
    data = expanded[0];
  }

  res.json(formatSingleResponse(data));
}
