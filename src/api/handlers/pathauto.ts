/**
 * Pathauto API handlers — manage URL alias patterns.
 */

import type { Request, Response } from '../types.js';
import {
  getPathautoPatterns,
  getPathautoPattern,
  savePathautoPattern,
  deletePathautoPattern,
  bulkGenerateAliases,
} from '../../core/index.js';
import type { PathautoPattern } from '../../core/index.js';
import { BadRequestError, NotFoundError } from '../errors.js';

/**
 * GET /api/pathauto/patterns
 * List all pathauto patterns.
 */
export async function handleListPatterns(
  _req: Request,
  res: Response,
): Promise<void> {
  const patterns = await getPathautoPatterns();
  res.json({ data: patterns });
}

/**
 * GET /api/pathauto/patterns/:id
 * Get a single pattern by ID.
 */
export async function handleGetPattern(
  req: Request,
  res: Response,
): Promise<void> {
  const pattern = await getPathautoPattern(req.params.id);
  if (!pattern) {
    throw new NotFoundError('Pattern not found');
  }
  res.json({ data: pattern });
}

/**
 * POST /api/pathauto/patterns
 * Create a new pathauto pattern.
 */
export async function handleCreatePattern(
  req: Request,
  res: Response,
): Promise<void> {
  const { id, entity_type, bundle, pattern, weight, enabled } = req.body;

  if (!id || !entity_type || !pattern) {
    throw new BadRequestError('id, entity_type, and pattern are required');
  }

  if (!/^[a-z0-9_]+$/.test(id)) {
    throw new BadRequestError('id must contain only lowercase letters, numbers, and underscores');
  }

  const existing = await getPathautoPattern(id);
  if (existing) {
    throw new BadRequestError(`Pattern with id "${id}" already exists`);
  }

  const newPattern: PathautoPattern = {
    id,
    entity_type,
    bundle: bundle ?? null,
    pattern,
    weight: weight ?? 0,
    enabled: enabled !== false,
  };

  const saved = await savePathautoPattern(newPattern);
  res.status(201).json({ data: saved });
}

/**
 * PATCH /api/pathauto/patterns/:id
 * Update an existing pattern.
 */
export async function handleUpdatePattern(
  req: Request,
  res: Response,
): Promise<void> {
  const existing = await getPathautoPattern(req.params.id);
  if (!existing) {
    throw new NotFoundError('Pattern not found');
  }

  const { pattern, weight, enabled, bundle } = req.body;

  const updated: PathautoPattern = {
    ...existing,
    ...(pattern !== undefined ? { pattern } : {}),
    ...(weight !== undefined ? { weight } : {}),
    ...(enabled !== undefined ? { enabled } : {}),
    ...(bundle !== undefined ? { bundle } : {}),
  };

  const saved = await savePathautoPattern(updated);
  res.json({ data: saved });
}

/**
 * DELETE /api/pathauto/patterns/:id
 * Delete a pattern.
 */
export async function handleDeletePattern(
  req: Request,
  res: Response,
): Promise<void> {
  const existing = await getPathautoPattern(req.params.id);
  if (!existing) {
    throw new NotFoundError('Pattern not found');
  }

  await deletePathautoPattern(req.params.id);
  res.status(204).send();
}

/**
 * POST /api/pathauto/generate
 * Bulk-generate aliases for all entities of a type/bundle.
 */
export async function handleBulkGenerate(
  req: Request,
  res: Response,
): Promise<void> {
  const { entity_type, bundle } = req.body;

  if (!entity_type) {
    throw new BadRequestError('entity_type is required');
  }

  const count = await bulkGenerateAliases(entity_type, bundle);
  res.json({ data: { generated: count } });
}
