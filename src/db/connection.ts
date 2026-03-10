import knex, { Knex } from 'knex';

export interface DropDbConfig {
  client: 'sqlite3' | 'mysql2' | 'pg';
  connection: {
    filename?: string;
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  };
}

const DEFAULT_CONFIG: DropDbConfig = {
  client: 'sqlite3',
  connection: {
    filename: './data/drop.db',
  },
};

// Use globalThis to share the DB connection across webpack module boundaries.
// Next.js server components get a separate module instance from the API handler,
// so a plain module-scoped variable would create duplicate connections.
const g = globalThis as unknown as { __dropjs_db?: Knex | null };

export function createConnection(config: DropDbConfig = DEFAULT_CONFIG): Knex {
  const knexConfig: Knex.Config = {
    client: config.client,
    connection: config.connection,
    useNullAsDefault: config.client === 'sqlite3',
  };

  g.__dropjs_db = knex(knexConfig);
  return g.__dropjs_db;
}

export function getConnection(): Knex {
  if (!g.__dropjs_db) {
    throw new Error(
      'Database not initialized. Call createConnection() first or use initDb().'
    );
  }
  return g.__dropjs_db;
}

export async function destroyConnection(): Promise<void> {
  if (g.__dropjs_db) {
    await g.__dropjs_db.destroy();
    g.__dropjs_db = null;
  }
}

export function initDb(config?: DropDbConfig): Knex {
  if (g.__dropjs_db) return g.__dropjs_db;
  return createConnection(config);
}
