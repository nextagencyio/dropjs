import type { Request, Response } from '../types.js';
import {
  createRedirect,
  updateRedirect,
  deleteRedirect,
  listRedirects,
} from '../../core/redirect.js';
import { BadRequestError, NotFoundError } from '../errors.js';

export async function handleListRedirects(
  req: Request,
  res: Response,
): Promise<void> {
  const limit = parseInt(req.query.limit as string, 10) || 50;
  const offset = parseInt(req.query.offset as string, 10) || 0;
  const search = req.query.search as string | undefined;

  const { redirects, total } = await listRedirects({ limit, offset, search });

  res.json({
    data: redirects,
    meta: { total, count: redirects.length, offset, limit },
  });
}

export async function handleCreateRedirect(
  req: Request,
  res: Response,
): Promise<void> {
  const { source_path, redirect_path, status_code, langcode } = req.body;

  if (!source_path || !redirect_path) {
    throw new BadRequestError('source_path and redirect_path are required');
  }

  if (status_code && ![301, 302, 303, 307, 308].includes(status_code)) {
    throw new BadRequestError('status_code must be one of: 301, 302, 303, 307, 308');
  }

  const redirect = await createRedirect(
    source_path,
    redirect_path,
    status_code ?? 301,
    langcode ?? 'en',
  );

  res.status(201).json({ data: redirect });
}

export async function handleUpdateRedirect(
  req: Request,
  res: Response,
): Promise<void> {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw new BadRequestError('Invalid redirect ID');
  }

  const { source_path, redirect_path, status_code, langcode, enabled } = req.body;

  await updateRedirect(id, {
    ...(source_path !== undefined && { source_path }),
    ...(redirect_path !== undefined && { redirect_path }),
    ...(status_code !== undefined && { status_code }),
    ...(langcode !== undefined && { langcode }),
    ...(enabled !== undefined && { enabled }),
  });

  res.json({ data: { id, message: 'Redirect updated' } });
}

export async function handleDeleteRedirect(
  req: Request,
  res: Response,
): Promise<void> {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw new BadRequestError('Invalid redirect ID');
  }

  await deleteRedirect(id);
  res.status(204).send();
}
