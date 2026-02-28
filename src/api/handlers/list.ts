import type { Request, Response } from '../types.js';
import { Entity, getEntityTypeDefinition } from '../../core/index.js';
import { parseQueryParams } from '../query-parser.js';
import { formatListResponse } from '../response.js';
import { expandReferences } from '../include.js';
import { NotFoundError } from '../errors.js';

function applyFieldset(
  data: Record<string, unknown>,
  fields?: string[]
): Record<string, unknown> {
  if (!fields?.length) return data;
  const result: Record<string, unknown> = {
    nid: data.nid,
    uuid: data.uuid,
    type: data.type,
  };
  for (const field of fields) {
    if (field in data) result[field] = data[field];
  }
  return result;
}

export async function handleList(
  req: Request,
  res: Response
): Promise<void> {
  const { entityType, bundle } = req.params;

  const definition = getEntityTypeDefinition(entityType, bundle);
  if (!definition) {
    throw new NotFoundError(`Unknown entity type: ${entityType}/${bundle}`);
  }

  const parsed = parseQueryParams(req.query as Record<string, unknown>);

  // Build query for total count
  let countQuery = Entity.query(entityType).condition('type', bundle);
  let listQuery = Entity.query(entityType).condition('type', bundle);

  // Anonymous users (no authenticated user) only see published content
  const user = (req as any).user;
  if (!user) {
    countQuery = countQuery.condition('status', 1);
    listQuery = listQuery.condition('status', 1);
  }

  for (const filter of parsed.filters) {
    countQuery = countQuery.condition(
      filter.field,
      filter.value,
      filter.operator as any
    );
    listQuery = listQuery.condition(
      filter.field,
      filter.value,
      filter.operator as any
    );
  }

  for (const sort of parsed.sorts) {
    listQuery = listQuery.sort(sort.field, sort.direction);
  }

  // Get total count
  const allIds = await countQuery.execute();
  const total = allIds.length;

  // Apply pagination
  listQuery = listQuery.range(parsed.page.offset, parsed.page.limit);
  const ids = await listQuery.execute();
  const entities = await Entity.loadMultiple(entityType, ids);

  let data = entities.map((e) => applyFieldset(e.toJSON(), parsed.fields));

  // Expand references
  if (parsed.include?.length) {
    data = await expandReferences(entityType, bundle, data, parsed.include);
  }

  const protocol = (req as any).protocol ?? 'http';
  const baseUrl = `${protocol}://${req.get('host')}${req.path}`;
  res.json(
    formatListResponse(
      data,
      total,
      parsed.page.offset,
      parsed.page.limit,
      baseUrl
    )
  );
}
