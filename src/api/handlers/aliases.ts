import type { Request, Response } from '../types.js';
import {
  createAlias,
  deleteAlias,
  listAliases,
  resolveAlias,
} from '../../core/index.js';
import { BadRequestError, NotFoundError } from '../errors.js';

export async function handleCreateAlias(
  req: Request,
  res: Response
): Promise<void> {
  const { path, alias, langcode } = req.body;

  if (!path || !alias) {
    throw new BadRequestError('path and alias are required');
  }

  const result = await createAlias(
    path,
    alias,
    langcode ?? 'en'
  );

  res.status(201).json({ data: result });
}

export async function handleListAliases(
  req: Request,
  res: Response
): Promise<void> {
  const limit = parseInt(req.query.limit as string, 10) || 50;
  const offset = parseInt(req.query.offset as string, 10) || 0;

  const { aliases, total } = await listAliases({ limit, offset });

  res.json({
    data: aliases,
    meta: { total, count: aliases.length, offset, limit },
  });
}

export async function handleDeleteAlias(
  req: Request,
  res: Response
): Promise<void> {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw new BadRequestError('Invalid alias ID');
  }

  await deleteAlias(id);
  res.status(204).send();
}

export async function handleResolveAlias(
  req: Request,
  res: Response
): Promise<void> {
  const aliasPath = req.query.path as string;
  if (!aliasPath) {
    throw new BadRequestError('path query parameter is required');
  }

  const sourcePath = await resolveAlias(aliasPath);
  if (!sourcePath) {
    throw new NotFoundError('Alias not found');
  }

  res.json({ data: { path: sourcePath, alias: aliasPath } });
}
