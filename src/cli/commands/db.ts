import * as path from 'node:path';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import { createConnection, destroyConnection, getConnection } from '../../db/index.js';

async function initDbFromConfig(): Promise<void> {
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

  if (process.env.DB_CLIENT) {
    dbConfig = {
      client: process.env.DB_CLIENT,
      connection: {
        host: process.env.DB_HOST ?? 'localhost',
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        filename: process.env.DB_FILENAME,
      },
    };
  }

  if (dbConfig.client === 'sqlite3' && dbConfig.connection?.filename) {
    const dir = path.dirname(dbConfig.connection.filename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  createConnection(dbConfig);
}

export async function dbExport(outputPath?: string): Promise<void> {
  await initDbFromConfig();

  const conn = getConnection();
  const client = conn.client.config.client as string;

  const outFile = outputPath ?? `drop-export-${new Date().toISOString().slice(0, 10)}.sql`;

  if (client === 'sqlite3') {
    const filename = (conn.client.config.connection as any).filename;
    if (!filename || filename === ':memory:') {
      console.error('Cannot export an in-memory database.');
      await destroyConnection();
      process.exit(1);
    }
    try {
      execSync(`sqlite3 "${filename}" .dump > "${outFile}"`, { stdio: 'inherit' });
      console.log(`Database exported to ${outFile}`);
    } catch {
      console.error('Export failed. Ensure sqlite3 CLI is installed.');
      process.exit(1);
    }
  } else if (client === 'mysql2') {
    const connConfig = conn.client.config.connection as Record<string, unknown>;
    const args = [
      connConfig.host ? `-h ${connConfig.host}` : '',
      connConfig.port ? `-P ${connConfig.port}` : '',
      connConfig.user ? `-u ${connConfig.user}` : '',
      connConfig.password ? `-p${connConfig.password}` : '',
      connConfig.database as string,
    ].filter(Boolean).join(' ');
    try {
      execSync(`mysqldump ${args} > "${outFile}"`, { stdio: 'inherit' });
      console.log(`Database exported to ${outFile}`);
    } catch {
      console.error('Export failed. Ensure mysqldump is installed.');
      process.exit(1);
    }
  } else if (client === 'pg') {
    const connConfig = conn.client.config.connection as Record<string, unknown>;
    const env: Record<string, string> = {};
    if (connConfig.host) env.PGHOST = connConfig.host as string;
    if (connConfig.port) env.PGPORT = String(connConfig.port);
    if (connConfig.user) env.PGUSER = connConfig.user as string;
    if (connConfig.password) env.PGPASSWORD = connConfig.password as string;
    if (connConfig.database) env.PGDATABASE = connConfig.database as string;
    try {
      execSync(`pg_dump > "${outFile}"`, {
        stdio: 'inherit',
        env: { ...process.env, ...env },
      });
      console.log(`Database exported to ${outFile}`);
    } catch {
      console.error('Export failed. Ensure pg_dump is installed.');
      process.exit(1);
    }
  } else {
    console.error(`Unsupported database client: ${client}`);
    process.exit(1);
  }

  await destroyConnection();
}

export async function dbImport(inputPath: string): Promise<void> {
  if (!fs.existsSync(inputPath)) {
    console.error(`File not found: ${inputPath}`);
    process.exit(1);
  }

  await initDbFromConfig();

  const conn = getConnection();
  const client = conn.client.config.client as string;

  if (client === 'sqlite3') {
    const filename = (conn.client.config.connection as any).filename;
    if (!filename || filename === ':memory:') {
      console.error('Cannot import into an in-memory database.');
      await destroyConnection();
      process.exit(1);
    }
    // Close the connection before importing
    await destroyConnection();
    try {
      execSync(`sqlite3 "${filename}" < "${inputPath}"`, { stdio: 'inherit' });
      console.log(`Database imported from ${inputPath}`);
    } catch {
      console.error('Import failed. Ensure sqlite3 CLI is installed.');
      process.exit(1);
    }
  } else if (client === 'mysql2') {
    const connConfig = conn.client.config.connection as Record<string, unknown>;
    const args = [
      connConfig.host ? `-h ${connConfig.host}` : '',
      connConfig.port ? `-P ${connConfig.port}` : '',
      connConfig.user ? `-u ${connConfig.user}` : '',
      connConfig.password ? `-p${connConfig.password}` : '',
      connConfig.database as string,
    ].filter(Boolean).join(' ');
    try {
      execSync(`mysql ${args} < "${inputPath}"`, { stdio: 'inherit' });
      console.log(`Database imported from ${inputPath}`);
    } catch {
      console.error('Import failed. Ensure mysql client is installed.');
      process.exit(1);
    }
  } else if (client === 'pg') {
    const connConfig = conn.client.config.connection as Record<string, unknown>;
    const env: Record<string, string> = {};
    if (connConfig.host) env.PGHOST = connConfig.host as string;
    if (connConfig.port) env.PGPORT = String(connConfig.port);
    if (connConfig.user) env.PGUSER = connConfig.user as string;
    if (connConfig.password) env.PGPASSWORD = connConfig.password as string;
    if (connConfig.database) env.PGDATABASE = connConfig.database as string;
    try {
      execSync(`psql < "${inputPath}"`, {
        stdio: 'inherit',
        env: { ...process.env, ...env },
      });
      console.log(`Database imported from ${inputPath}`);
    } catch {
      console.error('Import failed. Ensure psql is installed.');
      process.exit(1);
    }
  } else {
    console.error(`Unsupported database client: ${client}`);
    process.exit(1);
  }

  await destroyConnection();
}
