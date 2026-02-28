import type { Request, Response, NextFunction } from './types.js';
import { getEntityTypeDefinition } from '../core/index.js';
import { getFieldType } from '../field/index.js';
import { ValidationError } from './errors.js';

/**
 * Validates entity field values against their declared field types.
 * Used for create and update handlers.
 */
export function validateEntityFields(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const { entityType, bundle } = req.params;
  const values = req.body;

  if (!values || typeof values !== 'object') {
    next();
    return;
  }

  const definition = getEntityTypeDefinition(entityType, bundle);
  if (!definition) {
    next();
    return;
  }

  const errors: Record<string, string> = {};

  for (const [fieldName, fieldDef] of Object.entries(definition.fields)) {
    const value = values[fieldName];

    // Check required fields (only on create — if no id/nid present)
    if (fieldDef.required && (value === undefined || value === null || value === '')) {
      if (!req.params.id) {
        errors[fieldName] = `${fieldDef.label} is required`;
      }
      continue;
    }

    // Skip validation if no value provided
    if (value === undefined || value === null) {
      continue;
    }

    // Validate using the field type's validate method
    try {
      const fieldType = getFieldType(fieldDef.type);
      // Multi-value fields (cardinality != 1) may be arrays — validate each item
      if (Array.isArray(value)) {
        for (const item of value) {
          if (!fieldType.validate(item, fieldDef.settings)) {
            errors[fieldName] = `Invalid value for ${fieldDef.label} (type: ${fieldDef.type})`;
            break;
          }
        }
      } else {
        if (!fieldType.validate(value, fieldDef.settings)) {
          errors[fieldName] = `Invalid value for ${fieldDef.label} (type: ${fieldDef.type})`;
        }
      }
    } catch {
      // Unknown field type — skip validation
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  next();
}
