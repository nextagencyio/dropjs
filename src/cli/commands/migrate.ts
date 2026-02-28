import * as path from 'node:path';
import * as fs from 'node:fs';
import { createConnection, destroyConnection, migrations } from '../../db/index.js';

function loadConfig(): Record<string, unknown> {
  const configPath = path.resolve(process.cwd(), 'drop.config.js');
  if (!fs.existsSync(configPath)) {
    console.error('Error: drop.config.js not found in current directory.');
    process.exit(1);
  }
  // For Phase 1, use a simple default config
  return {
    database: {
      client: 'sqlite3',
      connection: { filename: './data/drop.db' },
    },
  };
}

export async function migrateRun(directory?: string): Promise<void> {
  const config = loadConfig();
  const dbConfig = config.database as any;
  createConnection(dbConfig);

  try {
    const migrationDir = directory ?? path.resolve(process.cwd(), 'migrations');
    const [batch, files] = await migrations.run(migrationDir);

    if (files.length === 0) {
      console.log('Already up to date.');
    } else {
      console.log(`Batch ${batch}: ${files.length} migration(s) completed.`);
      for (const file of files) {
        console.log(`  - ${file}`);
      }
    }
  } finally {
    await destroyConnection();
  }
}

export async function migrateRollback(directory?: string): Promise<void> {
  const config = loadConfig();
  const dbConfig = config.database as any;
  createConnection(dbConfig);

  try {
    const migrationDir = directory ?? path.resolve(process.cwd(), 'migrations');
    const [batch, files] = await migrations.rollback(migrationDir);

    if (files.length === 0) {
      console.log('Nothing to roll back.');
    } else {
      console.log(`Rolled back batch ${batch}: ${files.length} migration(s).`);
      for (const file of files) {
        console.log(`  - ${file}`);
      }
    }
  } finally {
    await destroyConnection();
  }
}

export async function migrateStatus(directory?: string): Promise<void> {
  const config = loadConfig();
  const dbConfig = config.database as any;
  createConnection(dbConfig);

  try {
    const migrationDir = directory ?? path.resolve(process.cwd(), 'migrations');
    const status = await migrations.status(migrationDir);

    console.log('\nMigration Status:');
    if (status.completed.length > 0) {
      console.log('\n  Completed:');
      for (const m of status.completed) {
        console.log(`    [batch ${m.batch}] ${m.name}`);
      }
    }
    if (status.pending.length > 0) {
      console.log('\n  Pending:');
      for (const p of status.pending) {
        console.log(`    - ${p}`);
      }
    }
    if (status.completed.length === 0 && status.pending.length === 0) {
      console.log('  No migrations found.');
    }
    console.log('');
  } finally {
    await destroyConnection();
  }
}

export function migrateGenerate(name: string): void {
  const migrationsDir = path.resolve(process.cwd(), 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const filename = `${timestamp}_${name}.ts`;
  const filePath = path.join(migrationsDir, filename);

  const template = `import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add your migration here
}

export async function down(knex: Knex): Promise<void> {
  // Reverse the migration here
}
`;

  fs.writeFileSync(filePath, template);
  console.log(`Created migration: ${filename}`);
}
