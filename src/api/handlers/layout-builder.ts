/**
 * Layout Builder API handlers.
 */

import type { Request, Response } from '../types.js';
import {
  getLayoutTypes,
  getLayoutType,
  loadLayout,
  saveLayout,
  deleteLayout,
  addSection,
  removeSection,
  addComponent,
  removeComponent,
  renderLayout,
} from '../../core/index.js';
import type { LayoutSection } from '../../core/index.js';
import { BadRequestError, NotFoundError } from '../errors.js';

/**
 * GET /api/layout-types — List all available layout types.
 */
export async function handleListLayoutTypes(
  _req: Request,
  res: Response,
): Promise<void> {
  const types = getLayoutTypes();
  res.json({ data: types });
}

/**
 * GET /api/layout/:entityType/:bundle/:viewMode — Get a layout.
 */
export async function handleGetLayout(
  req: Request,
  res: Response,
): Promise<void> {
  const { entityType, bundle, viewMode } = req.params;
  const sections = await loadLayout(entityType, bundle, viewMode);
  if (!sections) {
    throw new NotFoundError(`Layout not found for ${entityType}.${bundle}.${viewMode}`);
  }
  res.json({ data: { entityType, bundle, viewMode, sections } });
}

/**
 * PUT /api/layout/:entityType/:bundle/:viewMode — Save a layout (full replacement).
 */
export async function handleSaveLayout(
  req: Request,
  res: Response,
): Promise<void> {
  const { entityType, bundle, viewMode } = req.params;
  const { sections } = req.body;

  if (!Array.isArray(sections)) {
    throw new BadRequestError('sections must be an array');
  }

  // Validate each section
  for (const section of sections) {
    if (!section.id || !section.type) {
      throw new BadRequestError('Each section must have an id and type');
    }
    const layoutType = getLayoutType(section.type);
    if (!layoutType) {
      throw new BadRequestError(`Unknown layout type: ${section.type}`);
    }
  }

  await saveLayout(entityType, bundle, viewMode, sections as LayoutSection[]);
  res.json({ data: { entityType, bundle, viewMode, sections } });
}

/**
 * DELETE /api/layout/:entityType/:bundle/:viewMode — Delete a layout.
 */
export async function handleDeleteLayout(
  req: Request,
  res: Response,
): Promise<void> {
  const { entityType, bundle, viewMode } = req.params;
  const existing = await loadLayout(entityType, bundle, viewMode);
  if (!existing) {
    throw new NotFoundError(`Layout not found for ${entityType}.${bundle}.${viewMode}`);
  }
  await deleteLayout(entityType, bundle, viewMode);
  res.status(204).send();
}

/**
 * POST /api/layout/:entityType/:bundle/:viewMode/sections — Add a section.
 */
export async function handleAddSection(
  req: Request,
  res: Response,
): Promise<void> {
  const { entityType, bundle, viewMode } = req.params;
  const { type, weight, settings } = req.body;

  if (!type) {
    throw new BadRequestError('type is required');
  }

  const layoutType = getLayoutType(type);
  if (!layoutType) {
    throw new BadRequestError(`Unknown layout type: ${type}`);
  }

  const sections = await addSection(entityType, bundle, viewMode, {
    type,
    weight: weight ?? 0,
    settings: settings ?? {},
  });

  res.status(201).json({ data: { entityType, bundle, viewMode, sections } });
}

/**
 * DELETE /api/layout/:entityType/:bundle/:viewMode/sections/:sectionId — Remove a section.
 */
export async function handleRemoveSection(
  req: Request,
  res: Response,
): Promise<void> {
  const { entityType, bundle, viewMode, sectionId } = req.params;

  const existing = await loadLayout(entityType, bundle, viewMode);
  if (!existing) {
    throw new NotFoundError(`Layout not found for ${entityType}.${bundle}.${viewMode}`);
  }

  const sectionExists = existing.some((s) => s.id === sectionId);
  if (!sectionExists) {
    throw new NotFoundError(`Section "${sectionId}" not found`);
  }

  const sections = await removeSection(entityType, bundle, viewMode, sectionId);
  res.json({ data: { entityType, bundle, viewMode, sections } });
}

/**
 * POST /api/layout/:entityType/:bundle/:viewMode/sections/:sectionId/components — Add a component.
 */
export async function handleAddComponent(
  req: Request,
  res: Response,
): Promise<void> {
  const { entityType, bundle, viewMode, sectionId } = req.params;
  const { type, region, weight, configuration } = req.body;

  if (!type || !region) {
    throw new BadRequestError('type and region are required');
  }

  // Validate that the layout and section exist
  const existing = await loadLayout(entityType, bundle, viewMode);
  if (!existing) {
    throw new NotFoundError(`Layout not found for ${entityType}.${bundle}.${viewMode}`);
  }

  const section = existing.find((s) => s.id === sectionId);
  if (!section) {
    throw new NotFoundError(`Section "${sectionId}" not found`);
  }

  // Validate that the region exists in the section's layout type
  const layoutType = getLayoutType(section.type);
  if (layoutType) {
    const validRegion = layoutType.regions.some((r) => r.id === region);
    if (!validRegion) {
      throw new BadRequestError(
        `Region "${region}" is not valid for layout type "${section.type}". Valid regions: ${layoutType.regions.map((r) => r.id).join(', ')}`,
      );
    }
  }

  const sections = await addComponent(entityType, bundle, viewMode, sectionId, {
    type,
    region,
    weight: weight ?? 0,
    configuration: configuration ?? {},
  });

  res.status(201).json({ data: { entityType, bundle, viewMode, sections } });
}

/**
 * DELETE /api/layout/:entityType/:bundle/:viewMode/sections/:sectionId/components/:componentId — Remove a component.
 */
export async function handleRemoveComponent(
  req: Request,
  res: Response,
): Promise<void> {
  const { entityType, bundle, viewMode, sectionId, componentId } = req.params;

  const existing = await loadLayout(entityType, bundle, viewMode);
  if (!existing) {
    throw new NotFoundError(`Layout not found for ${entityType}.${bundle}.${viewMode}`);
  }

  const section = existing.find((s) => s.id === sectionId);
  if (!section) {
    throw new NotFoundError(`Section "${sectionId}" not found`);
  }

  const componentExists = section.components.some((c) => c.id === componentId);
  if (!componentExists) {
    throw new NotFoundError(`Component "${componentId}" not found in section "${sectionId}"`);
  }

  const sections = await removeComponent(entityType, bundle, viewMode, sectionId, componentId);
  res.json({ data: { entityType, bundle, viewMode, sections } });
}

/**
 * GET /api/layout/:entityType/:bundle/:viewMode/render — Render a layout.
 */
export async function handleRenderLayout(
  req: Request,
  res: Response,
): Promise<void> {
  const { entityType, bundle, viewMode } = req.params;

  const rendered = await renderLayout(entityType, bundle, viewMode, {
    path: req.query.path as string | undefined,
    entityType,
    bundle,
  });

  res.json({ data: rendered });
}
