import * as path from 'node:path';
import * as fs from 'node:fs';
import * as readline from 'node:readline';
import { createConnection, destroyConnection } from '../../db/index.js';
import { ensureAuthTables, seedDefaultRoles, createUser, type UserCreateInput } from '../../auth/index.js';

async function prompt(question: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function userCreate(options: {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
}): Promise<void> {
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

  await ensureAuthTables();
  await seedDefaultRoles();

  const name = options.name ?? await prompt('Username: ');
  const email = options.email ?? await prompt('Email: ');
  const password = options.password ?? await prompt('Password: ');

  if (!name || !email || !password) {
    console.error('Username, email, and password are all required.');
    await destroyConnection();
    process.exit(1);
  }

  const roles = ['authenticated'];
  if (options.role) {
    roles.push(options.role);
  }

  try {
    const input: UserCreateInput = { name, email, password, roles };
    const user = await createUser(input);
    console.log(`\nUser created successfully:`);
    console.log(`  UID:   ${user.uid}`);
    console.log(`  Name:  ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Roles: ${roles.join(', ')}\n`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Failed to create user: ${message}`);
    process.exit(1);
  }

  await destroyConnection();
}
