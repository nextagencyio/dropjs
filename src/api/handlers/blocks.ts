/**
 * Block/Region API handlers.
 */

import type { Request, Response } from '../types.js';
import {
  getAllBlocks,
  listBlockPlacements,
  loadBlockPlacement,
  saveBlockPlacement,
  deleteBlockPlacement,
  getDefaultRegions,
  loadThemeRegions,
  saveThemeRegions,
  renderRegion,
} from '../../core/index.js';
import type { BlockPlacement, BlockContext } from '../../core/index.js';
import { BadRequestError, NotFoundError } from '../errors.js';

/**
 * GET /api/blocks — List all registered block definitions.
 */
export async function handleListBlocks(
  _req: Request,
  res: Response
): Promise<void> {
  const blocks = getAllBlocks().map((b) => ({
    id: b.id,
    label: b.label,
    provider: b.provider,
    category: b.category ?? null,
  }));
  res.json({ data: blocks });
}

/**
 * GET /api/block-placements — List all block placements, optionally filtered by theme.
 */
export async function handleListPlacements(
  req: Request,
  res: Response
): Promise<void> {
  const theme = req.query.theme as string | undefined;
  const placements = await listBlockPlacements(theme);
  res.json({ data: placements });
}

/**
 * GET /api/block-placements/:id — Get a single placement.
 */
export async function handleGetPlacement(
  req: Request,
  res: Response
): Promise<void> {
  const placement = await loadBlockPlacement(req.params.id);
  if (!placement) {
    throw new NotFoundError('Block placement not found');
  }
  res.json({ data: placement });
}

/**
 * POST /api/block-placements — Create a new block placement.
 */
export async function handleCreatePlacement(
  req: Request,
  res: Response
): Promise<void> {
  const { id, blockId, region, weight, visibility, settings, status, theme } = req.body;

  if (!id || !blockId || !region) {
    throw new BadRequestError('id, blockId, and region are required');
  }

  const existing = await loadBlockPlacement(id);
  if (existing) {
    throw new BadRequestError(`Block placement "${id}" already exists`);
  }

  const placement: BlockPlacement = {
    id,
    blockId,
    region,
    weight: weight ?? 0,
    visibility: visibility ?? [],
    settings: settings ?? {},
    status: status !== false,
    theme: theme ?? 'default',
  };

  await saveBlockPlacement(placement);
  res.status(201).json({ data: placement });
}

/**
 * PATCH /api/block-placements/:id — Update a block placement.
 */
export async function handleUpdatePlacement(
  req: Request,
  res: Response
): Promise<void> {
  const existing = await loadBlockPlacement(req.params.id);
  if (!existing) {
    throw new NotFoundError('Block placement not found');
  }

  const updated: BlockPlacement = {
    ...existing,
    ...req.body,
    id: existing.id, // immutable
  };

  await saveBlockPlacement(updated);
  res.json({ data: updated });
}

/**
 * DELETE /api/block-placements/:id — Delete a block placement.
 */
export async function handleDeletePlacement(
  req: Request,
  res: Response
): Promise<void> {
  const existing = await loadBlockPlacement(req.params.id);
  if (!existing) {
    throw new NotFoundError('Block placement not found');
  }

  await deleteBlockPlacement(req.params.id);
  res.status(204).send();
}

/**
 * GET /api/regions — Get regions for a theme (or default regions).
 */
export async function handleGetRegions(
  req: Request,
  res: Response
): Promise<void> {
  const theme = req.query.theme as string | undefined;

  if (theme) {
    const themeRegions = await loadThemeRegions(theme);
    if (themeRegions) {
      res.json({ data: themeRegions.regions });
      return;
    }
  }

  res.json({ data: getDefaultRegions() });
}

/**
 * PUT /api/regions — Save regions for a theme.
 */
export async function handleSaveRegions(
  req: Request,
  res: Response
): Promise<void> {
  const { theme, regions } = req.body;

  if (!theme || !Array.isArray(regions)) {
    throw new BadRequestError('theme and regions array are required');
  }

  await saveThemeRegions({ theme, regions });
  res.json({ data: { theme, regions } });
}

/**
 * GET /api/regions/:region/render — Render all blocks in a region.
 */
export async function handleRenderRegion(
  req: Request,
  res: Response
): Promise<void> {
  const { region } = req.params;
  const theme = (req.query.theme as string) ?? 'default';

  const context: BlockContext = {
    path: req.query.path as string | undefined,
  };

  const blocks = await renderRegion(region, context, theme);
  res.json({
    data: blocks,
    meta: { region, theme, count: blocks.length },
  });
}
