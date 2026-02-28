import { execSync } from 'node:child_process';

export async function build(): Promise<void> {
  const root = process.cwd();
  console.log('Building drop.js project...\n');

  // 1. Build TypeScript server code
  console.log('[1/2] Compiling TypeScript...');
  try {
    execSync('npx tsc -p tsconfig.server.json', { cwd: root, stdio: 'inherit' });
    console.log('  TypeScript compiled successfully.\n');
  } catch {
    console.error('  TypeScript compilation failed.');
    process.exit(1);
  }

  // 2. Build admin UI (Next.js static export)
  console.log('[2/2] Building admin UI...');
  try {
    execSync('npx next build', { cwd: root, stdio: 'inherit' });
    console.log('  Admin UI built successfully.\n');
  } catch {
    console.warn('  Admin UI build failed (non-fatal).\n');
  }

  console.log('Build complete.');
}
