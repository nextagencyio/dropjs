import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seed } from './seed.js';

/** Resolve the package root (where src/app/ lives) for Next.js */
function getPackageRoot(): string {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(__dirname, '..', '..', '..');
}

export async function startDev(): Promise<void> {
  console.log('Starting drop.js dev server...\n');

  // Seed default content on first run (initializes DB as a side effect)
  await seed();

  console.log('Database connected.');
  console.log('Entity types loaded.');
  console.log('Auth system initialized.\n');

  // Start Next.js dev server — it handles all routing including /api/*
  // via the catch-all route at src/app/api/[...slug]/route.ts
  const packageRoot = getPackageRoot();
  const port = process.env.PORT || '3000';

  const child = spawn(process.execPath, [path.join(packageRoot, 'node_modules/.bin/next'), 'dev', '--port', port], {
    cwd: packageRoot,
    stdio: 'inherit',
    env: { ...process.env, PORT: port },
  });

  child.on('error', (err) => {
    console.error('Failed to start Next.js dev server:', err);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  process.on('SIGINT', () => {
    child.kill('SIGINT');
  });
}

// Auto-invoke when run directly (e.g., `npx tsx src/cli/commands/dev.ts`)
const __filename_dev = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename_dev || process.argv[1]?.endsWith('/dev.js')) {
  startDev().catch((err) => {
    console.error('Failed to start dev server:', err);
    process.exit(1);
  });
}
