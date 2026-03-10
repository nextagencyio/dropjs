import { Knex } from 'knex';
import { getConnection, getDbClient } from './connection.js';

type Operator = '=' | '!=' | '<' | '<=' | '>' | '>=' | 'IN' | 'NOT IN' | 'LIKE' | 'IS NULL' | 'IS NOT NULL' | 'BETWEEN';

export class SelectQuery {
  private knexQuery: Knex.QueryBuilder;
  private selectedFields: string[] = [];

  constructor(table: string, alias?: string) {
    const conn = getConnection();
    this.knexQuery = alias ? conn({ [alias]: table }) : conn(table);
  }

  fields(tableOrFields: string | string[], fieldNames?: string[]): this {
    if (Array.isArray(tableOrFields)) {
      this.selectedFields.push(...tableOrFields);
      this.knexQuery = this.knexQuery.select(tableOrFields);
    } else if (fieldNames) {
      const prefixed = fieldNames.map((f) => `${tableOrFields}.${f}`);
      this.selectedFields.push(...prefixed);
      this.knexQuery = this.knexQuery.select(prefixed);
    }
    return this;
  }

  condition(field: string, value?: unknown, operator: Operator = '='): this {
    if (operator === 'IS NULL') {
      this.knexQuery = this.knexQuery.whereNull(field);
    } else if (operator === 'IS NOT NULL') {
      this.knexQuery = this.knexQuery.whereNotNull(field);
    } else if (operator === 'IN') {
      this.knexQuery = this.knexQuery.whereIn(field, value as Knex.Value[]);
    } else if (operator === 'NOT IN') {
      this.knexQuery = this.knexQuery.whereNotIn(field, value as Knex.Value[]);
    } else if (operator === 'BETWEEN') {
      const [min, max] = value as [Knex.Value, Knex.Value];
      this.knexQuery = this.knexQuery.whereBetween(field, [min, max]);
    } else if (operator === 'LIKE') {
      this.knexQuery = this.knexQuery.where(field, 'like', value as Knex.Value);
    } else {
      this.knexQuery = this.knexQuery.where(field, operator, value as Knex.Value);
    }
    return this;
  }

  join(table: string, alias: string, on: string): this {
    this.knexQuery = this.knexQuery.joinRaw(
      `JOIN ${table} AS ${alias} ON ${on}`
    );
    return this;
  }

  leftJoin(table: string, alias: string, on: string): this {
    this.knexQuery = this.knexQuery.joinRaw(
      `LEFT JOIN ${table} AS ${alias} ON ${on}`
    );
    return this;
  }

  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.knexQuery = this.knexQuery.orderBy(field, direction);
    return this;
  }

  range(offset: number, limit: number): this {
    this.knexQuery = this.knexQuery.offset(offset).limit(limit);
    return this;
  }

  groupBy(...fields: string[]): this {
    this.knexQuery = this.knexQuery.groupBy(...fields);
    return this;
  }

  distinct(): this {
    this.knexQuery = this.knexQuery.distinct();
    return this;
  }

  async execute<T = Record<string, unknown>>(): Promise<T[]> {
    if (this.selectedFields.length === 0) {
      this.knexQuery = this.knexQuery.select('*');
    }
    return this.knexQuery as unknown as Promise<T[]>;
  }

  toSQL(): Knex.Sql {
    return this.knexQuery.toSQL();
  }
}

export class InsertQuery {
  private knexQuery: Knex.QueryBuilder;
  private insertedKeys: Set<string> = new Set();

  constructor(private table: string) {
    this.knexQuery = getConnection()(table);
  }

  values(data: Record<string, unknown> | Record<string, unknown>[]): this {
    // Track which columns were explicitly set so we can identify auto-generated ones
    if (Array.isArray(data)) {
      if (data.length > 0) {
        for (const key of Object.keys(data[0])) this.insertedKeys.add(key);
      }
    } else {
      for (const key of Object.keys(data)) this.insertedKeys.add(key);
    }
    this.knexQuery = this.knexQuery.insert(data);
    return this;
  }

  async execute(): Promise<number[]> {
    const client = getDbClient();
    if (client === 'pg') {
      // PostgreSQL requires RETURNING to get auto-increment IDs
      const rows = await this.knexQuery.returning('*');
      return (rows as Record<string, unknown>[]).map((row) => {
        // Return the auto-generated column (not in the original insert data)
        for (const [key, val] of Object.entries(row)) {
          if (typeof val === 'number' && !this.insertedKeys.has(key)) return val;
        }
        // Fallback: return first numeric value
        for (const val of Object.values(row)) {
          if (typeof val === 'number') return val;
        }
        return 0;
      });
    }
    return this.knexQuery as unknown as Promise<number[]>;
  }
}

export class UpdateQuery {
  private knexQuery: Knex.QueryBuilder;

  constructor(table: string) {
    this.knexQuery = getConnection()(table);
  }

  set(data: Record<string, unknown>): this {
    this.knexQuery = this.knexQuery.update(data);
    return this;
  }

  condition(field: string, value?: unknown, operator: Operator = '='): this {
    if (operator === 'IN') {
      this.knexQuery = this.knexQuery.whereIn(field, value as Knex.Value[]);
    } else {
      this.knexQuery = this.knexQuery.where(field, operator, value as Knex.Value);
    }
    return this;
  }

  async execute(): Promise<number> {
    return this.knexQuery as unknown as Promise<number>;
  }
}

export class DeleteQuery {
  private knexQuery: Knex.QueryBuilder;

  constructor(table: string) {
    this.knexQuery = getConnection()(table);
  }

  condition(field: string, value?: unknown, operator: Operator = '='): this {
    if (operator === 'IN') {
      this.knexQuery = this.knexQuery.whereIn(field, value as Knex.Value[]);
    } else {
      this.knexQuery = this.knexQuery.where(field, operator, value as Knex.Value);
    }
    return this;
  }

  async execute(): Promise<number> {
    return this.knexQuery.del() as unknown as Promise<number>;
  }
}

export class TransactionQuery {
  constructor(private trx: Knex.Transaction) {}

  select(table: string, alias?: string): SelectQuery {
    const query = new SelectQuery(table, alias);
    (query as any).knexQuery = alias
      ? this.trx({ [alias]: table })
      : this.trx(table);
    return query;
  }

  insert(table: string): InsertQuery {
    const query = new InsertQuery(table);
    (query as any).knexQuery = this.trx(table);
    return query;
  }

  update(table: string): UpdateQuery {
    const query = new UpdateQuery(table);
    (query as any).knexQuery = this.trx(table);
    return query;
  }

  delete(table: string): DeleteQuery {
    const query = new DeleteQuery(table);
    (query as any).knexQuery = this.trx(table);
    return query;
  }
}

export const db = {
  select(table: string, alias?: string): SelectQuery {
    return new SelectQuery(table, alias);
  },

  insert(table: string): InsertQuery {
    return new InsertQuery(table);
  },

  update(table: string): UpdateQuery {
    return new UpdateQuery(table);
  },

  delete(table: string): DeleteQuery {
    return new DeleteQuery(table);
  },

  async transaction<T>(
    callback: (trx: TransactionQuery) => Promise<T>
  ): Promise<T> {
    const conn = getConnection();
    return conn.transaction(async (knexTrx) => {
      const trxQuery = new TransactionQuery(knexTrx);
      return callback(trxQuery);
    });
  },

  async raw<T = unknown>(sql: string, bindings: unknown[] = []): Promise<T> {
    const conn = getConnection();
    const result = await conn.raw(sql, bindings as Knex.RawBinding[]);
    return result as T;
  },
};
