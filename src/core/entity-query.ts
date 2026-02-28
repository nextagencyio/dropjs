import { db } from '../db/index.js';
import { fieldTableName } from '../field/index.js';
import { getEntityTypeDefinition, getEntityTypesForType } from './entity-type.js';

type Operator = '=' | '!=' | '<' | '<=' | '>' | '>=' | 'IN' | 'NOT IN' | 'LIKE';

interface QueryCondition {
  field: string;
  value: unknown;
  operator: Operator;
}

interface QuerySort {
  field: string;
  direction: 'ASC' | 'DESC';
}

function getBaseTableAndIdField(entityType: string): { table: string; idField: string } {
  if (entityType === 'node') {
    return { table: 'node_field_data', idField: 'nid' };
  }
  if (entityType === 'taxonomy_term') {
    return { table: 'taxonomy_term_field_data', idField: 'tid' };
  }
  if (entityType === 'media') {
    return { table: 'media_field_data', idField: 'mid' };
  }
  return { table: entityType, idField: 'nid' };
}

function getBaseFields(entityType: string): string[] {
  if (entityType === 'node') {
    return ['nid', 'vid', 'uuid', 'type', 'title', 'status', 'uid', 'created', 'changed', 'langcode', 'promote', 'sticky', 'default_langcode'];
  }
  if (entityType === 'taxonomy_term') {
    // 'title' is included as an alias for 'name' so condition/sort on 'title' works
    return ['tid', 'vid', 'type', 'langcode', 'name', 'title', 'status', 'changed', 'weight', 'default_langcode'];
  }
  if (entityType === 'media') {
    // 'title' is included as an alias for 'name' so condition/sort on 'title' works
    // 'type' is mapped to 'bundle' column in media tables
    return ['mid', 'vid', 'bundle', 'type', 'langcode', 'name', 'title', 'status', 'uid', 'created', 'changed', 'default_langcode'];
  }
  return ['nid', 'uuid', 'type', 'title', 'status', 'uid', 'created', 'changed', 'langcode'];
}

// Maps abstract field names to actual column names on the base table
function mapColumnName(entityType: string, field: string): string {
  if (entityType === 'taxonomy_term' && field === 'title') {
    return 'name';
  }
  if (entityType === 'media') {
    if (field === 'title') return 'name';
    if (field === 'type') return 'bundle';
  }
  return field;
}

export class EntityQuery {
  private entityType: string;
  private bundleFilter?: string;
  private conditions: QueryCondition[] = [];
  private sorts: QuerySort[] = [];
  private offset?: number;
  private limit?: number;

  constructor(entityType: string) {
    this.entityType = entityType;
  }

  condition(field: string, value: unknown, operator: Operator = '='): this {
    if (field === 'type') {
      this.bundleFilter = value as string;
    }
    this.conditions.push({ field, value, operator });
    return this;
  }

  sort(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.sorts.push({ field, direction });
    return this;
  }

  range(offset: number, limit: number): this {
    this.offset = offset;
    this.limit = limit;
    return this;
  }

  async execute(): Promise<number[]> {
    const { table, idField } = getBaseTableAndIdField(this.entityType);
    const baseFields = getBaseFields(this.entityType);

    const baseConditions: QueryCondition[] = [];
    const fieldConditions: QueryCondition[] = [];

    for (const cond of this.conditions) {
      if (baseFields.includes(cond.field)) {
        baseConditions.push(cond);
      } else {
        fieldConditions.push(cond);
      }
    }

    // Build the base query
    let query = db.select(table, 'base');
    query = query.fields('base', [idField]);

    // For entity types with field_data tables, add langcode condition
    if (this.entityType === 'node') {
      query = query.condition('base.langcode', 'en');
    } else if (this.entityType === 'taxonomy_term') {
      query = query.condition('base.langcode', 'en');
    } else if (this.entityType === 'media') {
      query = query.condition('base.langcode', 'en');
    }

    // Apply base conditions
    for (const cond of baseConditions) {
      const col = mapColumnName(this.entityType, cond.field);
      query = query.condition(`base.${col}`, cond.value, cond.operator);
    }

    // Apply field conditions by joining field tables
    let joinIndex = 0;
    for (const cond of fieldConditions) {
      const fieldName = cond.field;
      const alias = `f${joinIndex++}`;
      const tableName = fieldTableName(this.entityType, fieldName);

      // Get the field type to determine column name
      let valueColumn = `${fieldName}_value`;
      if (this.bundleFilter) {
        const typeDef = getEntityTypeDefinition(this.entityType, this.bundleFilter);
        if (typeDef?.fields[fieldName]) {
          const fieldDef = typeDef.fields[fieldName];
          if (fieldDef.type === 'entity_reference' || fieldDef.type === 'image') {
            valueColumn = `${fieldName}_target_id`;
          }
        }
      }

      query = query.join(
        tableName,
        alias,
        `base.${idField} = ${alias}.entity_id`
      );
      query = query.condition(`${alias}.${valueColumn}`, cond.value, cond.operator);
    }

    // Apply sorting
    for (const sort of this.sorts) {
      const col = mapColumnName(this.entityType, sort.field);
      if (baseFields.includes(sort.field)) {
        query = query.orderBy(`base.${col}`, sort.direction);
      } else {
        query = query.orderBy(`base.${col}`, sort.direction);
      }
    }

    // Apply range
    if (this.offset !== undefined && this.limit !== undefined) {
      query = query.range(this.offset, this.limit);
    }

    query = query.distinct();

    const rows = await query.execute<Record<string, number>>();
    return rows.map((r) => r[idField]);
  }
}
