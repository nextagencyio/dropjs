import http from 'node:http';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { destroyConnection } from '../../db/index.js';
import { stopCron, stopQueueProcessor, createLogger } from '../../core/index.js';
import { ensureInitialized } from '../../api/init.js';
import { handleApiRequest } from '../../api/request-handler.js';

const logger = createLogger('serve');

/** Resolve the package root (where .next/ lives) for Next.js */
function getPackageRoot(): string {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(__dirname, '..', '..', '..');
}

export async function serve(): Promise<void> {
  console.log('Starting drop.js production server...\n');

  // Initialize all subsystems (DB, entity types, auth, hooks, cron, queues, etc.)
  await ensureInitialized();

  console.log('Database connected.');
  console.log('Entity types loaded.');
  console.log('Auth system initialized.');

  // Prepare Next.js in production mode
  const packageRoot = getPackageRoot();
  const next = (await import('next')).default as unknown as (opts: { dev: boolean; dir: string }) => any;
  const nextApp = next({ dev: false, dir: packageRoot });
  await nextApp.prepare();
  const nextHandler = nextApp.getRequestHandler();

  // Create HTTP server
  const server = http.createServer(async (req, res) => {
    try {
      if (req.url?.startsWith('/api/') && !req.url?.startsWith('/api/auth/')) {
        await handleApiRequest(req, res);
      } else {
        nextHandler(req, res);
      }
    } catch (err) {
      logger.error('Unhandled server error', { error: (err as Error).message });
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { status: 500, message: 'Internal server error' } }));
      }
    }
  });

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  server.listen(port, () => {
    console.log(`\ndrop.js server running at http://localhost:${port}`);
    console.log(`  API:   http://localhost:${port}/api`);
    console.log(`  Admin: http://localhost:${port}\n`);
  });

  const shutdown = async () => {
    console.log('\nShutting down...');
    stopQueueProcessor();
    stopCron();
    server.close();
    await destroyConnection();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Auto-invoke when run directly
const __filename_serve = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename_serve || process.argv[1]?.endsWith('/serve.js')) {
  serve().catch((err) => {
    console.error('Failed to start production server:', err);
    process.exit(1);
  });
}
