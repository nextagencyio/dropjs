import http from 'node:http';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { destroyConnection } from '../../db/index.js';
import { stopCron, stopQueueProcessor, Entity, createLogger } from '../../core/index.js';
import { createUser, loadUserByName } from '../../auth/index.js';
import { ensureInitialized } from '../../api/init.js';
import { handleApiRequest } from '../../api/request-handler.js';

const logger = createLogger('dev');

/** Resolve the package root (where src/app/ lives) for Next.js */
function getPackageRoot(): string {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // In compiled form: dist/cli/commands/dev.js → go up 3 levels
  // In tsx form: src/cli/commands/dev.ts → go up 3 levels
  return path.resolve(__dirname, '..', '..', '..');
}

export async function startDev(): Promise<void> {
  console.log('Starting drop.js dev server...\n');

  // Initialize all subsystems (DB, entity types, auth, hooks, cron, queues, etc.)
  await ensureInitialized();

  // Seed default admin user and sample content
  await seedDefaults();

  console.log('Database connected.');
  console.log('Entity types loaded.');
  console.log('Auth system initialized.\n');

  // Prepare Next.js (unless admin UI is disabled)
  const skipAdmin = process.env.DROP_NO_ADMIN === '1';
  let nextHandler: ((req: http.IncomingMessage, res: http.ServerResponse) => void) | null = null;

  if (!skipAdmin) {
    const packageRoot = getPackageRoot();
    const next = (await import('next')).default as unknown as (opts: { dev: boolean; dir: string }) => any;
    const nextApp = next({ dev: true, dir: packageRoot });
    await nextApp.prepare();
    nextHandler = nextApp.getRequestHandler();
  }

  // Create HTTP server
  const server = http.createServer(async (req, res) => {
    try {
      // Drupal-compatible redirect: /user/login → /login
      if (req.url === '/user/login' || req.url?.startsWith('/user/login?')) {
        res.writeHead(302, { Location: '/login' });
        res.end();
        return;
      }

      if (req.url?.startsWith('/api/')) {
        await handleApiRequest(req, res);
      } else if (nextHandler) {
        nextHandler(req, res);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Admin UI disabled' }));
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
    console.log(`drop.js server running at http://localhost:${port}\n`);
    console.log(`  API:   http://localhost:${port}/api`);
    console.log(`  Admin: http://localhost:${port}\n`);
  });

  // Prevent unhandled promise rejections from crashing the server
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
  });

  // Prevent uncaught exceptions from crashing the server (Node 24 stream compat)
  process.on('uncaughtException', (err) => {
    if (err instanceof TypeError && err.message.includes('kState')) {
      // Known Node.js 24 stream compatibility issue with raw-body/body-parser
      return;
    }
    console.error('Uncaught exception:', err);
    process.exit(1);
  });

  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    stopQueueProcessor();
    stopCron();
    server.close();
    await destroyConnection();
    process.exit(0);
  });
}

async function seedDefaults(): Promise<void> {
  // Only seed if no admin user exists (fresh install)
  const existing = await loadUserByName('admin');
  if (existing) return;

  console.log('First run detected — seeding defaults...');

  // Create admin user
  const admin = await createUser({
    name: 'admin',
    email: 'admin@example.com',
    password: 'DropJs2024Admin',
    status: true,
    roles: ['authenticated', 'admin'],
  });
  console.log('  Created admin user (admin / DropJs2024Admin)');

  // Seed sample articles
  const articles = [
    {
      title: 'Welcome to drop.js',
      field_body: { value: '<p>Congratulations! You have successfully installed drop.js, a modern Node.js CMS inspired by Drupal.</p><p>This is your first article. You can edit or delete it, then start creating your own content.</p>', format: 'full_html' },
      status: true,
      uid: admin.uid,
    },
    {
      title: 'Getting started with content types',
      field_body: { value: '<p>Content types define the structure of your content. drop.js ships with two defaults:</p><ul><li><strong>Article</strong> — For time-sensitive content like news and blog posts</li><li><strong>Basic page</strong> — For static content like "About us" or "Contact"</li></ul><p>You can create new content types under Structure > Content types.</p>', format: 'full_html' },
      status: true,
      uid: admin.uid,
    },
    {
      title: 'Working with the REST API',
      field_body: { value: '<p>Every content type in drop.js automatically gets a full REST API. Try these endpoints:</p><ul><li><code>GET /api/node/article</code> — List articles</li><li><code>GET /api/node/page</code> — List pages</li><li><code>GET /api/entity-types</code> — List all content types</li></ul><p>Full API documentation is available at <code>/api/docs</code>.</p>', format: 'full_html' },
      status: false,
      uid: admin.uid,
    },
  ];

  for (const data of articles) {
    await Entity.create('node', 'article', data);
  }
  console.log(`  Created ${articles.length} sample articles`);

  // Seed sample pages
  const pages = [
    {
      title: 'About',
      field_body: { value: '<p>This is a sample "About" page. Edit this content to tell visitors about your site.</p>', format: 'full_html' },
      status: true,
      uid: admin.uid,
    },
    {
      title: 'Contact',
      field_body: { value: '<p>You can reach us at <a href="mailto:info@example.com">info@example.com</a>.</p>', format: 'full_html' },
      status: true,
      uid: admin.uid,
    },
  ];

  for (const data of pages) {
    await Entity.create('node', 'page', data);
  }
  console.log(`  Created ${pages.length} sample pages`);
  console.log('');
}

// Auto-invoke when run directly (e.g., `npx tsx src/cli/commands/dev.ts`)
const __filename_dev = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename_dev || process.argv[1]?.endsWith('/dev.js')) {
  startDev().catch((err) => {
    console.error('Failed to start dev server:', err);
    process.exit(1);
  });
}
