import { execSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Resolve the package root (where tsconfig.server.json and src/app/ live) */
function getPackageRoot(): string {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(__dirname, '..', '..', '..');
}

export async function build(): Promise<void> {
  const packageRoot = getPackageRoot();
  console.log('Building drop.js project...\n');

  // 1. Build TypeScript server code
  console.log('[1/2] Compiling TypeScript...');
  try {
    execSync('npx tsc -p tsconfig.server.json', { cwd: packageRoot, stdio: 'inherit' });
    console.log('  TypeScript compiled successfully.\n');
  } catch {
    console.error('  TypeScript compilation failed.');
    process.exit(1);
  }

  // 2. Build admin UI (Next.js)
  console.log('[2/2] Building admin UI...');
  try {
    execSync('npx next build', { cwd: packageRoot, stdio: 'inherit' });
    console.log('  Admin UI built successfully.\n');
  } catch {
    console.warn('  Admin UI build failed (non-fatal).\n');
  }

  console.log('Build complete.');
}
