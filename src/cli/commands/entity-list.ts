import * as path from 'node:path';
import * as fs from 'node:fs';
import { createConnection, destroyConnection } from '../../db/index.js';
import { loadEntityTypesFromDir, getAllEntityTypes } from '../../core/index.js';

// Ensure field type registration
import '../../field/index.js';

export async function entityList(): Promise<void> {
  // Initialize database
  const configPath = path.resolve(process.cwd(), 'drop.config.js');
  const dataDir = process.env.DROP_DATA_DIR || './data';
  const dbFilename = path.resolve(path.join(dataDir, 'drop.db'));
  let dbConfig: any = {
    client: 'sqlite3',
    connection: { filename: dbFilename },
  };

  if (fs.existsSync(configPath)) {
    try {
      const config = await import(configPath);
      dbConfig = config.default?.database ?? dbConfig;
    } catch {
      // Use default config
    }
  }

  if (dbConfig.client === 'sqlite3' && dbConfig.connection?.filename) {
    const dir = path.dirname(dbConfig.connection.filename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  createConnection(dbConfig);

  // Load entity types from config directory
  const entityTypesDir = path.resolve(process.cwd(), 'config', 'entity_types');
  if (fs.existsSync(entityTypesDir)) {
    await loadEntityTypesFromDir(entityTypesDir);
  }

  const types = getAllEntityTypes();

  if (types.length === 0) {
    console.log('No entity types registered.');
    await destroyConnection();
    return;
  }

  console.log(`\nRegistered entity types (${types.length}):\n`);

  // Group by entity_type
  const grouped = new Map<string, typeof types>();
  for (const t of types) {
    const group = grouped.get(t.entity_type) ?? [];
    group.push(t);
    grouped.set(t.entity_type, group);
  }

  for (const [entityType, defs] of grouped) {
    console.log(`  ${entityType}:`);
    for (const def of defs) {
      const fieldCount = Object.keys(def.fields).length;
      console.log(`    - ${def.bundle} (${def.label}) [${fieldCount} fields]`);
      for (const [fieldName, fieldDef] of Object.entries(def.fields)) {
        const required = fieldDef.required ? ' *' : '';
        const cardinality =
          fieldDef.cardinality === -1
            ? ' [unlimited]'
            : fieldDef.cardinality && fieldDef.cardinality > 1
              ? ` [max ${fieldDef.cardinality}]`
              : '';
        console.log(`        ${fieldName}: ${fieldDef.type}${required}${cardinality}`);
      }
    }
  }

  console.log('');
  await destroyConnection();
}
