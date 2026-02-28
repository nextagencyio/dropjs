import type { Request, Response } from '../types.js';
import {
  Entity,
  registerEntityType,
  getEntityTypeDefinition,
  getEntityTypesForType,
  unregisterEntityType,
  createLogger,
} from '../../core/index.js';
import { ValidationError, NotFoundError, BadRequestError } from '../errors.js';

const logger = createLogger('api:content-types');

const BUNDLE_REGEX = /^[a-z][a-z0-9_]*$/;
const MAX_BUNDLE_LENGTH = 32;

function validateBundle(bundle: string): void {
  if (!bundle || typeof bundle !== 'string') {
    throw new ValidationError('Bundle (machine name) is required');
  }
  if (bundle.length > MAX_BUNDLE_LENGTH) {
    throw new ValidationError(`Bundle must be ${MAX_BUNDLE_LENGTH} characters or fewer`);
  }
  if (!BUNDLE_REGEX.test(bundle)) {
    throw new ValidationError(
      'Bundle must start with a lowercase letter and contain only lowercase alphanumeric characters and underscores'
    );
  }
}

export async function createContentType(
  req: Request,
  res: Response
): Promise<void> {
  const { entity_type = 'node', bundle, label, description } = req.body ?? {};

  if (!label || typeof label !== 'string') {
    throw new ValidationError('Label is required');
  }
  if (!bundle || typeof bundle !== 'string') {
    throw new ValidationError('Bundle (machine name) is required');
  }

  validateBundle(bundle);

  // Check if already exists — return existing definition for idempotency
  const existing = getEntityTypeDefinition(entity_type, bundle);
  if (existing) {
    // Update label/description if provided (upsert behavior)
    if (label) existing.label = label;
    if (description !== undefined) existing.description = description || undefined;
    try {
      registerEntityType(existing);
    } catch {
      // ignore re-register errors
    }
    res.status(200).json({ data: existing });
    return;
  }

  const definition = {
    entity_type,
    bundle,
    label,
    description: description || undefined,
    fields: {},
  };

  try {
    registerEntityType(definition);

    // Ensure tables exist
    await Entity.ensureBaseTable(entity_type);
    await Entity.ensureFieldTables(definition);
  } catch (err) {
    logger.error('Failed to create content type', { error: (err as Error).message });
    res.status(500).json({ error: `Failed to create content type: ${(err as Error).message}` });
    return;
  }

  res.status(201).json({ data: definition });
}

export async function updateContentType(
  req: Request,
  res: Response
): Promise<void> {
  const { entityType, bundle } = req.params;
  const { label, description } = req.body ?? {};

  const definition = getEntityTypeDefinition(entityType, bundle);
  if (!definition) {
    throw new NotFoundError(`Content type "${entityType}:${bundle}" not found`);
  }

  if (label !== undefined) definition.label = label;
  if (description !== undefined) definition.description = description || undefined;

  try {
    // Re-register with updated values
    registerEntityType(definition);
  } catch (err) {
    logger.error('Failed to update content type', { error: (err as Error).message });
    res.status(500).json({ error: `Failed to update content type: ${(err as Error).message}` });
    return;
  }

  res.json({ data: definition });
}

export async function deleteContentType(
  req: Request,
  res: Response
): Promise<void> {
  const { entityType, bundle } = req.params;

  const definition = getEntityTypeDefinition(entityType, bundle);
  if (!definition) {
    throw new NotFoundError(`Content type "${entityType}:${bundle}" not found`);
  }

  try {
    unregisterEntityType(entityType, bundle);
  } catch (err) {
    logger.error('Failed to delete content type', { error: (err as Error).message });
    res.status(500).json({ error: `Failed to delete content type: ${(err as Error).message}` });
    return;
  }

  res.status(204).send();
}
