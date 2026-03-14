import * as path from 'node:path';
import * as fs from 'node:fs';
import 'dotenv/config';
import { createConnection } from '../db/index.js';
import {
  loadEntityTypesFromDir,
  ensureConfigTable,
  registerAliasHooks,
  registerWebhookHooks,
  registerDefaultCronJobs,
  startCron,
  startQueueProcessor,
  ensureSearchIndex,
  registerSearchHooks,
  getDefaultViews,
  saveView,
  loadView,
  registerDefaultBlocks,
  registerCommentEntityType,
  registerCacheHooks,
  seedDefaultWorkflow,
  registerSchedulerCronJob,
  registerLockCleanupCronJob,
  registerValidationHooks,
  ensureUrlAliasTable,
  ensureDrupalCompat,
  ensureFloodTable,
  registerFloodCronJob,
  Entity,
  registerEntityType,
  getEntityTypeDefinition,
  installModule,
  ensureWebhooksTable,
  ensureWatchdogTable,
  ensureAccessLogTable,
  ensureKeyValueTable,
  ensureQueueTable,
  ensureCommentTables,
  ensureParagraphsTable,
  registerParagraphHooks,
  ensurePreviewTable,
  registerPreviewCleanupCronJob,
  ensureActionTriggersTable,
  registerDefaultActions,
  registerTriggerHooks,
  ensureContactTables,
  ensureShortcutTables,
  registerDefaultTokens,
  createLogger,
} from '../core/index.js';
import { graphqlModule, jsonapiModule, graphqlComposeModule } from '../modules/index.js';
import { ensureAuthTables, seedDefaultRoles } from '../auth/index.js';
import {
  ensureFileTable,
  setUploadsDir,
} from './handlers/files.js';

// Ensure field type registration side-effects run
import '../field/index.js';

// Use globalThis so the init flag is shared across webpack module boundaries
// (Next.js server components get a separate module instance from the API handler)
const g = globalThis as unknown as {
  __dropjs_initialized?: boolean;
  __dropjs_initializing?: Promise<void> | null;
};

/**
 * Mark initialization as complete without running init logic.
 * Used by unit tests that set up their own DB and entity types.
 */
export function markInitialized(): void {
  g.__dropjs_initialized = true;
}

/**
 * Lazy singleton that initializes all DropJS subsystems.
 * Safe to call multiple times — only runs once.
 */
export async function ensureInitialized(): Promise<void> {
  if (g.__dropjs_initialized) return;

  // Prevent concurrent initialization
  if (g.__dropjs_initializing) {
    await g.__dropjs_initializing;
    return;
  }

  g.__dropjs_initializing = doInit();
  await g.__dropjs_initializing;
}

async function doInit(): Promise<void> {
  // Load database config
  const configPath = path.resolve(process.cwd(), 'drop.config.js');
  const dataDir = process.env.DROP_DATA_DIR || './data';
  const dbFilename = path.resolve(path.join(dataDir, 'drop.db'));

  // Reject SQLite on Vercel — require PostgreSQL
  if (process.env.VERCEL && !process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required on Vercel. SQLite cannot be used on serverless.');
  }

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

  // DATABASE_URL connection string (Supabase, Heroku, Railway, etc.)
  if (process.env.DATABASE_URL) {
    dbConfig = {
      client: 'pg',
      connection: {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL === '1' ? { rejectUnauthorized: false } : undefined,
      },
    };
  }
  // Environment-based database config (for production / Docker)
  else if (process.env.DB_CLIENT) {
    dbConfig = {
      client: process.env.DB_CLIENT,
      connection: {
        host: process.env.DB_HOST ?? 'localhost',
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        filename: process.env.DB_FILENAME,
        ssl: process.env.DB_SSL === '1' ? { rejectUnauthorized: true } : undefined,
      },
    };
  }

  // Ensure data directory exists for SQLite
  if (dbConfig.client === 'sqlite3' && dbConfig.connection?.filename) {
    const dir = path.dirname(dbConfig.connection.filename);
    // Clean DB before server starts (for E2E testing)
    if (process.env.DROP_CLEAN_DB === '1' && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  createConnection(dbConfig);

  // Load entity types from config directory
  const entityTypesDir = path.resolve(process.cwd(), 'config', 'entity_types');
  if (fs.existsSync(entityTypesDir)) {
    await loadEntityTypesFromDir(entityTypesDir);
  }

  // Initialize auth tables and default roles
  await ensureAuthTables();
  await seedDefaultRoles();

  // Initialize config table (for themes, modules, site settings, etc.)
  await ensureConfigTable();

  // Ensure Drupal-compatible config, cache tables, key_value entries
  await ensureDrupalCompat();

  // Ensure file table
  await ensureFileTable();

  // Register entity types
  registerCommentEntityType();

  // Register media entity type and default bundles
  await registerMediaBundles();

  // Register default blocks
  registerDefaultBlocks();

  // Register event hooks
  registerAliasHooks();
  registerWebhookHooks();
  registerSearchHooks();
  registerCacheHooks();
  registerValidationHooks();

  // Install Web services modules (graphql, jsonapi, graphql_compose)
  await installModule(graphqlModule);
  await installModule(jsonapiModule);
  await installModule(graphqlComposeModule);

  // Initialize FTS5 search index
  await ensureSearchIndex();

  // Seed default views (only if they don't already exist)
  for (const view of getDefaultViews()) {
    const existing = await loadView(view.id);
    if (!existing) {
      await saveView(view);
    }
  }

  // Seed default workflow
  await seedDefaultWorkflow();

  // Start background tasks (skip in test mode and serverless environments)
  if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    registerDefaultCronJobs();
    registerSchedulerCronJob();
    registerLockCleanupCronJob();
    registerFloodCronJob();
    startCron();
    startQueueProcessor();
  }

  // Ensure flood table (Drupal-compatible rate limiting)
  await ensureFloodTable();

  // Ensure URL alias table
  await ensureUrlAliasTable();

  // Configure uploads directory (use /tmp on read-only filesystems like Vercel)
  const defaultUploadsDir = process.env.VERCEL ? '/tmp/data/files' : 'data/files';
  const uploadsDir = path.resolve(process.env.UPLOADS_DIR || defaultUploadsDir);
  setUploadsDir(uploadsDir);
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  } catch {
    // Read-only filesystem — uploads will fail but API still works
  }

  // Ensure subsystem tables (previously only ran on first API request)
  await ensureSubsystemTables();

  g.__dropjs_initialized = true;
}

const logger = createLogger('init');

/**
 * Ensure subsystem tables exist (webhooks, watchdog, comments, etc.).
 * Moved here from request-handler.ts so Server Components can use them too.
 */
async function ensureSubsystemTables(): Promise<void> {
  const tasks = [
    ensureWebhooksTable(),
    ensureWatchdogTable(),
    ensureAccessLogTable(),
    ensureKeyValueTable(),
    ensureQueueTable(),
    ensureCommentTables(),
    ensureParagraphsTable(),
    ensurePreviewTable(),
    ensureActionTriggersTable(),
    ensureContactTables(),
    ensureShortcutTables(),
  ];

  await Promise.all(tasks.map((p) => p.catch((err) => {
    logger.error('Failed to ensure subsystem table', { error: String(err) });
  })));

  // Register hooks and default data (sync, idempotent)
  registerParagraphHooks();
  registerPreviewCleanupCronJob();
  registerDefaultActions();
  registerTriggerHooks();
  registerDefaultTokens();
}

/**
 * Register default media bundles and ensure media base tables exist.
 */
async function registerMediaBundles(): Promise<void> {
  await Entity.ensureBaseTable('media');

  registerEntityType({
    entity_type: 'media',
    bundle: 'image',
    label: 'Image',
    description: 'An image media type.',
    fields: {
      field_media_image: { type: 'image', label: 'Image', required: true },
      field_media_alt: { type: 'string', label: 'Alternative text', required: false },
    },
  });
  registerEntityType({
    entity_type: 'media',
    bundle: 'document',
    label: 'Document',
    description: 'An uploaded document.',
    fields: {
      field_media_file: { type: 'file', label: 'File', required: true },
    },
  });
  registerEntityType({
    entity_type: 'media',
    bundle: 'video',
    label: 'Video',
    description: 'A video media type.',
    fields: {
      field_media_video_url: { type: 'string', label: 'Video URL', required: true },
    },
  });
  registerEntityType({
    entity_type: 'media',
    bundle: 'audio',
    label: 'Audio',
    description: 'An audio media type.',
    fields: {
      field_media_audio_file: { type: 'file', label: 'Audio file', required: true },
    },
  });

  // Ensure field tables for all media bundles
  const bundles = ['image', 'document', 'video', 'audio'];
  for (const bundle of bundles) {
    const def = getEntityTypeDefinition('media', bundle);
    if (def) {
      await Entity.ensureFieldTables(def);
    }
  }
}
