import { schema as dbSchema, db, getConnection } from '../db/index.js';
import type { TableDefinition, ColumnDefinition } from '../db/index.js';
import { getFieldType, type FieldSettings } from './field-type.js';

export function fieldTableName(entityType: string, fieldName: string): string {
  return `${entityType}__${fieldName}`;
}

function fieldRevisionTableName(entityType: string, fieldName: string): string {
  return `${entityType}_revision__${fieldName}`;
}

export const fieldStorage = {
  /**
   * Create the storage table for a field on an entity type.
   * Table name follows Drupal convention: {entity_type}__{field_name}
   * Also creates revision table: {entity_type}_revision__{field_name}
   */
  async createFieldTable(
    entityType: string,
    fieldName: string,
    fieldTypeName: string,
    settings?: FieldSettings
  ): Promise<void> {
    const fieldType = getFieldType(fieldTypeName);
    const fieldSchema = fieldType.schema(settings);

    const tableName = fieldTableName(entityType, fieldName);
    const revisionTableName = fieldRevisionTableName(entityType, fieldName);

    const fields: Record<string, ColumnDefinition> = {
      entity_id: {
        type: 'int',
        unsigned: true,
        nullable: false,
      },
      deleted: {
        type: 'int',
        unsigned: true,
        nullable: false,
        default: 0,
      },
      revision_id: {
        type: 'int',
        unsigned: true,
        nullable: false,
      },
      langcode: {
        type: 'varchar',
        length: 12,
        nullable: false,
        default: 'en',
      },
      bundle: {
        type: 'varchar',
        length: 128,
        nullable: false,
      },
      delta: {
        type: 'int',
        unsigned: true,
        nullable: false,
        default: 0,
      },
    };

    // Add field-specific columns, prefixed with field name
    for (const [colName, colDef] of Object.entries(fieldSchema.columns)) {
      const fullColName = `${fieldName}_${colName}`;
      fields[fullColName] = colDef;
    }

    const tableDef: TableDefinition = {
      fields,
      primaryKey: ['entity_id', 'deleted', 'delta', 'langcode'],
      indexes: {
        [`idx_${tableName}_entity`]: ['entity_id'],
        [`idx_${tableName}_bundle`]: ['bundle'],
      },
    };

    await dbSchema.createTable(tableName, tableDef);

    // If the table already existed, ensure field-specific columns are present
    // (different bundles may share a field name with different types)
    const conn = getConnection();
    for (const [colName, colDef] of Object.entries(fieldSchema.columns)) {
      const fullColName = `${fieldName}_${colName}`;
      const hasCol = await conn.schema.hasColumn(tableName, fullColName);
      if (!hasCol) {
        await dbSchema.addColumn(tableName, fullColName, colDef);
      }
    }

    // Create revision table with same schema but different primaryKey
    const revisionTableDef: TableDefinition = {
      fields: { ...fields },
      primaryKey: ['entity_id', 'revision_id', 'deleted', 'delta', 'langcode'],
      indexes: {
        [`idx_${revisionTableName}_entity`]: ['entity_id'],
        [`idx_${revisionTableName}_bundle`]: ['bundle'],
      },
    };

    await dbSchema.createTable(revisionTableName, revisionTableDef);

    // Ensure field-specific columns exist in revision table too
    for (const [colName, colDef] of Object.entries(fieldSchema.columns)) {
      const fullColName = `${fieldName}_${colName}`;
      const hasCol = await conn.schema.hasColumn(revisionTableName, fullColName);
      if (!hasCol) {
        await dbSchema.addColumn(revisionTableName, fullColName, colDef);
      }
    }
  },

  /**
   * Drop the storage table for a field.
   */
  async dropFieldTable(entityType: string, fieldName: string): Promise<void> {
    await dbSchema.dropTable(fieldTableName(entityType, fieldName));
    await dbSchema.dropTable(fieldRevisionTableName(entityType, fieldName));
  },

  /**
   * Load all values for a field on an entity.
   * Returns array of value objects (for multi-value fields).
   */
  async loadFieldValues(
    entityType: string,
    entityId: number,
    fieldName: string,
    fieldTypeName: string,
    settings?: FieldSettings
  ): Promise<unknown[]> {
    const tableName = fieldTableName(entityType, fieldName);
    const fieldType = getFieldType(fieldTypeName);
    const fieldSchema = fieldType.schema(settings);
    const columnNames = Object.keys(fieldSchema.columns).map(
      (col) => `${fieldName}_${col}`
    );

    const rows = await db
      .select(tableName)
      .fields([...columnNames, 'delta'])
      .condition('entity_id', entityId)
      .condition('deleted', 0)
      .condition('langcode', 'en')
      .orderBy('delta', 'ASC')
      .execute<Record<string, unknown>>();

    return rows.map((row) => {
      // Strip field name prefix from column names for the returned value
      const value: Record<string, unknown> = {};
      for (const col of Object.keys(fieldSchema.columns)) {
        value[col] = row[`${fieldName}_${col}`];
      }

      // If only a single "value" column, unwrap to scalar
      const colNames = Object.keys(fieldSchema.columns);
      if (colNames.length === 1 && colNames[0] === 'value') {
        return fieldType.deserialize(value.value, settings);
      }

      return fieldType.deserialize(value, settings);
    });
  },

  /**
   * Save field values for an entity.
   * Replaces all existing values (delete + insert).
   */
  async saveFieldValues(
    entityType: string,
    entityId: number,
    bundle: string,
    fieldName: string,
    fieldTypeName: string,
    values: unknown[],
    settings?: FieldSettings,
    vid?: number
  ): Promise<void> {
    const tableName = fieldTableName(entityType, fieldName);
    const revisionTable = fieldRevisionTableName(entityType, fieldName);
    const fieldType = getFieldType(fieldTypeName);
    const fieldSchema = fieldType.schema(settings);
    const revisionId = vid ?? entityId;

    // Delete existing values from field table
    await db.delete(tableName).condition('entity_id', entityId).execute();

    if (values.length === 0) return;

    // Insert new values
    const rows = values.map((value, delta) => {
      const serialized = fieldType.serialize(value, settings);
      const row: Record<string, unknown> = {
        entity_id: entityId,
        deleted: 0,
        revision_id: revisionId,
        langcode: 'en',
        bundle,
        delta,
      };

      const colNames = Object.keys(fieldSchema.columns);
      if (colNames.length === 1 && colNames[0] === 'value') {
        // Single-column field: value is scalar
        row[`${fieldName}_value`] = serialized;
      } else if (typeof serialized === 'object' && serialized !== null) {
        // Multi-column field: value is object
        for (const col of colNames) {
          row[`${fieldName}_${col}`] = (serialized as Record<string, unknown>)[col] ?? null;
        }
      }

      return row;
    });

    await db.insert(tableName).values(rows).execute();

    // Also write to revision table (delete existing for this revision, then insert)
    const hasRevisionTable = await dbSchema.hasTable(revisionTable);
    if (hasRevisionTable) {
      await db.delete(revisionTable)
        .condition('entity_id', entityId)
        .condition('revision_id', revisionId)
        .execute();

      await db.insert(revisionTable).values(rows).execute();
    }
  },

  /**
   * Load field values for a specific revision of an entity.
   * Reads from the revision table instead of the main field table.
   */
  async loadFieldRevisionValues(
    entityType: string,
    entityId: number,
    revisionId: number,
    fieldName: string,
    fieldTypeName: string,
    settings?: FieldSettings
  ): Promise<unknown[]> {
    const revisionTable = fieldRevisionTableName(entityType, fieldName);
    const hasTable = await dbSchema.hasTable(revisionTable);
    if (!hasTable) return [];

    const fieldType = getFieldType(fieldTypeName);
    const fieldSchema = fieldType.schema(settings);
    const columnNames = Object.keys(fieldSchema.columns).map(
      (col) => `${fieldName}_${col}`
    );

    const rows = await db
      .select(revisionTable)
      .fields([...columnNames, 'delta'])
      .condition('entity_id', entityId)
      .condition('revision_id', revisionId)
      .condition('deleted', 0)
      .condition('langcode', 'en')
      .orderBy('delta', 'ASC')
      .execute<Record<string, unknown>>();

    return rows.map((row) => {
      const value: Record<string, unknown> = {};
      for (const col of Object.keys(fieldSchema.columns)) {
        value[col] = row[`${fieldName}_${col}`];
      }

      const colNames = Object.keys(fieldSchema.columns);
      if (colNames.length === 1 && colNames[0] === 'value') {
        return fieldType.deserialize(value.value, settings);
      }

      return fieldType.deserialize(value, settings);
    });
  },

  /**
   * Delete all field values for an entity.
   */
  async deleteFieldValues(
    entityType: string,
    entityId: number,
    fieldName: string
  ): Promise<void> {
    const tableName = fieldTableName(entityType, fieldName);
    const revisionTable = fieldRevisionTableName(entityType, fieldName);

    await db.delete(tableName).condition('entity_id', entityId).execute();

    // Also delete from revision table
    const hasRevisionTable = await dbSchema.hasTable(revisionTable);
    if (hasRevisionTable) {
      await db.delete(revisionTable).condition('entity_id', entityId).execute();
    }
  },

  /**
   * Load field values for a specific langcode.
   */
  async loadFieldValuesWithLangcode(
    entityType: string,
    entityId: number,
    fieldName: string,
    fieldTypeName: string,
    langcode: string,
    settings?: FieldSettings
  ): Promise<unknown[]> {
    const tableName = fieldTableName(entityType, fieldName);
    const fieldType = getFieldType(fieldTypeName);
    const fieldSchema = fieldType.schema(settings);
    const columnNames = Object.keys(fieldSchema.columns).map(
      (col) => `${fieldName}_${col}`
    );

    const rows = await db
      .select(tableName)
      .fields([...columnNames, 'delta'])
      .condition('entity_id', entityId)
      .condition('deleted', 0)
      .condition('langcode', langcode)
      .orderBy('delta', 'ASC')
      .execute<Record<string, unknown>>();

    return rows.map((row) => {
      const value: Record<string, unknown> = {};
      for (const col of Object.keys(fieldSchema.columns)) {
        value[col] = row[`${fieldName}_${col}`];
      }

      const colNames = Object.keys(fieldSchema.columns);
      if (colNames.length === 1 && colNames[0] === 'value') {
        return fieldType.deserialize(value.value, settings);
      }

      return fieldType.deserialize(value, settings);
    });
  },

  /**
   * Save field values for a specific langcode.
   */
  async saveFieldValuesWithLangcode(
    entityType: string,
    entityId: number,
    bundle: string,
    fieldName: string,
    fieldTypeName: string,
    values: unknown[],
    langcode: string,
    settings?: FieldSettings,
    vid?: number
  ): Promise<void> {
    const tableName = fieldTableName(entityType, fieldName);
    const revisionTable = fieldRevisionTableName(entityType, fieldName);
    const fieldType = getFieldType(fieldTypeName);
    const fieldSchema = fieldType.schema(settings);
    const revisionId = vid ?? entityId;

    // Delete existing values for this langcode
    await db.delete(tableName)
      .condition('entity_id', entityId)
      .condition('langcode', langcode)
      .execute();

    if (values.length === 0) return;

    const rows = values.map((value, delta) => {
      const serialized = fieldType.serialize(value, settings);
      const row: Record<string, unknown> = {
        entity_id: entityId,
        deleted: 0,
        revision_id: revisionId,
        langcode,
        bundle,
        delta,
      };

      const colNames = Object.keys(fieldSchema.columns);
      if (colNames.length === 1 && colNames[0] === 'value') {
        row[`${fieldName}_value`] = serialized;
      } else if (typeof serialized === 'object' && serialized !== null) {
        for (const col of colNames) {
          row[`${fieldName}_${col}`] = (serialized as Record<string, unknown>)[col] ?? null;
        }
      }

      return row;
    });

    await db.insert(tableName).values(rows).execute();

    // Also write to revision table
    const hasRevisionTable = await dbSchema.hasTable(revisionTable);
    if (hasRevisionTable) {
      await db.delete(revisionTable)
        .condition('entity_id', entityId)
        .condition('revision_id', revisionId)
        .condition('langcode', langcode)
        .execute();
      await db.insert(revisionTable).values(rows).execute();
    }
  },

  /**
   * Delete field values for a specific langcode only.
   */
  async deleteFieldValuesForLangcode(
    entityType: string,
    entityId: number,
    fieldName: string,
    langcode: string
  ): Promise<void> {
    const tableName = fieldTableName(entityType, fieldName);
    const revisionTable = fieldRevisionTableName(entityType, fieldName);

    await db.delete(tableName)
      .condition('entity_id', entityId)
      .condition('langcode', langcode)
      .execute();

    const hasRevisionTable = await dbSchema.hasTable(revisionTable);
    if (hasRevisionTable) {
      await db.delete(revisionTable)
        .condition('entity_id', entityId)
        .condition('langcode', langcode)
        .execute();
    }
  },
};
