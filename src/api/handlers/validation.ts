import type { Request, Response } from '../types.js';
import {
  validateEntity,
  getFieldConstraints,
  setFieldConstraints,
  removeFieldConstraints,
} from '../../core/index.js';
import type { FieldConstraint } from '../../core/index.js';
import { BadRequestError, NotFoundError } from '../errors.js';

/**
 * POST /api/validate/:entityType/:bundle
 * Validate data without saving. Returns validation results.
 */
export async function handleValidateEntity(
  req: Request,
  res: Response
): Promise<void> {
  const { entityType, bundle } = req.params;

  if (!req.body || typeof req.body !== 'object') {
    throw new BadRequestError('Request body must be a JSON object');
  }

  const result = await validateEntity(entityType, bundle, req.body);

  res.json({
    data: {
      valid: result.valid,
      errors: result.errors,
    },
  });
}

/**
 * GET /api/constraints/:entityType/:bundle
 * Get all field constraints for an entity type/bundle.
 */
export async function handleGetConstraints(
  req: Request,
  res: Response
): Promise<void> {
  const { entityType, bundle } = req.params;

  const constraints = await getFieldConstraints(entityType, bundle);

  res.json({ data: constraints });
}

/**
 * PUT /api/constraints/:entityType/:bundle/:fieldName
 * Set constraints for a field.
 */
export async function handleSetConstraints(
  req: Request,
  res: Response
): Promise<void> {
  const { entityType, bundle, fieldName } = req.params;

  const { constraints } = req.body as { constraints?: FieldConstraint[] };

  if (!constraints || !Array.isArray(constraints)) {
    throw new BadRequestError('constraints must be an array');
  }

  // Validate constraint structure
  const validTypes = ['required', 'min_length', 'max_length', 'pattern', 'min', 'max', 'unique', 'custom'];
  for (const c of constraints) {
    if (!c.type || !validTypes.includes(c.type)) {
      throw new BadRequestError(
        `Invalid constraint type: "${c.type}". Must be one of: ${validTypes.join(', ')}`
      );
    }
    if (!c.message || typeof c.message !== 'string') {
      throw new BadRequestError('Each constraint must have a "message" string');
    }
  }

  await setFieldConstraints(entityType, bundle, fieldName, constraints);

  res.json({
    data: {
      entityType,
      bundle,
      fieldName,
      constraints,
    },
  });
}

/**
 * DELETE /api/constraints/:entityType/:bundle/:fieldName
 * Remove constraints for a field.
 */
export async function handleDeleteConstraints(
  req: Request,
  res: Response
): Promise<void> {
  const { entityType, bundle, fieldName } = req.params;

  const deleted = await removeFieldConstraints(entityType, bundle, fieldName);

  if (!deleted) {
    throw new NotFoundError(
      `No constraints found for ${entityType}/${bundle}/${fieldName}`
    );
  }

  res.status(204).send();
}
