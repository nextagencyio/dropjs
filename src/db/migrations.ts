import { Knex } from 'knex';
import { getConnection } from './connection.js';

export interface MigrationResult {
  batch: number;
  name: string;
}

export interface MigrationStatus {
  completed: MigrationResult[];
  pending: string[];
}

export const migrations = {
  async run(directory?: string): Promise<[number, string[]]> {
    const conn = getConnection();
    const config: Knex.MigratorConfig = {};
    if (directory) {
      config.directory = directory;
    }
    return conn.migrate.latest(config);
  },

  async rollback(directory?: string): Promise<[number, string[]]> {
    const conn = getConnection();
    const config: Knex.MigratorConfig = {};
    if (directory) {
      config.directory = directory;
    }
    return conn.migrate.rollback(config);
  },

  async status(directory?: string): Promise<MigrationStatus> {
    const conn = getConnection();
    const config: Knex.MigratorConfig = {};
    if (directory) {
      config.directory = directory;
    }

    const [completed] = await conn.migrate.list(config);
    const pending = await conn.migrate.list(config).then(([_, p]) => p as string[]);

    return {
      completed: completed as MigrationResult[],
      pending,
    };
  },

  async currentVersion(directory?: string): Promise<string> {
    const conn = getConnection();
    const config: Knex.MigratorConfig = {};
    if (directory) {
      config.directory = directory;
    }
    return conn.migrate.currentVersion(config);
  },
};
