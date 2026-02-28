import knex, { Knex } from 'knex';
import type { MigrateConfig } from './types.js';

let sourceInstance: Knex | null = null;

export function createSourceConnection(config: MigrateConfig): Knex {
  sourceInstance = knex({
    client: config.source.client,
    connection: config.source.connection,
  });
  return sourceInstance;
}

export function getSourceConnection(): Knex {
  if (!sourceInstance) {
    throw new Error('Source database not initialized. Call createSourceConnection() first.');
  }
  return sourceInstance;
}

export async function destroySourceConnection(): Promise<void> {
  if (sourceInstance) {
    await sourceInstance.destroy();
    sourceInstance = null;
  }
}
