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

let instance: Knex | null = null;

export function createConnection(config: DropDbConfig = DEFAULT_CONFIG): Knex {
  const knexConfig: Knex.Config = {
    client: config.client,
    connection: config.connection,
    useNullAsDefault: config.client === 'sqlite3',
  };

  instance = knex(knexConfig);
  return instance;
}

export function getConnection(): Knex {
  if (!instance) {
    throw new Error(
      'Database not initialized. Call createConnection() first or use initDb().'
    );
  }
  return instance;
}

export async function destroyConnection(): Promise<void> {
  if (instance) {
    await instance.destroy();
    instance = null;
  }
}

export function initDb(config?: DropDbConfig): Knex {
  if (instance) return instance;
  return createConnection(config);
}
