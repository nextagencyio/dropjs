/**
 * Views API handlers — CRUD + execute for Views.
 */

import type { Request, Response } from '../types.js';
import {
  listViews,
  loadView,
  saveView,
  deleteView,
  executeView,
} from '../../core/index.js';
import type { ViewDefinition } from '../../core/index.js';
import { BadRequestError, NotFoundError } from '../errors.js';

export async function handleListViews(_req: Request, res: Response): Promise<void> {
  const views = await listViews();
  res.json({ data: views });
}

export async function handleGetView(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const view = await loadView(id);
  if (!view) {
    throw new NotFoundError(`View "${id}" not found`);
  }
  res.json({ data: view });
}

export async function handleCreateView(req: Request, res: Response): Promise<void> {
  const { id, label, entity_type, ...rest } = req.body;

  if (!id || !label || !entity_type) {
    throw new BadRequestError('id, label, and entity_type are required');
  }

  // Validate id format
  if (!/^[a-z][a-z0-9_]*$/.test(id)) {
    throw new BadRequestError('View id must start with a letter and contain only lowercase letters, numbers, and underscores');
  }

  const existing = await loadView(id);
  if (existing) {
    throw new BadRequestError(`View "${id}" already exists`);
  }

  const view: ViewDefinition = {
    id,
    label,
    entity_type,
    description: rest.description ?? '',
    bundle: rest.bundle ?? null,
    display_fields: rest.display_fields ?? [],
    filters: rest.filters ?? [],
    sorts: rest.sorts ?? [{ field: 'changed', direction: 'DESC' }],
    pager: rest.pager ?? 25,
    status: rest.status !== false,
  };

  await saveView(view);
  res.status(201).json({ data: view });
}

export async function handleUpdateView(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const existing = await loadView(id);
  if (!existing) {
    throw new NotFoundError(`View "${id}" not found`);
  }

  const updated: ViewDefinition = {
    ...existing,
    ...req.body,
    id, // id is immutable
  };

  await saveView(updated);
  res.json({ data: updated });
}

export async function handleDeleteView(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const deleted = await deleteView(id);
  if (!deleted) {
    throw new NotFoundError(`View "${id}" not found`);
  }
  res.status(204).send();
}

export async function handleExecuteView(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const view = await loadView(id);
  if (!view) {
    throw new NotFoundError(`View "${id}" not found`);
  }

  if (!view.status) {
    throw new BadRequestError(`View "${id}" is disabled`);
  }

  const page = parseInt(req.query.page as string, 10) || 1;
  const sortField = req.query.sort_field as string | undefined;
  const sortDirection = (req.query.sort_direction as string)?.toUpperCase() as 'ASC' | 'DESC' | undefined;

  // Collect exposed filter values from query params
  const exposed: Record<string, unknown> = {};
  for (const filter of view.filters) {
    if (filter.exposed && filter.expose_identifier) {
      const val = req.query[filter.expose_identifier];
      if (val !== undefined) {
        // Handle LIKE operator — wrap with %
        if (filter.operator === 'LIKE' && typeof val === 'string' && val.length > 0) {
          exposed[filter.expose_identifier] = `%${val}%`;
        } else {
          exposed[filter.expose_identifier] = val;
        }
      }
    }
  }

  const result = await executeView(view, {
    page,
    exposed,
    sort_field: sortField,
    sort_direction: sortDirection,
  });

  res.json(result);
}
