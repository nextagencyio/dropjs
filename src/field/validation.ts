import { getFieldType, type FieldSettings } from './field-type.js';

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate a single field value against its type constraints and settings.
 */
export function validateFieldValue(
  fieldName: string,
  fieldType: string,
  value: unknown,
  settings?: FieldSettings,
  options?: { required?: boolean; cardinality?: number }
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required field check
  if (options?.required) {
    if (value === undefined || value === null || value === '') {
      errors.push({
        field: fieldName,
        message: `${fieldName} is required`,
        value,
      });
      return errors;
    }
  }

  // Skip validation for empty optional values
  if (value === undefined || value === null) {
    return errors;
  }

  // Handle multi-value fields
  const values = Array.isArray(value) ? value : [value];

  // Check cardinality
  const cardinality = options?.cardinality ?? 1;
  if (cardinality > 0 && values.length > cardinality) {
    errors.push({
      field: fieldName,
      message: `${fieldName} allows at most ${cardinality} value(s), got ${values.length}`,
      value,
    });
  }

  // Validate each value against its field type
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const typeErrors = validateByType(fieldName, fieldType, v, settings);
    errors.push(...typeErrors);
  }

  return errors;
}

/**
 * Validate a value against type-specific constraints.
 */
function validateByType(
  fieldName: string,
  fieldType: string,
  value: unknown,
  settings?: FieldSettings
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (value === null || value === undefined) return errors;

  switch (fieldType) {
    case 'email': {
      if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push({
          field: fieldName,
          message: `${fieldName} must be a valid email address`,
          value,
        });
      }
      break;
    }

    case 'string': {
      if (typeof value !== 'string') {
        errors.push({
          field: fieldName,
          message: `${fieldName} must be a string`,
          value,
        });
      } else {
        const maxLength = settings?.max_length ?? 255;
        if (value.length > maxLength) {
          errors.push({
            field: fieldName,
            message: `${fieldName} must be at most ${maxLength} characters`,
            value,
          });
        }
      }
      break;
    }

    case 'text_long': {
      // text_long accepts a string or an object { value, format }
      if (typeof value === 'string') break;
      if (typeof value === 'object' && value !== null) {
        const v = value as Record<string, unknown>;
        if (typeof v.value === 'string' || v.value === null || v.value === undefined) break;
      }
      errors.push({
        field: fieldName,
        message: `${fieldName} must be a string or object with value/format`,
        value,
      });
      break;
    }

    case 'integer': {
      const num = typeof value === 'string' ? Number(value) : value;
      if (typeof num !== 'number' || !Number.isFinite(num) || !Number.isInteger(num)) {
        errors.push({
          field: fieldName,
          message: `${fieldName} must be an integer`,
          value,
        });
      }
      break;
    }

    case 'float':
    case 'decimal': {
      const num = typeof value === 'string' ? Number(value) : value;
      if (typeof num !== 'number' || !Number.isFinite(num)) {
        errors.push({
          field: fieldName,
          message: `${fieldName} must be a number`,
          value,
        });
      }
      break;
    }

    case 'boolean': {
      const valid = typeof value === 'boolean' || value === 0 || value === 1 || value === '0' || value === '1' || value === true || value === false;
      if (!valid) {
        errors.push({
          field: fieldName,
          message: `${fieldName} must be a boolean (true/false or 0/1)`,
          value,
        });
      }
      break;
    }

    case 'entity_reference': {
      const id = typeof value === 'string' ? parseInt(value, 10) : value;
      if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
        errors.push({
          field: fieldName,
          message: `${fieldName} must reference a valid entity (positive integer ID)`,
          value,
        });
      }
      break;
    }

    case 'list_string': {
      if (typeof value !== 'string') {
        errors.push({
          field: fieldName,
          message: `${fieldName} must be a string`,
          value,
        });
      } else if (settings?.allowed_values) {
        if (!(value in settings.allowed_values)) {
          const allowed = Object.keys(settings.allowed_values).join(', ');
          errors.push({
            field: fieldName,
            message: `${fieldName} must be one of: ${allowed}`,
            value,
          });
        }
      }
      break;
    }

    case 'timestamp': {
      const num = typeof value === 'string' ? Number(value) : value;
      if (typeof num !== 'number' || !Number.isFinite(num)) {
        errors.push({
          field: fieldName,
          message: `${fieldName} must be a valid timestamp`,
          value,
        });
      }
      break;
    }

    default: {
      // For unknown/custom types, delegate to the field type's validate method
      try {
        const ft = getFieldType(fieldType);
        if (!ft.validate(value, settings)) {
          errors.push({
            field: fieldName,
            message: `${fieldName} has an invalid value for type ${fieldType}`,
            value,
          });
        }
      } catch {
        // Unknown field type, skip validation
      }
      break;
    }
  }

  return errors;
}

/**
 * Validate all fields for an entity against its type definition.
 */
export function validateEntity(
  fields: Record<string, { type: string; required?: boolean; cardinality?: number; settings?: FieldSettings }>,
  values: Record<string, unknown>,
  baseFieldNames: string[] = ['nid', 'vid', 'uuid', 'type', 'langcode', 'title', 'status', 'uid', 'created', 'changed', 'promote', 'sticky', 'default_langcode', 'revision_translation_affected']
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    // Skip base fields
    if (baseFieldNames.includes(fieldName)) continue;

    const value = values[fieldName];
    const fieldErrors = validateFieldValue(
      fieldName,
      fieldDef.type,
      value,
      fieldDef.settings,
      {
        required: fieldDef.required,
        cardinality: fieldDef.cardinality,
      }
    );
    errors.push(...fieldErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
