import type { Request, Response } from '../types.js';
import {
  listViewModes,
  saveViewMode,
  loadViewMode,
  deleteViewMode,
  listViewDisplays,
  saveViewDisplay,
  loadViewDisplay,
  deleteViewDisplay,
  getOrCreateViewDisplay,
  applyViewDisplay,
} from '../../core/index.js';
import type { ViewMode, EntityViewDisplay } from '../../core/index.js';
import { NotFoundError, BadRequestError } from '../errors.js';

// --- View Modes ---

export async function handleListViewModes(req: Request, res: Response): Promise<void> {
  const { entityType } = req.params;
  if (!entityType) {
    throw new BadRequestError('entityType is required');
  }
  const modes = await listViewModes(entityType);
  res.json({ data: modes });
}

export async function handleGetViewMode(req: Request, res: Response): Promise<void> {
  const { entityType, mode } = req.params;
  const viewMode = await loadViewMode(entityType, mode);
  if (!viewMode) {
    throw new NotFoundError(`View mode "${entityType}.${mode}" not found`);
  }
  res.json({ data: viewMode });
}

export async function handleCreateViewMode(req: Request, res: Response): Promise<void> {
  const { entityType } = req.params;
  const { id, label, description } = req.body as Partial<ViewMode>;
  if (!id || !label) {
    throw new BadRequestError('id and label are required');
  }
  const viewMode: ViewMode = {
    id,
    entity_type: entityType,
    label,
    ...(description !== undefined && { description }),
  };
  await saveViewMode(viewMode);
  res.status(201).json({ data: viewMode });
}

export async function handleDeleteViewMode(req: Request, res: Response): Promise<void> {
  const { entityType, mode } = req.params;
  await deleteViewMode(entityType, mode);
  res.status(204).send();
}

// --- View Displays ---

export async function handleListViewDisplays(req: Request, res: Response): Promise<void> {
  const { entityType, bundle } = req.params;
  if (!entityType || !bundle) {
    throw new BadRequestError('entityType and bundle are required');
  }
  const displays = await listViewDisplays(entityType, bundle);
  res.json({ data: displays });
}

export async function handleGetViewDisplay(req: Request, res: Response): Promise<void> {
  const { entityType, bundle, mode } = req.params;
  const display = await getOrCreateViewDisplay(entityType, bundle, mode);
  res.json({ data: display });
}

export async function handleSaveViewDisplay(req: Request, res: Response): Promise<void> {
  const { entityType, bundle, mode } = req.params;
  const body = req.body as Partial<EntityViewDisplay>;
  const display: EntityViewDisplay = {
    entity_type: entityType,
    bundle,
    mode,
    label: body.label ?? mode,
    status: body.status ?? true,
    fields: body.fields ?? {},
  };
  await saveViewDisplay(display);
  res.json({ data: display });
}

export async function handleDeleteViewDisplay(req: Request, res: Response): Promise<void> {
  const { entityType, bundle, mode } = req.params;
  await deleteViewDisplay(entityType, bundle, mode);
  res.status(204).send();
}

export async function handleApplyViewDisplay(req: Request, res: Response): Promise<void> {
  const { entityType, bundle, mode } = req.params;
  const entityData = req.body as Record<string, unknown>;
  if (!entityData || typeof entityData !== 'object') {
    throw new BadRequestError('Entity data must be provided in request body');
  }
  const result = await applyViewDisplay(entityType, bundle, mode, entityData);
  res.json({ data: result });
}
