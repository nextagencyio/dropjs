import type { Request, Response } from '../types.js';
import {
  listShortcuts,
  addShortcut,
  updateShortcut,
  deleteShortcut,
  reorderShortcuts,
  listShortcutSets,
} from '../../core/index.js';
import { BadRequestError, NotFoundError } from '../errors.js';

/**
 * GET /api/shortcuts
 * List shortcuts for the authenticated user.
 */
export async function handleListShortcuts(
  req: Request,
  res: Response,
): Promise<void> {
  const user = (req as any).user;
  const uid: number = user?.uid ?? 0;

  const shortcuts = await listShortcuts(uid);
  res.json({ data: shortcuts });
}

/**
 * POST /api/shortcuts
 * Add a new shortcut for the authenticated user. Requires title and path.
 */
export async function handleAddShortcut(
  req: Request,
  res: Response,
): Promise<void> {
  const user = (req as any).user;
  const uid: number = user?.uid ?? 0;

  const { title, path, weight } = req.body;

  if (!title || typeof title !== 'string') {
    throw new BadRequestError('title is required and must be a string');
  }
  if (!path || typeof path !== 'string') {
    throw new BadRequestError('path is required and must be a string');
  }

  const shortcut = await addShortcut(uid, title, path, weight ?? 0);
  res.status(201).json({ data: shortcut });
}

/**
 * PATCH /api/shortcuts/:id
 * Update an existing shortcut.
 */
export async function handleUpdateShortcut(
  req: Request,
  res: Response,
): Promise<void> {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw new BadRequestError('Invalid shortcut ID');
  }

  const { title, path, weight } = req.body;
  const updated = await updateShortcut(id, { title, path, weight });

  if (!updated) {
    throw new NotFoundError('Shortcut not found');
  }

  res.json({ data: updated });
}

/**
 * DELETE /api/shortcuts/:id
 * Delete a shortcut.
 */
export async function handleDeleteShortcut(
  req: Request,
  res: Response,
): Promise<void> {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw new BadRequestError('Invalid shortcut ID');
  }

  await deleteShortcut(id);
  res.status(204).send();
}

/**
 * PATCH /api/shortcuts/reorder
 * Reorder the authenticated user's shortcuts. Body: { ids: number[] }
 */
export async function handleReorderShortcuts(
  req: Request,
  res: Response,
): Promise<void> {
  const user = (req as any).user;
  const uid: number = user?.uid ?? 0;

  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new BadRequestError('ids must be a non-empty array of shortcut IDs');
  }

  for (const id of ids) {
    if (typeof id !== 'number' || !Number.isInteger(id)) {
      throw new BadRequestError('Each id must be an integer');
    }
  }

  await reorderShortcuts(uid, ids);

  const shortcuts = await listShortcuts(uid);
  res.json({ data: shortcuts });
}

/**
 * GET /api/shortcut-sets
 * List all shortcut sets.
 */
export async function handleListShortcutSets(
  _req: Request,
  res: Response,
): Promise<void> {
  const sets = await listShortcutSets();
  res.json({ data: sets });
}
