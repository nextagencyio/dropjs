import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Resolve the package root (where .next/ lives) for Next.js */
function getPackageRoot(): string {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(__dirname, '..', '..', '..');
}

export async function serve(): Promise<void> {
  console.log('Starting drop.js production server...\n');

  // Start Next.js production server — it handles all routing including /api/*
  // via the catch-all route at src/app/api/[...slug]/route.ts
  // Initialization happens via instrumentation.ts on server startup.
  const packageRoot = getPackageRoot();
  const port = process.env.PORT || '3000';

  const child = spawn(process.execPath, [path.join(packageRoot, 'node_modules/.bin/next'), 'start', '--port', port], {
    cwd: packageRoot,
    stdio: 'inherit',
    env: { ...process.env, PORT: port },
  });

  child.on('error', (err) => {
    console.error('Failed to start Next.js production server:', err);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  process.on('SIGINT', () => {
    child.kill('SIGINT');
  });
  process.on('SIGTERM', () => {
    child.kill('SIGTERM');
  });
}

// Auto-invoke when run directly
const __filename_serve = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename_serve || process.argv[1]?.endsWith('/serve.js')) {
  serve().catch((err) => {
    console.error('Failed to start production server:', err);
    process.exit(1);
  });
}
