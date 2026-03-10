import { Knex } from 'knex';
import { getConnection } from './connection.js';

export interface ColumnDefinition {
  type: 'serial' | 'int' | 'bigint' | 'float' | 'decimal' | 'varchar' | 'text' | 'boolean' | 'timestamp' | 'json' | 'blob';
  primary?: boolean;
  nullable?: boolean;
  default?: unknown;
  length?: number;       // for varchar
  precision?: number;    // for decimal
  scale?: number;        // for decimal
  unsigned?: boolean;
  unique?: boolean;
  references?: {
    table: string;
    column: string;
  };
}

export interface TableDefinition {
  fields: Record<string, ColumnDefinition>;
  indexes?: Record<string, string[]>;
  unique?: Record<string, string[]>;
  primaryKey?: string[];
}

export interface SchemaDefinition {
  tables: Record<string, TableDefinition>;
}

function applyColumn(table: Knex.CreateTableBuilder, name: string, def: ColumnDefinition, hasCompositePK: boolean = false): void {
  let col: Knex.ColumnBuilder;

  switch (def.type) {
    case 'serial':
      if (hasCompositePK) {
        // Knex's .increments() always sets PRIMARY KEY on the column, conflicting with composite PKs
        col = table.integer(name).unsigned().notNullable();
        break;
      }
      col = table.increments(name);
      return; // increments handles primary key
    case 'int':
      col = table.integer(name);
      break;
    case 'bigint':
      col = table.bigInteger(name);
      break;
    case 'float':
      col = table.float(name);
      break;
    case 'decimal':
      col = table.decimal(name, def.precision ?? 10, def.scale ?? 2);
      break;
    case 'varchar':
      col = table.string(name, def.length ?? 255);
      break;
    case 'text':
      col = table.text(name);
      break;
    case 'boolean':
      col = table.boolean(name);
      break;
    case 'timestamp':
      col = table.timestamp(name);
      break;
    case 'json':
      col = table.json(name);
      break;
    case 'blob':
      col = table.binary(name);
      break;
    default:
      throw new Error(`Unknown column type: ${def.type}`);
  }

  if (def.primary) col = col.primary();
  if (def.nullable === false) col = col.notNullable();
  if (def.nullable === true) col = col.nullable();
  if (def.unsigned) col = (col as any).unsigned();
  if (def.unique) col = col.unique();

  if (def.default !== undefined) {
    if (def.default === 'now') {
      col = col.defaultTo(getConnection().fn.now());
    } else {
      col = col.defaultTo(def.default as Knex.Value);
    }
  }

  if (def.references) {
    col.references(def.references.column).inTable(def.references.table);
  }
}

export const schema = {
  async createTable(name: string, definition: TableDefinition): Promise<void> {
    const conn = getConnection();
    const exists = await conn.schema.hasTable(name);
    if (exists) return;

    const hasCompositePK = !!(definition.primaryKey && definition.primaryKey.length > 0);

    await conn.schema.createTable(name, (table) => {
      // Columns
      for (const [colName, colDef] of Object.entries(definition.fields)) {
        applyColumn(table, colName, colDef, hasCompositePK);
      }

      // Composite primary key
      if (definition.primaryKey) {
        table.primary(definition.primaryKey);
      }

      // Indexes
      if (definition.indexes) {
        for (const [indexName, columns] of Object.entries(definition.indexes)) {
          table.index(columns, indexName);
        }
      }

      // Unique constraints
      if (definition.unique) {
        for (const [constraintName, columns] of Object.entries(definition.unique)) {
          table.unique(columns, { indexName: constraintName });
        }
      }
    });
  },

  async dropTable(name: string): Promise<void> {
    const conn = getConnection();
    await conn.schema.dropTableIfExists(name);
  },

  async hasTable(name: string): Promise<boolean> {
    const conn = getConnection();
    return conn.schema.hasTable(name);
  },

  async addColumn(table: string, name: string, definition: ColumnDefinition): Promise<void> {
    const conn = getConnection();
    await conn.schema.alterTable(table, (t) => {
      applyColumn(t, name, definition);
    });
  },

  async dropColumn(table: string, name: string): Promise<void> {
    const conn = getConnection();
    await conn.schema.alterTable(table, (t) => {
      t.dropColumn(name);
    });
  },

  async installSchema(definition: SchemaDefinition): Promise<void> {
    for (const [tableName, tableDef] of Object.entries(definition.tables)) {
      await schema.createTable(tableName, tableDef);
    }
  },
};
