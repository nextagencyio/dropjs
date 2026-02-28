import * as path from 'node:path';
import * as fs from 'node:fs';
import type { MigrateConfig } from './types.js';

export async function loadMigrateConfig(configPath?: string): Promise<MigrateConfig> {
  const resolvedPath = configPath ?? path.resolve(process.cwd(), 'migrate.config.js');

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Migration config not found at ${resolvedPath}`);
  }

  const configModule = await import(resolvedPath);
  const config = configModule.default as MigrateConfig;

  if (!config.source) {
    throw new Error('migrate.config.js must export a "source" database configuration');
  }

  return config;
}
