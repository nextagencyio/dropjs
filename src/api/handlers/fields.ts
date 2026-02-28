import type { Request, Response } from '../types.js';
import {
  registerEntityType,
  getEntityTypeDefinition,
  createLogger,
} from '../../core/index.js';
import { fieldStorage } from '../../field/index.js';
import { ValidationError, NotFoundError, BadRequestError } from '../errors.js';

const logger = createLogger('api:fields');

const FIELD_NAME_REGEX = /^field_[a-z][a-z0-9_]*$/;

export async function addField(
  req: Request,
  res: Response
): Promise<void> {
  const { entityType, bundle } = req.params;
  const { name, label, type, cardinality, settings } = req.body ?? {};

  const definition = getEntityTypeDefinition(entityType, bundle);
  if (!definition) {
    throw new NotFoundError(`Content type "${entityType}:${bundle}" not found`);
  }

  if (!name || typeof name !== 'string') {
    throw new ValidationError('Field name is required');
  }
  if (!FIELD_NAME_REGEX.test(name)) {
    throw new ValidationError(
      'Field name must start with "field_" followed by a lowercase letter, and contain only lowercase alphanumeric characters and underscores'
    );
  }
  if (!label || typeof label !== 'string') {
    throw new ValidationError('Field label is required');
  }
  if (!type || typeof type !== 'string') {
    throw new ValidationError('Field type is required');
  }

  // Check if field already exists — return existing for idempotency
  if (definition.fields[name]) {
    const existingField = definition.fields[name];
    res.status(200).json({ data: { name, ...existingField } });
    return;
  }

  // Build field definition
  const fieldDef = {
    type,
    label,
    cardinality: cardinality ?? 1,
    settings: settings || undefined,
  };

  // Add field to definition and re-register
  definition.fields[name] = fieldDef;

  try {
    registerEntityType(definition);

    // Create field storage table
    await fieldStorage.createFieldTable(entityType, name, type, settings);
  } catch (err) {
    // Rollback the field addition on failure
    delete definition.fields[name];
    logger.error('Failed to add field', { error: (err as Error).message });
    res.status(500).json({ error: `Failed to add field: ${(err as Error).message}` });
    return;
  }

  res.status(201).json({ data: { name, ...fieldDef } });
}

export async function updateField(
  req: Request,
  res: Response
): Promise<void> {
  const { entityType, bundle, fieldName } = req.params;
  const { label, required, cardinality, settings, weight } = req.body ?? {};

  const definition = getEntityTypeDefinition(entityType, bundle);
  if (!definition) {
    throw new NotFoundError(`Content type "${entityType}:${bundle}" not found`);
  }

  const fieldDef = definition.fields[fieldName];
  if (!fieldDef) {
    throw new NotFoundError(`Field "${fieldName}" not found on ${entityType}:${bundle}`);
  }

  // Update allowed properties (name and type are immutable)
  if (label !== undefined) {
    if (typeof label !== 'string' || !label) {
      throw new ValidationError('Field label must be a non-empty string');
    }
    fieldDef.label = label;
  }
  if (required !== undefined) {
    fieldDef.required = Boolean(required);
  }
  if (cardinality !== undefined) {
    const card = typeof cardinality === 'number' ? cardinality : parseInt(cardinality, 10);
    if (isNaN(card) || (card < -1 || card === 0)) {
      throw new ValidationError('Cardinality must be -1 (unlimited) or a positive integer');
    }
    fieldDef.cardinality = card;
  }
  if (settings !== undefined) {
    fieldDef.settings = settings;
  }
  if (weight !== undefined) {
    const w = typeof weight === 'number' ? weight : parseInt(weight, 10);
    if (!isNaN(w)) {
      fieldDef.weight = w;
    }
  }

  try {
    registerEntityType(definition);
  } catch (err) {
    logger.error('Failed to update field', { error: (err as Error).message });
    res.status(500).json({ error: `Failed to update field: ${(err as Error).message}` });
    return;
  }

  res.json({ data: { name: fieldName, ...fieldDef } });
}

export async function reorderFields(
  req: Request,
  res: Response
): Promise<void> {
  const { entityType, bundle } = req.params;
  const { order } = req.body ?? {};

  const definition = getEntityTypeDefinition(entityType, bundle);
  if (!definition) {
    throw new NotFoundError(`Content type "${entityType}:${bundle}" not found`);
  }

  if (!Array.isArray(order)) {
    throw new ValidationError('order must be an array of { name, weight }');
  }

  for (const item of order) {
    if (!item.name || typeof item.name !== 'string') {
      throw new ValidationError('Each order item must have a name');
    }
    if (typeof item.weight !== 'number') {
      throw new ValidationError('Each order item must have a numeric weight');
    }
    const fieldDef = definition.fields[item.name];
    if (!fieldDef) {
      throw new NotFoundError(`Field "${item.name}" not found on ${entityType}:${bundle}`);
    }
    fieldDef.weight = item.weight;
  }

  try {
    registerEntityType(definition);
  } catch (err) {
    logger.error('Failed to reorder fields', { error: (err as Error).message });
    res.status(500).json({ error: `Failed to reorder fields: ${(err as Error).message}` });
    return;
  }

  res.status(204).send();
}

export async function deleteField(
  req: Request,
  res: Response
): Promise<void> {
  const { entityType, bundle, fieldName } = req.params;

  const definition = getEntityTypeDefinition(entityType, bundle);
  if (!definition) {
    throw new NotFoundError(`Content type "${entityType}:${bundle}" not found`);
  }

  if (!definition.fields[fieldName]) {
    throw new NotFoundError(`Field "${fieldName}" not found on ${entityType}:${bundle}`);
  }

  // Remove field from definition and re-register
  const savedFieldDef = definition.fields[fieldName];
  delete definition.fields[fieldName];

  try {
    registerEntityType(definition);

    // Drop field storage table
    await fieldStorage.dropFieldTable(entityType, fieldName);
  } catch (err) {
    // Rollback the field removal on failure
    definition.fields[fieldName] = savedFieldDef;
    logger.error('Failed to delete field', { error: (err as Error).message });
    res.status(500).json({ error: `Failed to delete field: ${(err as Error).message}` });
    return;
  }

  res.status(204).send();
}
