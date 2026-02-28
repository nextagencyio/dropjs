import fs from 'fs';
import path from 'path';

export default function globalSetup() {
  console.log('[GLOBAL-SETUP] Running at', new Date().toISOString());
  // Clean up e2e data directory before test run
  const dataDir = path.join(process.cwd(), 'e2e-data');
  console.log('[GLOBAL-SETUP] Cleaning', dataDir);
  if (fs.existsSync(dataDir)) {
    const contents = fs.readdirSync(dataDir);
    console.log('[GLOBAL-SETUP] Existing contents:', contents);
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('[GLOBAL-SETUP] Done');
}
