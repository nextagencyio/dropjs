import type { Request, Response } from '../types.js';
import {
  saveFieldGroup,
  loadFieldGroup,
  listFieldGroups,
  deleteFieldGroup,
  addFieldToGroup,
  removeFieldFromGroup,
  getGroupedFieldLayout,
} from '../../core/index.js';
import type { FieldGroup, GroupFormat, FieldGroupSettings } from '../../core/index.js';
import { BadRequestError, NotFoundError } from '../errors.js';

// ── Helpers ────────────────────────────────────────────────────────────────

const VALID_FORMATS: GroupFormat[] = [
  'fieldset',
  'tabs',
  'tab',
  'details',
  'accordion',
  'accordion_item',
  'html_element',
];

function isValidFormat(value: unknown): value is GroupFormat {
  return typeof value === 'string' && VALID_FORMATS.includes(value as GroupFormat);
}

// ── Handlers ───────────────────────────────────────────────────────────────

/**
 * GET /api/field-groups/:entityType/:bundle/:viewMode
 * List all field groups for a given entity type, bundle, and view mode.
 */
export async function handleListFieldGroups(req: Request, res: Response): Promise<void> {
  const { entityType, bundle, viewMode } = req.params;
  if (!entityType || !bundle || !viewMode) {
    throw new BadRequestError('entityType, bundle, and viewMode are required');
  }

  const groups = await listFieldGroups(entityType, bundle, viewMode);
  res.json({ data: groups });
}

/**
 * GET /api/field-groups/:entityType/:bundle/:viewMode/:groupName
 * Get a single field group by name.
 */
export async function handleGetFieldGroup(req: Request, res: Response): Promise<void> {
  const { entityType, bundle, viewMode, groupName } = req.params;

  const group = await loadFieldGroup(entityType, bundle, viewMode, groupName);
  if (!group) {
    throw new NotFoundError(
      `Field group "${groupName}" not found for ${entityType}.${bundle}.${viewMode}`,
    );
  }

  res.json({ data: group });
}

/**
 * POST /api/field-groups/:entityType/:bundle/:viewMode
 * Create a new field group. Requires name, label, format in the body.
 */
export async function handleCreateFieldGroup(req: Request, res: Response): Promise<void> {
  const { entityType, bundle, viewMode } = req.params;
  const { name, label, format, parent, weight, fields, settings } = req.body as Partial<FieldGroup>;

  if (!name || !label || !format) {
    throw new BadRequestError('name, label, and format are required');
  }

  if (!isValidFormat(format)) {
    throw new BadRequestError(
      `Invalid format "${format}". Must be one of: ${VALID_FORMATS.join(', ')}`,
    );
  }

  // Check if a group with this name already exists
  const existing = await loadFieldGroup(entityType, bundle, viewMode, name);
  if (existing) {
    throw new BadRequestError(
      `Field group "${name}" already exists for ${entityType}.${bundle}.${viewMode}`,
    );
  }

  const group: FieldGroup = {
    entity_type: entityType,
    bundle,
    view_mode: viewMode,
    name,
    label,
    format,
    ...(parent !== undefined && { parent }),
    weight: weight ?? 0,
    fields: fields ?? [],
    settings: (settings ?? {}) as FieldGroupSettings,
  };

  await saveFieldGroup(group);
  res.status(201).json({ data: group });
}

/**
 * PATCH /api/field-groups/:entityType/:bundle/:viewMode/:groupName
 * Update an existing field group. Supports partial updates.
 */
export async function handleUpdateFieldGroup(req: Request, res: Response): Promise<void> {
  const { entityType, bundle, viewMode, groupName } = req.params;

  const existing = await loadFieldGroup(entityType, bundle, viewMode, groupName);
  if (!existing) {
    throw new NotFoundError(
      `Field group "${groupName}" not found for ${entityType}.${bundle}.${viewMode}`,
    );
  }

  const { label, format, parent, weight, fields, settings } = req.body as Partial<FieldGroup>;

  if (format !== undefined && !isValidFormat(format)) {
    throw new BadRequestError(
      `Invalid format "${format}". Must be one of: ${VALID_FORMATS.join(', ')}`,
    );
  }

  const updated: FieldGroup = {
    ...existing,
    ...(label !== undefined && { label }),
    ...(format !== undefined && { format }),
    ...(parent !== undefined && { parent: parent || undefined }),
    ...(weight !== undefined && { weight }),
    ...(fields !== undefined && { fields }),
    ...(settings !== undefined && { settings: settings as FieldGroupSettings }),
  };

  await saveFieldGroup(updated);
  res.json({ data: updated });
}

/**
 * DELETE /api/field-groups/:entityType/:bundle/:viewMode/:groupName
 * Delete a field group.
 */
export async function handleDeleteFieldGroup(req: Request, res: Response): Promise<void> {
  const { entityType, bundle, viewMode, groupName } = req.params;

  const existing = await loadFieldGroup(entityType, bundle, viewMode, groupName);
  if (!existing) {
    throw new NotFoundError(
      `Field group "${groupName}" not found for ${entityType}.${bundle}.${viewMode}`,
    );
  }

  await deleteFieldGroup(entityType, bundle, viewMode, groupName);
  res.status(204).send();
}

/**
 * POST /api/field-groups/:entityType/:bundle/:viewMode/:groupName/fields
 * Add a field to a group. Body: { field_name: string }
 */
export async function handleAddFieldToGroup(req: Request, res: Response): Promise<void> {
  const { entityType, bundle, viewMode, groupName } = req.params;
  const { field_name } = req.body as { field_name?: string };

  if (!field_name) {
    throw new BadRequestError('field_name is required');
  }

  const group = await loadFieldGroup(entityType, bundle, viewMode, groupName);
  if (!group) {
    throw new NotFoundError(
      `Field group "${groupName}" not found for ${entityType}.${bundle}.${viewMode}`,
    );
  }

  await addFieldToGroup(entityType, bundle, viewMode, groupName, field_name);

  // Reload the group to return the updated state
  const updated = await loadFieldGroup(entityType, bundle, viewMode, groupName);
  res.json({ data: updated });
}

/**
 * DELETE /api/field-groups/:entityType/:bundle/:viewMode/:groupName/fields/:fieldName
 * Remove a field from a group.
 */
export async function handleRemoveFieldFromGroup(req: Request, res: Response): Promise<void> {
  const { entityType, bundle, viewMode, groupName, fieldName } = req.params;

  const group = await loadFieldGroup(entityType, bundle, viewMode, groupName);
  if (!group) {
    throw new NotFoundError(
      `Field group "${groupName}" not found for ${entityType}.${bundle}.${viewMode}`,
    );
  }

  await removeFieldFromGroup(entityType, bundle, viewMode, groupName, fieldName);

  // Reload the group to return the updated state
  const updated = await loadFieldGroup(entityType, bundle, viewMode, groupName);
  res.json({ data: updated });
}

/**
 * GET /api/field-layout/:entityType/:bundle/:viewMode
 * Get the full grouped field layout for an entity type/bundle/view mode.
 */
export async function handleGetGroupedLayout(req: Request, res: Response): Promise<void> {
  const { entityType, bundle, viewMode } = req.params;
  if (!entityType || !bundle || !viewMode) {
    throw new BadRequestError('entityType, bundle, and viewMode are required');
  }

  const layout = await getGroupedFieldLayout(entityType, bundle, viewMode);
  res.json({ data: layout });
}
