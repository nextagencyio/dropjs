import { db } from '../db/index.js';
import { loadConfig, saveConfig, deleteConfig, loadAllConfig } from './config-storage.js';
import { EventBus } from './event-bus.js';

// ─── Types ─────────────────────────────────────────────────

export type ConstraintType =
  | 'required'
  | 'min_length'
  | 'max_length'
  | 'pattern'
  | 'min'
  | 'max'
  | 'unique'
  | 'custom';

export interface FieldConstraint {
  type: ConstraintType;
  message: string;
  options?: Record<string, unknown>;
}

export interface ValidationError {
  field: string;
  message: string;
  constraint: ConstraintType;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ─── Config key helpers ────────────────────────────────────

function constraintConfigKey(
  entityType: string,
  bundle: string,
  fieldName: string
): string {
  return `field.constraints.${entityType}.${bundle}.${fieldName}`;
}

function constraintConfigPrefix(
  entityType: string,
  bundle: string
): string {
  return `field.constraints.${entityType}.${bundle}.`;
}

// ─── Constraint storage ────────────────────────────────────

/**
 * Get all field constraints for an entity type/bundle.
 * Returns a map of fieldName -> FieldConstraint[].
 */
export async function getFieldConstraints(
  entityType: string,
  bundle: string
): Promise<Record<string, FieldConstraint[]>> {
  const prefix = constraintConfigPrefix(entityType, bundle);
  const allConfig = await loadAllConfig(prefix);

  const result: Record<string, FieldConstraint[]> = {};
  for (const [key, data] of Object.entries(allConfig)) {
    // key = field.constraints.node.article.field_body
    const fieldName = key.replace(prefix, '');
    if (fieldName && data.constraints) {
      result[fieldName] = data.constraints as FieldConstraint[];
    }
  }
  return result;
}

/**
 * Set constraints for a specific field on an entity type/bundle.
 */
export async function setFieldConstraints(
  entityType: string,
  bundle: string,
  fieldName: string,
  constraints: FieldConstraint[]
): Promise<void> {
  const key = constraintConfigKey(entityType, bundle, fieldName);
  await saveConfig(key, { constraints });
}

/**
 * Remove constraints for a specific field.
 */
export async function removeFieldConstraints(
  entityType: string,
  bundle: string,
  fieldName: string
): Promise<boolean> {
  const key = constraintConfigKey(entityType, bundle, fieldName);
  return deleteConfig(key);
}

// ─── Built-in validators ───────────────────────────────────

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

function validateRequired(
  field: string,
  value: unknown,
  constraint: FieldConstraint
): ValidationError | null {
  if (isEmpty(value)) {
    return {
      field,
      message: constraint.message,
      constraint: 'required',
    };
  }
  return null;
}

function validateMinLength(
  field: string,
  value: unknown,
  constraint: FieldConstraint
): ValidationError | null {
  if (isEmpty(value)) return null; // Skip if empty — use 'required' for that
  const min = constraint.options?.min as number;
  if (typeof min !== 'number') return null;
  const str = String(value);
  if (str.length < min) {
    return {
      field,
      message: constraint.message,
      constraint: 'min_length',
    };
  }
  return null;
}

function validateMaxLength(
  field: string,
  value: unknown,
  constraint: FieldConstraint
): ValidationError | null {
  if (isEmpty(value)) return null;
  const max = constraint.options?.max as number;
  if (typeof max !== 'number') return null;
  const str = String(value);
  if (str.length > max) {
    return {
      field,
      message: constraint.message,
      constraint: 'max_length',
    };
  }
  return null;
}

function validatePattern(
  field: string,
  value: unknown,
  constraint: FieldConstraint
): ValidationError | null {
  if (isEmpty(value)) return null;
  const pattern = constraint.options?.pattern as string;
  if (!pattern) return null;
  const regex = new RegExp(pattern);
  if (!regex.test(String(value))) {
    return {
      field,
      message: constraint.message,
      constraint: 'pattern',
    };
  }
  return null;
}

function validateMin(
  field: string,
  value: unknown,
  constraint: FieldConstraint
): ValidationError | null {
  if (isEmpty(value)) return null;
  const min = constraint.options?.min as number;
  if (typeof min !== 'number') return null;
  const num = Number(value);
  if (isNaN(num) || num < min) {
    return {
      field,
      message: constraint.message,
      constraint: 'min',
    };
  }
  return null;
}

function validateMax(
  field: string,
  value: unknown,
  constraint: FieldConstraint
): ValidationError | null {
  if (isEmpty(value)) return null;
  const max = constraint.options?.max as number;
  if (typeof max !== 'number') return null;
  const num = Number(value);
  if (isNaN(num) || num > max) {
    return {
      field,
      message: constraint.message,
      constraint: 'max',
    };
  }
  return null;
}

async function validateUnique(
  field: string,
  value: unknown,
  constraint: FieldConstraint,
  entityType: string,
  bundle: string
): Promise<ValidationError | null> {
  if (isEmpty(value)) return null;

  // Check uniqueness in the field storage table
  const tableName = `${entityType}__${field}`;
  try {
    const rows = await db
      .select(tableName)
      .fields(['entity_id'])
      .condition('bundle', bundle)
      .condition(`${field}_value`, value)
      .range(0, 1)
      .execute<{ entity_id: number }>();

    if (rows.length > 0) {
      return {
        field,
        message: constraint.message,
        constraint: 'unique',
      };
    }
  } catch {
    // If the table doesn't exist yet, value is inherently unique.
    // Also handles base fields like 'title' which live in entity tables.
    // Try checking base table for title field
    if (field === 'title') {
      try {
        const baseTable = entityType === 'node' ? 'node_field_data' : entityType;
        const rows = await db
          .select(baseTable)
          .fields(['nid'])
          .condition('type', bundle)
          .condition('title', value)
          .range(0, 1)
          .execute<{ nid: number }>();

        if (rows.length > 0) {
          return {
            field,
            message: constraint.message,
            constraint: 'unique',
          };
        }
      } catch {
        // Ignore — table may not exist yet
      }
    }
  }
  return null;
}

// Custom validator registry for programmatic use
// Stored on globalThis for webpack module sharing.
type ValidatorFn = (field: string, value: unknown, options?: Record<string, unknown>) => ValidationError | null;
const gVal = globalThis as unknown as { __dropjs_custom_validators?: Map<string, ValidatorFn> };
if (!gVal.__dropjs_custom_validators) gVal.__dropjs_custom_validators = new Map<string, ValidatorFn>();
const customValidators: Map<string, ValidatorFn> = gVal.__dropjs_custom_validators;

export function registerCustomValidator(
  name: string,
  fn: (field: string, value: unknown, options?: Record<string, unknown>) => ValidationError | null
): void {
  customValidators.set(name, fn);
}

// ─── Main validation function ──────────────────────────────

/**
 * Validate entity data against its field constraints.
 * Returns { valid, errors }.
 */
export async function validateEntity(
  entityType: string,
  bundle: string,
  data: Record<string, unknown>
): Promise<ValidationResult> {
  const constraintsMap = await getFieldConstraints(entityType, bundle);
  const errors: ValidationError[] = [];

  for (const [fieldName, constraints] of Object.entries(constraintsMap)) {
    const value = data[fieldName];

    for (const constraint of constraints) {
      let error: ValidationError | null = null;

      switch (constraint.type) {
        case 'required':
          error = validateRequired(fieldName, value, constraint);
          break;
        case 'min_length':
          error = validateMinLength(fieldName, value, constraint);
          break;
        case 'max_length':
          error = validateMaxLength(fieldName, value, constraint);
          break;
        case 'pattern':
          error = validatePattern(fieldName, value, constraint);
          break;
        case 'min':
          error = validateMin(fieldName, value, constraint);
          break;
        case 'max':
          error = validateMax(fieldName, value, constraint);
          break;
        case 'unique':
          error = await validateUnique(fieldName, value, constraint, entityType, bundle);
          break;
        case 'custom': {
          const validatorName = constraint.options?.validator as string;
          if (validatorName) {
            const fn = customValidators.get(validatorName);
            if (fn) {
              error = fn(fieldName, value, constraint.options);
            }
          }
          break;
        }
      }

      if (error) {
        errors.push(error);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ─── EventBus hook ─────────────────────────────────────────

/**
 * Register entity:presave validation hook.
 * Validates entity data against configured constraints before saving.
 * Throws an error with 422 status if validation fails.
 */
export function registerValidationHooks(): void {
  EventBus.on(
    'entity:presave',
    async (data: unknown) => {
      const entity = data as {
        entityType: string;
        bundle: string;
        toJSON: () => Record<string, unknown>;
      };

      if (!entity.entityType || !entity.bundle) return;

      const result = await validateEntity(
        entity.entityType,
        entity.bundle,
        entity.toJSON()
      );

      if (!result.valid) {
        const err = new Error('Validation failed');
        (err as any).status = 422;
        (err as any).details = result.errors;
        throw err;
      }
    },
    { priority: 10 } // Run early in presave
  );
}
