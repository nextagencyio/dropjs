import * as path from 'node:path';
import * as fs from 'node:fs';
import {
  createSourceConnection,
  destroySourceConnection,
  DrupalSchemaReader,
  SchemaGenerator,
  ContentMigrator,
  formatAnalysisReport,
  loadMigrateConfig,
} from '../../migrate/index.js';
import { createConnection, destroyConnection, type DropDbConfig } from '../../db/index.js';
import { loadEntityTypesFromDir } from '../../core/index.js';

// Ensure field type registration side-effects run
import '../../field/index.js';

export async function migrateDrupalAnalyze(configPath?: string): Promise<void> {
  const config = await loadMigrateConfig(configPath);
  const source = createSourceConnection(config);
  try {
    const reader = new DrupalSchemaReader(source);
    const report = await reader.analyze();
    console.log(formatAnalysisReport(report));
  } finally {
    await destroySourceConnection();
  }
}

export async function migrateDrupalSchema(configPath?: string, outputDir?: string): Promise<void> {
  const config = await loadMigrateConfig(configPath);
  const source = createSourceConnection(config);
  const outDir = outputDir ?? path.resolve(process.cwd(), 'config', 'entity_types');

  try {
    const reader = new DrupalSchemaReader(source);
    const generator = new SchemaGenerator(reader);
    const files = await generator.generateAll(outDir);
    console.log(`Generated ${files.length} entity type definition(s):`);
    for (const f of files) console.log(`  ${f}`);
  } finally {
    await destroySourceConnection();
  }
}

export async function migrateDrupalRun(options: {
  configPath?: string;
  type?: string;
  entityTypesDir?: string;
}): Promise<void> {
  const config = await loadMigrateConfig(options.configPath);
  const source = createSourceConnection(config);

  // Initialize drop.js target DB
  const dropConfigPath = path.resolve(process.cwd(), 'drop.config.js');
  let dbConfig: DropDbConfig = {
    client: 'sqlite3',
    connection: { filename: './data/drop.db' },
  };

  if (fs.existsSync(dropConfigPath)) {
    try {
      const dropConfig = await import(dropConfigPath);
      if (dropConfig.default?.database) {
        dbConfig = dropConfig.default.database as DropDbConfig;
      }
    } catch {
      // Use default config
    }
  }

  // Ensure data directory exists for SQLite
  if (dbConfig.client === 'sqlite3' && typeof dbConfig.connection === 'object' && dbConfig.connection?.filename) {
    const dir = path.dirname(dbConfig.connection.filename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  createConnection(dbConfig);

  // Load entity type definitions
  const entityTypesDir = options.entityTypesDir ?? path.resolve(process.cwd(), 'config', 'entity_types');
  await loadEntityTypesFromDir(entityTypesDir);

  try {
    const reader = new DrupalSchemaReader(source);
    const migrator = new ContentMigrator(source, reader, (info) => {
      console.log(`[${info.phase}] ${info.current}/${info.total}: ${info.message}`);
    });

    if (options.type) {
      const count = await migrator.migrateNodes(options.type);
      console.log(`\nMigrated ${count} node(s) of type "${options.type}".`);
    } else {
      const result = await migrator.migrateAll();
      console.log(`\nMigration complete:`);
      console.log(`  Terms: ${result.terms}`);
      console.log(`  Paragraphs: ${result.paragraphs}`);
      console.log(`  Nodes: ${result.nodes}`);
    }

    const idMap = migrator.getIdMap();
    console.log(`\nID mappings: ${idMap.size()} entries`);
  } finally {
    await destroySourceConnection();
    await destroyConnection();
  }
}
