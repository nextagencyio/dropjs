/**
 * Paragraphs API handlers — CRUD for paragraph types and paragraph items.
 */

import type { Request, Response } from '../types.js';
import {
  getAllParagraphTypes,
  getParagraphType,
  registerParagraphType,
  deleteParagraphType,
  loadParagraphs,
  loadParagraph,
  createParagraph,
  updateParagraph,
  deleteParagraph,
  reorderParagraphs,
} from '../../core/index.js';
import type { ParagraphType } from '../../core/index.js';
import { BadRequestError, NotFoundError } from '../errors.js';

// ─── Paragraph Type Handlers ──────────────────────────────────

/**
 * GET /api/paragraph-types
 * List all registered paragraph types.
 */
export async function handleListParagraphTypes(
  _req: Request,
  res: Response
): Promise<void> {
  const types = await getAllParagraphTypes();
  res.json({ data: types });
}

/**
 * POST /api/paragraph-types
 * Create (register) a new paragraph type.
 */
export async function handleCreateParagraphType(
  req: Request,
  res: Response
): Promise<void> {
  const { id, label, description, fields } = req.body;

  if (!id || !label) {
    throw new BadRequestError('id and label are required');
  }

  // Validate id format
  if (!/^[a-z][a-z0-9_]*$/.test(id)) {
    throw new BadRequestError(
      'Paragraph type id must start with a letter and contain only lowercase letters, numbers, and underscores'
    );
  }

  const existing = await getParagraphType(id);
  if (existing) {
    throw new BadRequestError(`Paragraph type "${id}" already exists`);
  }

  const paragraphType: ParagraphType = {
    id,
    label,
    description: description ?? '',
    fields: fields ?? {},
  };

  await registerParagraphType(paragraphType);
  res.status(201).json({ data: paragraphType });
}

/**
 * DELETE /api/paragraph-types/:id
 * Delete a paragraph type.
 */
export async function handleDeleteParagraphType(
  req: Request,
  res: Response
): Promise<void> {
  const { id } = req.params;

  const existing = await getParagraphType(id);
  if (!existing) {
    throw new NotFoundError(`Paragraph type "${id}" not found`);
  }

  await deleteParagraphType(id);
  res.status(204).send();
}

// ─── Paragraph Item Handlers ──────────────────────────────────

/**
 * GET /api/:entityType/:bundle/:id/paragraphs
 * List all paragraphs for a given entity. Optionally filter by field_name query param.
 */
export async function handleListParagraphs(
  req: Request,
  res: Response
): Promise<void> {
  const { entityType, id } = req.params;
  const entityId = parseInt(id, 10);
  if (isNaN(entityId)) {
    throw new BadRequestError('Invalid entity ID');
  }

  const fieldName = req.query.field_name as string | undefined;

  const paragraphs = await loadParagraphs(entityType, entityId, fieldName);
  res.json({
    data: paragraphs,
    meta: { count: paragraphs.length },
  });
}

/**
 * GET /api/paragraphs/:paragraphId
 * Get a single paragraph by its ID.
 */
export async function handleGetParagraph(
  req: Request,
  res: Response
): Promise<void> {
  const paragraphId = parseInt(req.params.paragraphId, 10);
  if (isNaN(paragraphId)) {
    throw new BadRequestError('Invalid paragraph ID');
  }

  const paragraph = await loadParagraph(paragraphId);
  if (!paragraph) {
    throw new NotFoundError('Paragraph not found');
  }

  res.json({ data: paragraph });
}

/**
 * POST /api/:entityType/:bundle/:id/paragraphs
 * Create a paragraph item for a given entity.
 */
export async function handleCreateParagraph(
  req: Request,
  res: Response
): Promise<void> {
  const { entityType, id } = req.params;
  const entityId = parseInt(id, 10);
  if (isNaN(entityId)) {
    throw new BadRequestError('Invalid entity ID');
  }

  const { type, field_name, data, delta } = req.body;

  if (!type || !field_name) {
    throw new BadRequestError('type and field_name are required');
  }

  // Verify the paragraph type exists
  const paragraphType = await getParagraphType(type);
  if (!paragraphType) {
    throw new NotFoundError(`Paragraph type "${type}" not found`);
  }

  const paragraph = await createParagraph(
    entityType,
    entityId,
    field_name,
    type,
    data ?? {},
    delta
  );

  res.status(201).json({ data: paragraph });
}

/**
 * PATCH /api/paragraphs/:paragraphId
 * Update a paragraph's field data.
 */
export async function handleUpdateParagraph(
  req: Request,
  res: Response
): Promise<void> {
  const paragraphId = parseInt(req.params.paragraphId, 10);
  if (isNaN(paragraphId)) {
    throw new BadRequestError('Invalid paragraph ID');
  }

  const existing = await loadParagraph(paragraphId);
  if (!existing) {
    throw new NotFoundError('Paragraph not found');
  }

  const { data } = req.body;
  if (!data || typeof data !== 'object') {
    throw new BadRequestError('data object is required');
  }

  const updated = await updateParagraph(paragraphId, data);
  res.json({ data: updated });
}

/**
 * DELETE /api/paragraphs/:paragraphId
 * Delete a paragraph.
 */
export async function handleDeleteParagraph(
  req: Request,
  res: Response
): Promise<void> {
  const paragraphId = parseInt(req.params.paragraphId, 10);
  if (isNaN(paragraphId)) {
    throw new BadRequestError('Invalid paragraph ID');
  }

  const existing = await loadParagraph(paragraphId);
  if (!existing) {
    throw new NotFoundError('Paragraph not found');
  }

  await deleteParagraph(paragraphId);
  res.status(204).send();
}

/**
 * PATCH /api/:entityType/:bundle/:id/paragraphs/reorder
 * Reorder paragraphs within a parent entity field.
 */
export async function handleReorderParagraphs(
  req: Request,
  res: Response
): Promise<void> {
  const { entityType, id } = req.params;
  const entityId = parseInt(id, 10);
  if (isNaN(entityId)) {
    throw new BadRequestError('Invalid entity ID');
  }

  const { field_name, ids } = req.body;

  if (!field_name) {
    throw new BadRequestError('field_name is required');
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new BadRequestError('ids must be a non-empty array of paragraph IDs');
  }

  // Validate all IDs are numbers
  const numericIds = ids.map((rawId: unknown) => {
    const n = typeof rawId === 'string' ? parseInt(rawId, 10) : (rawId as number);
    if (typeof n !== 'number' || isNaN(n)) {
      throw new BadRequestError('All ids must be valid integers');
    }
    return n;
  });

  await reorderParagraphs(entityType, entityId, field_name, numericIds);

  // Return the reordered paragraphs
  const paragraphs = await loadParagraphs(entityType, entityId, field_name);
  res.json({ data: paragraphs });
}
