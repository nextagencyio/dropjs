import * as path from 'node:path';
import * as fs from 'node:fs';
import express, { type Express } from 'express';
import multer from 'multer';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { createApiRouter, type CustomRoute } from './router.js';
import {
  loginHandler,
  logoutHandler,
  registerHandler,
  authenticate,
  requireAuth,
  requirePermission,
  loadUser,
  createUser,
  updateUser,
  deleteUser,
  getAllPermissions,
  assignRolePermission,
  createRole as authCreateRole,
  deleteRole as authDeleteRole,
  loadAllRoles,
  loadRole,
  updateRolePermissions,
  createPasswordResetToken,
  resetPassword,
} from '../auth/index.js';
import { getAllEntityTypes, Entity } from '../core/index.js';
import { asyncHandler, errorHandler } from './middleware.js';
import { db } from '../db/index.js';
import { BadRequestError, NotFoundError } from './errors.js';
import {
  createContentType,
  updateContentType,
  deleteContentType,
} from './handlers/content-types.js';
import { addField, updateField, deleteField, reorderFields } from './handlers/fields.js';
import {
  listVocabularies,
  createVocabulary,
  updateVocabulary,
  deleteVocabulary,
  getTermTree,
  reorderTerms,
  getTermContentCounts,
  getTermAncestors,
} from './handlers/taxonomy.js';
import { csrfTokenHandler, csrfProtection } from './csrf.js';
import { authLimiter, mutationLimiter, readLimiter } from './rate-limit.js';
import {
  ensureFileTable,
  setUploadsDir,
  handleFileUpload,
  handleFileGet,
  handleFileDownload,
  handleFileStyleDownload,
  handleFileDelete,
  handleMediaList,
  handleMediaImages,
  handleMediaUpload,
  handleMediaDelete,
} from './handlers/files.js';
import { generateAllStyles } from './handlers/image-styles.js';
import { generateOpenApiSpec } from './openapi.js';
import swaggerUi from 'swagger-ui-express';
import { createLogger, ensureConfigTable, ensureUrlAliasTable, ensureWebhooksTable, ensureWatchdogTable, ensureAccessLogTable, ensureKeyValueTable, ensureQueueTable, ensureCommentTables, ensureParagraphsTable, registerParagraphHooks, ensurePreviewTable, registerPreviewCleanupCronJob, ensureActionTriggersTable, registerDefaultActions, registerTriggerHooks, ensureContactTables, ensureShortcutTables, registerDefaultTokens, logAccess, watchdog, cacheStats, cacheClearAll, getAllRestResources, registerRestResource } from '../core/index.js';
import type { RestResource } from '../core/index.js';
import { cors, type CorsOptions } from './cors.js';
import { sanitizeMiddleware } from './sanitize.js';
import { jsonApiMiddleware } from './jsonapi.js';
import {
  handleCreateAlias,
  handleListAliases,
  handleDeleteAlias,
  handleResolveAlias,
} from './handlers/aliases.js';
import { aliasResolver } from './alias-middleware.js';
import {
  handleListWebhooks,
  handleGetWebhook,
  handleCreateWebhook,
  handleUpdateWebhook,
  handleDeleteWebhook,
} from './handlers/webhooks.js';
import { getSiteConfig, updateSiteConfig } from './handlers/site-config.js';
import {
  handleExportConfig,
  handleImportConfig,
  handleDiffConfig,
} from './handlers/config-sync.js';
import {
  getTextFormats,
  createTextFormat,
  updateTextFormat,
  deleteTextFormat,
} from './handlers/text-formats.js';
import {
  getImageStyles as getImageStylesConfig,
  createImageStyle,
  updateImageStyle,
  deleteImageStyle,
} from './handlers/image-styles-config.js';
import {
  listModules,
  enableModule as enableModuleHandler,
  disableModule as disableModuleHandler,
} from './handlers/modules.js';
import { getStatusReport, getLogs, clearLogs, getTopPages } from './handlers/reports.js';
import { listThemes, setActiveTheme } from './handlers/appearance.js';
import { handleSearch } from './handlers/search.js';
import { handleRunCron, handleGetCronStatus } from './handlers/cron.js';
import {
  handleListMenus,
  handleGetMenu,
  handleCreateMenu,
  handleDeleteMenu,
  handleAddMenuItem,
  handleUpdateMenuItem,
  handleDeleteMenuItem,
  handleReorderMenuItems,
} from './handlers/menus.js';
import {
  handleListViews,
  handleGetView,
  handleCreateView,
  handleUpdateView,
  handleDeleteView,
  handleExecuteView,
} from './handlers/views.js';
import {
  handleListComments,
  handleGetComment,
  handleCreateComment,
  handleUpdateComment,
  handleDeleteComment,
} from './handlers/comments.js';
import {
  handleListBlocks,
  handleListPlacements,
  handleGetPlacement,
  handleCreatePlacement,
  handleUpdatePlacement,
  handleDeletePlacement,
  handleGetRegions,
  handleSaveRegions,
  handleRenderRegion,
} from './handlers/blocks.js';
import {
  handleListViewModes,
  handleGetViewMode,
  handleCreateViewMode,
  handleDeleteViewMode,
  handleListViewDisplays,
  handleGetViewDisplay,
  handleSaveViewDisplay,
  handleDeleteViewDisplay,
  handleApplyViewDisplay,
} from './handlers/display-modes.js';
import {
  handleListWorkflows,
  handleGetWorkflow,
  handleCreateWorkflow,
  handleDeleteWorkflow,
  handleGetTransitions,
  handleApplyTransition,
  handleGetModerationHistory,
} from './handlers/workflow.js';
import {
  handleListLanguages,
  handleListEnabledLanguages,
  handleGetDefaultLanguage,
  handleAddLanguage,
  handleUpdateLanguage,
  handleRemoveLanguage,
  handleGetTranslations,
  handleGetTranslation,
  handleCreateTranslation,
  handleUpdateTranslation,
  handleDeleteTranslation,
} from './handlers/translation.js';
import {
  handleListLayoutTypes,
  handleGetLayout,
  handleSaveLayout,
  handleDeleteLayout,
  handleAddSection,
  handleRemoveSection,
  handleAddComponent,
  handleRemoveComponent,
  handleRenderLayout,
} from './handlers/layout-builder.js';
import { handleGetSchedule, handleSetSchedule, handleCancelSchedule, handleListSchedules } from './handlers/scheduler.js';
import { handleCheckLock, handleAcquireLock, handleReleaseLock, handleRenewLock, handleBreakLock, handleListLocks } from './handlers/content-lock.js';
import {
  handleListPatterns,
  handleGetPattern,
  handleCreatePattern,
  handleUpdatePattern,
  handleDeletePattern,
  handleBulkGenerate,
} from './handlers/pathauto.js';
import { handleGraphQL } from './graphql.js';
import { handleBatch } from './handlers/batch.js';
import {
  handleListRestResources,
  handleGetRestResource,
  handleEnableRestResource,
  handleDisableRestResource,
} from './handlers/rest-resources.js';
import {
  handleListParagraphTypes,
  handleCreateParagraphType,
  handleDeleteParagraphType,
  handleListParagraphs,
  handleGetParagraph,
  handleCreateParagraph,
  handleUpdateParagraph,
  handleDeleteParagraph,
  handleReorderParagraphs,
} from './handlers/paragraphs.js';
import {
  handleValidateEntity,
  handleGetConstraints,
  handleSetConstraints,
  handleDeleteConstraints,
} from './handlers/validation.js';
import {
  handleCreatePreview,
  handleGetPreview,
  handleDeletePreview,
} from './handlers/preview.js';
import {
  handleListActions,
  handleListTriggers,
  handleGetTrigger,
  handleCreateTrigger,
  handleUpdateTrigger,
  handleDeleteTrigger,
  handleExecuteTrigger,
} from './handlers/actions.js';
import {
  handleListContactForms,
  handleGetContactForm,
  handleCreateContactForm,
  handleUpdateContactForm,
  handleDeleteContactForm,
  handleSubmitContact,
  handleListContactMessages,
  handleGetContactMessage,
  handleUpdateContactMessageStatus,
  handleDeleteContactMessage,
} from './handlers/contact.js';
import {
  handleListShortcuts,
  handleAddShortcut,
  handleUpdateShortcut,
  handleDeleteShortcut,
  handleReorderShortcuts,
  handleListShortcutSets,
} from './handlers/shortcuts.js';
import {
  handleListTokenTypes,
  handleReplaceTokens,
} from './handlers/tokens.js';

const logger = createLogger('api:server');

export interface ApiServerOptions {
  customRoutes?: CustomRoute[];
  prefix?: string;
  disableAuth?: boolean;
  disableCsrf?: boolean;
  disableRateLimit?: boolean;
  disableSanitize?: boolean;
  uploadsDir?: string;
  cors?: CorsOptions | false;
}

export function createApiServer(
  options: ApiServerOptions = {}
): Express {
  const app = express();
  app.set('trust proxy', 1);

  // Configure uploads directory
  const uploadsDir = options.uploadsDir ?? path.resolve('data/files');
  setUploadsDir(uploadsDir);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Ensure config table exists (for themes, modules, site settings, etc.)
  ensureConfigTable().catch((err) => {
    logger.error('Failed to create config table', { error: String(err) });
  });

  // Ensure file table exists
  ensureFileTable().catch((err) => {
    logger.error('Failed to create file_managed table', { error: String(err) });
  });

  // Ensure path alias table exists
  ensureUrlAliasTable().catch((err) => {
    logger.error('Failed to create path_alias table', { error: String(err) });
  });

  // Ensure webhooks table exists
  ensureWebhooksTable().catch((err) => {
    logger.error('Failed to create webhooks table', { error: String(err) });
  });

  // Ensure watchdog table exists
  ensureWatchdogTable().catch((err) => {
    logger.error('Failed to create watchdog table', { error: String(err) });
  });

  // Ensure access_log table exists
  ensureAccessLogTable().catch((err) => {
    logger.error('Failed to create access_log table', { error: String(err) });
  });

  // Ensure key_value table exists (for State API)
  ensureKeyValueTable().catch((err) => {
    logger.error('Failed to create key_value table', { error: String(err) });
  });

  // Ensure queue table exists
  ensureQueueTable().catch((err) => {
    logger.error('Failed to create queue table', { error: String(err) });
  });

  // Ensure comment tables exist
  ensureCommentTables().catch((err) => {
    logger.error('Failed to create comment tables', { error: String(err) });
  });

  // Ensure paragraphs table exists
  ensureParagraphsTable().catch((err) => {
    logger.error('Failed to create paragraphs table', { error: String(err) });
  });

  // Register paragraph cascade-delete hooks
  registerParagraphHooks();

  // Ensure content_previews table exists
  ensurePreviewTable().catch((err) => {
    logger.error('Failed to create content_previews table', { error: String(err) });
  });

  // Register cron job for cleaning expired previews
  registerPreviewCleanupCronJob();

  // Ensure action triggers table exists
  ensureActionTriggersTable().catch((err) => {
    logger.error('Failed to create action_triggers table', { error: String(err) });
  });

  // Register built-in actions and trigger hooks
  registerDefaultActions();
  registerTriggerHooks();

  // Ensure contact tables exist
  ensureContactTables().catch((err) => {
    logger.error('Failed to create contact tables', { error: String(err) });
  });

  // Ensure shortcut tables exist
  ensureShortcutTables().catch((err) => {
    logger.error('Failed to create shortcut tables', { error: String(err) });
  });

  // Register built-in token types
  registerDefaultTokens();

  // Configure multer for file uploads
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dateDir = new Date().toISOString().slice(0, 7); // YYYY-MM
      const destDir = path.join(uploadsDir, dateDir);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      cb(null, destDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 100);
      const unique = `${base}-${Date.now()}${ext}`;
      cb(null, unique);
    },
  });
  const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // CORS
  if (options.cors !== false) {
    app.use(cors(options.cors ?? {}));
  }

  // Enable nested query string parsing (?filter[status]=1)
  app.set('query parser', 'extended');

  app.use(express.json());
  app.use(cookieParser());

  // Input sanitization — strip dangerous HTML from request bodies
  if (!options.disableSanitize) {
    app.use(sanitizeMiddleware());
  }

  // JSON:API output format — transforms responses when Accept: application/vnd.api+json
  app.use(jsonApiMiddleware);

  // Access logging middleware — track page views for top-pages report
  app.use((req, _res, next) => {
    // Only log GET requests to non-API paths (page views)
    if (req.method === 'GET' && !req.path.startsWith('/api/')) {
      const uid = (req as any).user?.uid ?? 0;
      logAccess(req.path, uid);
    }
    next();
  });

  // Health check endpoint
  const startTime = Date.now();
  app.get('/api/health', asyncHandler(async (_req, res) => {
    let dbStatus = 'ok';
    try {
      const { getConnection } = await import('../db/index.js');
      const conn = getConnection();
      await conn.raw('SELECT 1');
    } catch {
      dbStatus = 'error';
    }

    const uptime = Math.floor((Date.now() - startTime) / 1000);
    res.json({
      status: dbStatus === 'ok' ? 'healthy' : 'degraded',
      uptime,
      database: dbStatus,
      timestamp: new Date().toISOString(),
    });
  }));

  // GraphQL endpoint (before CSRF protection so introspection works via GET)
  app.get('/api/graphql', authenticate() as any, asyncHandler(handleGraphQL));
  app.post('/api/graphql', authenticate() as any, asyncHandler(handleGraphQL));

  // CSRF token endpoint (before CSRF protection middleware)
  app.get('/api/csrf-token', csrfTokenHandler);

  // CSRF protection for state-changing requests
  if (!options.disableCsrf) {
    app.use('/api', csrfProtection());
  }

  // Rate limiting
  if (!options.disableRateLimit) {
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/register', authLimiter);
    app.use('/api/auth/forgot-password', authLimiter);
    app.use('/api/auth/reset-password', authLimiter);
  }

  // Auth routes
  app.post('/api/auth/login', loginHandler as any);
  app.post('/api/auth/logout', logoutHandler as any);
  app.post('/api/auth/register', registerHandler as any);

  // Password reset routes
  app.post('/api/auth/forgot-password', asyncHandler(async (req, res) => {
    const { email } = req.body as { email?: string };
    if (!email) {
      res.status(400).json({
        error: { status: 400, message: 'email is required' },
      });
      return;
    }
    const result = await createPasswordResetToken(email);
    if (result) {
      logger.info('Password reset token generated', { uid: result.uid, token: result.token });
    }
    // Always return success to prevent email enumeration
    res.json({ message: 'If the email exists, a reset token has been generated. Check server logs.' });
  }));

  app.post('/api/auth/reset-password', asyncHandler(async (req, res) => {
    const { token, password } = req.body as { token?: string; password?: string };
    if (!token || !password) {
      res.status(400).json({
        error: { status: 400, message: 'token and password are required' },
      });
      return;
    }
    const success = await resetPassword(token, password);
    if (!success) {
      res.status(400).json({
        error: { status: 400, message: 'Invalid or expired reset token' },
      });
      return;
    }
    res.json({ message: 'Password has been reset successfully' });
  }));

  // Entity type discovery endpoint
  app.get('/api/entity-types', ...(options.disableRateLimit ? [] : [readLimiter]), asyncHandler(async (_req, res) => {
    const types = getAllEntityTypes();
    res.json({ data: types });
  }));

  // User list endpoint
  app.get(
    '/api/users',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer users') as any,
    asyncHandler(async (_req, res) => {
      const users = await db
        .select('users', 'u')
        .join('users_field_data', 'ufd', 'u.uid = ufd.uid')
        .fields('u', ['uid', 'uuid'])
        .fields('ufd', ['name', 'mail', 'status', 'created', 'changed'])
        .orderBy('u.uid', 'ASC')
        .execute<Record<string, unknown>>();

      // Load roles for each user from user__roles
      const data = await Promise.all(
        users.map(async (user) => {
          const roleRows = await db
            .select('user__roles')
            .fields(['roles_target_id'])
            .condition('entity_id', user.uid)
            .condition('deleted', 0)
            .orderBy('delta', 'ASC')
            .execute<{ roles_target_id: string }>();
          return {
            uid: user.uid,
            uuid: user.uuid,
            name: user.name,
            email: user.mail,
            status: (user.status as number) === 1,
            created: new Date((user.created as number) * 1000).toISOString(),
            changed: new Date(((user.changed as number) || (user.created as number)) * 1000).toISOString(),
            roles: roleRows.map((r) => r.roles_target_id),
          };
        })
      );

      res.json({ data, meta: { total: data.length } });
    })
  );

  // Get single user
  app.get(
    '/api/users/:uid',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer users') as any,
    asyncHandler(async (req, res) => {
      const uid = parseInt(req.params.uid, 10);
      const user = await loadUser(uid);
      if (!user) {
        throw new NotFoundError('User not found');
      }
      res.json({ data: user });
    })
  );

  // Create user
  app.post(
    '/api/users',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer users') as any,
    asyncHandler(async (req, res) => {
      const { name, email, password, status, roles } = req.body;
      if (!name || !email || !password) {
        throw new BadRequestError('name, email, and password are required');
      }
      const user = await createUser({
        name,
        email,
        password,
        status: status !== false,
        roles: roles ?? ['authenticated'],
      });
      res.status(201).json({ data: user });
    })
  );

  // Update user
  app.patch(
    '/api/users/:uid',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer users') as any,
    asyncHandler(async (req, res) => {
      const uid = parseInt(req.params.uid, 10);
      const existing = await loadUser(uid);
      if (!existing) {
        throw new NotFoundError('User not found');
      }
      await updateUser(uid, req.body);
      const updated = await loadUser(uid);
      res.json({ data: updated });
    })
  );

  // Delete user
  app.delete(
    '/api/users/:uid',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer users') as any,
    asyncHandler(async (req, res) => {
      const uid = parseInt(req.params.uid, 10);
      const existing = await loadUser(uid);
      if (!existing) {
        throw new NotFoundError('User not found');
      }
      await deleteUser(uid);
      res.status(204).send();
    })
  );

  // List roles (from config entities)
  app.get(
    '/api/roles',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(async (_req, res) => {
      const roles = await loadAllRoles();
      // Return compatible format for frontend
      const data = roles.map((r) => ({
        name: r.id,
        label: r.label,
        weight: r.weight,
        is_admin: r.is_admin,
      }));
      res.json({ data });
    })
  );

  // Create role
  app.post(
    '/api/roles',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer users') as any,
    asyncHandler(async (req, res) => {
      const { name, label } = req.body;
      if (!name || !label) {
        throw new BadRequestError('name and label are required');
      }
      await authCreateRole(name, label);
      const role = await loadRole(name);
      res.status(201).json({ data: { name: role!.id, label: role!.label, weight: role!.weight, is_admin: role!.is_admin } });
    })
  );

  // Delete role
  app.delete(
    '/api/roles/:name',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer users') as any,
    asyncHandler(async (req, res) => {
      const roleName = req.params.name;
      const role = await loadRole(roleName);
      if (!role) {
        throw new NotFoundError('Role not found');
      }
      await authDeleteRole(roleName);
      res.status(204).send();
    })
  );

  // Get role permissions
  app.get(
    '/api/roles/:name/permissions',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer users') as any,
    asyncHandler(async (req, res) => {
      const roleName = req.params.name;
      const role = await loadRole(roleName);
      if (!role) {
        throw new NotFoundError('Role not found');
      }
      const allPerms = getAllPermissions();
      const allPermissions = Array.from(allPerms.entries()).map(
        ([name, def]) => ({
          name,
          title: def.title,
          description: def.description,
        }),
      );
      res.json({
        role: { name: role.id, label: role.label, weight: role.weight, is_admin: role.is_admin },
        permissions: role.permissions,
        allPermissions,
      });
    })
  );

  // Update role permissions
  app.put(
    '/api/roles/:name/permissions',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer users') as any,
    asyncHandler(async (req, res) => {
      const roleName = req.params.name;
      const { permissions } = req.body as { permissions: string[] };
      if (!Array.isArray(permissions)) {
        throw new BadRequestError('permissions must be an array');
      }
      const role = await loadRole(roleName);
      if (!role) {
        throw new NotFoundError('Role not found');
      }
      await updateRolePermissions(roleName, permissions);
      res.status(204).send();
    })
  );

  // Get single content type definition
  app.get(
    '/api/entity-types/:entityType/:bundle',
    ...(options.disableRateLimit ? [] : [readLimiter]),
    asyncHandler(async (req, res) => {
      const { entityType, bundle } = req.params;
      const { getEntityTypeDefinition } = await import('../core/index.js');
      const definition = getEntityTypeDefinition(entityType, bundle);
      if (!definition) {
        throw new NotFoundError(`Content type "${entityType}:${bundle}" not found`);
      }
      res.json({ data: definition });
    })
  );

  // Content type management routes
  app.post(
    '/api/entity-types',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(createContentType)
  );
  app.patch(
    '/api/entity-types/:entityType/:bundle',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(updateContentType)
  );
  app.delete(
    '/api/entity-types/:entityType/:bundle',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(deleteContentType)
  );

  // Field management routes
  app.post(
    '/api/entity-types/:entityType/:bundle/fields',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(addField)
  );
  // Reorder must come before :fieldName routes
  app.put(
    '/api/entity-types/:entityType/:bundle/fields/reorder',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(reorderFields)
  );
  app.patch(
    '/api/entity-types/:entityType/:bundle/fields/:fieldName',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(updateField)
  );
  app.delete(
    '/api/entity-types/:entityType/:bundle/fields/:fieldName',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(deleteField)
  );

  // Taxonomy vocabulary routes
  app.get(
    '/api/taxonomy/vocabularies',
    authenticate() as any,
    asyncHandler(listVocabularies)
  );
  app.get(
    '/api/taxonomy/vocabularies/:vid',
    authenticate() as any,
    asyncHandler(async (req, res) => {
      const { vid } = req.params;
      const { getEntityTypeDefinition } = await import('../core/index.js');
      const definition = getEntityTypeDefinition('taxonomy_term', vid);
      if (!definition) {
        throw new NotFoundError(`Vocabulary "${vid}" not found`);
      }
      res.json({ data: definition });
    })
  );
  app.post(
    '/api/taxonomy/vocabularies',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(createVocabulary)
  );
  app.patch(
    '/api/taxonomy/vocabularies/:vid',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(updateVocabulary)
  );
  app.delete(
    '/api/taxonomy/vocabularies/:vid',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(deleteVocabulary)
  );

  // Taxonomy term hierarchy routes
  app.get(
    '/api/taxonomy/:vid/tree',
    authenticate() as any,
    asyncHandler(getTermTree)
  );
  app.patch(
    '/api/taxonomy/:vid/reorder',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(reorderTerms)
  );
  app.get(
    '/api/taxonomy/:vid/content-counts',
    authenticate() as any,
    asyncHandler(getTermContentCounts)
  );
  app.get(
    '/api/taxonomy/:vid/term-ancestors/:tid',
    authenticate() as any,
    asyncHandler(getTermAncestors)
  );

  // File upload routes
  app.post(
    '/api/files/upload',
    authenticate() as any,
    requireAuth() as any,
    upload.single('file'),
    asyncHandler(async (req, res) => {
      await handleFileUpload(req, res);

      // Generate image styles if it's an image
      const file = (req as any).file;
      if (file && file.mimetype.startsWith('image/')) {
        generateAllStyles(file.path).catch((err: unknown) => {
          logger.error('Failed to generate image styles', { error: String(err) });
        });
      }
    })
  );
  app.get(
    '/api/files/:id',
    asyncHandler(handleFileGet)
  );
  app.get(
    '/api/files/:id/download',
    asyncHandler(handleFileDownload)
  );
  app.get(
    '/api/files/:id/style/:style',
    asyncHandler(handleFileStyleDownload)
  );
  app.delete(
    '/api/files/:id',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleFileDelete)
  );

  // Media library routes
  app.get(
    '/api/media',
    authenticate() as any,
    asyncHandler(handleMediaList)
  );
  app.get(
    '/api/media/images',
    authenticate() as any,
    asyncHandler(handleMediaImages)
  );
  app.post(
    '/api/media/upload',
    authenticate() as any,
    requireAuth() as any,
    upload.single('file'),
    asyncHandler(async (req, res) => {
      await handleMediaUpload(req, res);

      // Generate image styles if it's an image
      const file = (req as any).file;
      if (file && file.mimetype.startsWith('image/')) {
        generateAllStyles(file.path).catch((err: unknown) => {
          logger.error('Failed to generate image styles', { error: String(err) });
        });
      }
    })
  );
  app.delete(
    '/api/media/:id',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleMediaDelete)
  );

  // URL alias routes
  app.get(
    '/api/aliases',
    authenticate() as any,
    asyncHandler(handleListAliases)
  );
  app.get(
    '/api/aliases/resolve',
    asyncHandler(handleResolveAlias)
  );
  app.post(
    '/api/aliases',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleCreateAlias)
  );
  app.delete(
    '/api/aliases/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleDeleteAlias)
  );

  // Pathauto routes
  app.get(
    '/api/pathauto/patterns',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleListPatterns)
  );
  app.get(
    '/api/pathauto/patterns/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleGetPattern)
  );
  app.post(
    '/api/pathauto/patterns',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleCreatePattern)
  );
  app.patch(
    '/api/pathauto/patterns/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleUpdatePattern)
  );
  app.delete(
    '/api/pathauto/patterns/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleDeletePattern)
  );
  app.post(
    '/api/pathauto/generate',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleBulkGenerate)
  );

  // Webhook routes
  app.get(
    '/api/webhooks',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleListWebhooks)
  );
  app.get(
    '/api/webhooks/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleGetWebhook)
  );
  app.post(
    '/api/webhooks',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleCreateWebhook)
  );
  app.patch(
    '/api/webhooks/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleUpdateWebhook)
  );
  app.delete(
    '/api/webhooks/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleDeleteWebhook)
  );

  // Validation routes
  app.post(
    '/api/validate/:entityType/:bundle',
    authenticate() as any,
    asyncHandler(handleValidateEntity)
  );
  app.get(
    '/api/constraints/:entityType/:bundle',
    authenticate() as any,
    asyncHandler(handleGetConstraints)
  );
  app.put(
    '/api/constraints/:entityType/:bundle/:fieldName',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleSetConstraints)
  );
  app.delete(
    '/api/constraints/:entityType/:bundle/:fieldName',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleDeleteConstraints)
  );

  // Site configuration
  app.get(
    '/api/config/site',
    authenticate() as any,
    asyncHandler(getSiteConfig)
  );
  app.patch(
    '/api/config/site',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(updateSiteConfig)
  );

  // Configuration sync
  app.get(
    '/api/config/export',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleExportConfig)
  );
  app.post(
    '/api/config/import',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleImportConfig)
  );
  app.post(
    '/api/config/diff',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleDiffConfig)
  );

  // Text Formats configuration
  app.get(
    '/api/config/text-formats',
    authenticate() as any,
    asyncHandler(getTextFormats)
  );
  app.post(
    '/api/config/text-formats',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(createTextFormat)
  );
  app.patch(
    '/api/config/text-formats/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(updateTextFormat)
  );
  app.delete(
    '/api/config/text-formats/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(deleteTextFormat)
  );

  // Image Styles configuration
  app.get(
    '/api/config/image-styles',
    authenticate() as any,
    asyncHandler(getImageStylesConfig)
  );
  app.post(
    '/api/config/image-styles',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(createImageStyle)
  );
  app.patch(
    '/api/config/image-styles/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(updateImageStyle)
  );
  app.delete(
    '/api/config/image-styles/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(deleteImageStyle)
  );

  // Modules
  app.get(
    '/api/modules',
    authenticate() as any,
    asyncHandler(listModules)
  );
  app.post(
    '/api/modules/:name/enable',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(enableModuleHandler)
  );
  app.post(
    '/api/modules/:name/disable',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(disableModuleHandler)
  );

  // Reports
  app.get(
    '/api/reports/status',
    authenticate() as any,
    asyncHandler(getStatusReport)
  );
  app.get(
    '/api/reports/logs',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(getLogs)
  );
  app.delete(
    '/api/reports/logs',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(clearLogs)
  );
  app.get(
    '/api/reports/top-pages',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(getTopPages)
  );

  // Cache management
  app.get(
    '/api/cache/stats',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(async (_req, res) => {
      res.json({ data: cacheStats() });
    })
  );
  app.delete(
    '/api/cache',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(async (_req, res) => {
      cacheClearAll();
      res.status(204).send();
    })
  );

  // REST resource admin routes
  app.get(
    '/api/rest-resources',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleListRestResources)
  );
  app.get(
    '/api/rest-resources/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleGetRestResource)
  );
  app.post(
    '/api/rest-resources/:id/enable',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleEnableRestResource)
  );
  app.post(
    '/api/rest-resources/:id/disable',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleDisableRestResource)
  );

  // Mount enabled REST resource plugin endpoints
  mountRestResources(app).catch((err) => {
    logger.error('Failed to mount REST resources', { error: String(err) });
  });

  // Cron
  app.get(
    '/api/cron/status',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleGetCronStatus)
  );
  app.post(
    '/api/cron/run',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleRunCron)
  );

  // Appearance
  app.get(
    '/api/appearance/themes',
    authenticate() as any,
    asyncHandler(listThemes)
  );
  app.post(
    '/api/appearance/themes/active',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(setActiveTheme)
  );

  // Search endpoint
  app.get(
    '/api/search',
    authenticate() as any,
    asyncHandler(handleSearch)
  );

  // Menu routes
  app.get(
    '/api/menus',
    authenticate() as any,
    asyncHandler(handleListMenus)
  );
  app.get(
    '/api/menus/:menuId',
    authenticate() as any,
    asyncHandler(handleGetMenu)
  );
  app.post(
    '/api/menus',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleCreateMenu)
  );
  app.delete(
    '/api/menus/:menuId',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleDeleteMenu)
  );
  app.post(
    '/api/menus/:menuId/items',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleAddMenuItem)
  );
  app.patch(
    '/api/menus/:menuId/items/:itemId',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleUpdateMenuItem)
  );
  app.delete(
    '/api/menus/:menuId/items/:itemId',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleDeleteMenuItem)
  );
  app.patch(
    '/api/menus/:menuId/reorder',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleReorderMenuItems)
  );

  // Views routes
  app.get(
    '/api/views',
    authenticate() as any,
    asyncHandler(handleListViews)
  );
  app.get(
    '/api/views/:id',
    authenticate() as any,
    asyncHandler(handleGetView)
  );
  app.get(
    '/api/views/:id/execute',
    authenticate() as any,
    asyncHandler(handleExecuteView)
  );
  app.post(
    '/api/views',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleCreateView)
  );
  app.patch(
    '/api/views/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleUpdateView)
  );
  app.delete(
    '/api/views/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleDeleteView)
  );

  // Comment routes
  app.get(
    '/api/comments',
    authenticate() as any,
    asyncHandler(handleListComments)
  );
  app.get(
    '/api/comments/:cid',
    authenticate() as any,
    asyncHandler(handleGetComment)
  );
  app.post(
    '/api/comments',
    authenticate() as any,
    asyncHandler(handleCreateComment)
  );
  app.patch(
    '/api/comments/:cid',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleUpdateComment)
  );
  app.delete(
    '/api/comments/:cid',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleDeleteComment)
  );

  // State API routes
  app.get(
    '/api/state/:key',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(async (req, res) => {
      const { stateGet } = await import('../core/index.js');
      const value = await stateGet(req.params.key);
      res.json({ data: { key: req.params.key, value: value ?? null } });
    })
  );
  app.put(
    '/api/state/:key',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(async (req, res) => {
      const { stateSet } = await import('../core/index.js');
      await stateSet(req.params.key, req.body.value);
      res.json({ data: { key: req.params.key, value: req.body.value } });
    })
  );
  app.delete(
    '/api/state/:key',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(async (req, res) => {
      const { stateDelete } = await import('../core/index.js');
      await stateDelete(req.params.key);
      res.status(204).send();
    })
  );

  // Queue API routes
  app.get(
    '/api/queues',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(async (_req, res) => {
      const { listQueues } = await import('../core/index.js');
      const queues = await listQueues();
      res.json({ data: queues });
    })
  );
  app.post(
    '/api/queues/:name',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(async (req, res) => {
      const { createQueueItem } = await import('../core/index.js');
      const itemId = await createQueueItem(req.params.name, req.body.data);
      res.status(201).json({ data: { item_id: itemId } });
    })
  );
  app.post(
    '/api/queues/:name/process',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(async (req, res) => {
      const { processQueue } = await import('../core/index.js');
      const maxItems = parseInt(req.query.max as string, 10) || 10;
      const processed = await processQueue(req.params.name, maxItems);
      res.json({ data: { processed } });
    })
  );
  app.delete(
    '/api/queues/:name',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(async (req, res) => {
      const { purgeQueue } = await import('../core/index.js');
      await purgeQueue(req.params.name);
      res.status(204).send();
    })
  );

  // Block/Region routes
  app.get('/api/blocks', authenticate() as any, asyncHandler(handleListBlocks));
  app.get('/api/block-placements', authenticate() as any, asyncHandler(handleListPlacements));
  app.get('/api/block-placements/:id', authenticate() as any, asyncHandler(handleGetPlacement));
  app.post(
    '/api/block-placements',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer blocks') as any,
    asyncHandler(handleCreatePlacement)
  );
  app.patch(
    '/api/block-placements/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer blocks') as any,
    asyncHandler(handleUpdatePlacement)
  );
  app.delete(
    '/api/block-placements/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer blocks') as any,
    asyncHandler(handleDeletePlacement)
  );
  app.get('/api/regions', authenticate() as any, asyncHandler(handleGetRegions));
  app.put(
    '/api/regions',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer blocks') as any,
    asyncHandler(handleSaveRegions)
  );
  app.get('/api/regions/:region/render', asyncHandler(handleRenderRegion));

  // Display mode routes
  app.get(
    '/api/display-modes/:entityType',
    authenticate() as any,
    asyncHandler(handleListViewModes)
  );
  app.get(
    '/api/display-modes/:entityType/:mode',
    authenticate() as any,
    asyncHandler(handleGetViewMode)
  );
  app.post(
    '/api/display-modes/:entityType',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleCreateViewMode)
  );
  app.delete(
    '/api/display-modes/:entityType/:mode',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleDeleteViewMode)
  );
  app.get(
    '/api/display/:entityType/:bundle',
    authenticate() as any,
    asyncHandler(handleListViewDisplays)
  );
  app.get(
    '/api/display/:entityType/:bundle/:mode',
    authenticate() as any,
    asyncHandler(handleGetViewDisplay)
  );
  app.put(
    '/api/display/:entityType/:bundle/:mode',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleSaveViewDisplay)
  );
  app.delete(
    '/api/display/:entityType/:bundle/:mode',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleDeleteViewDisplay)
  );
  app.post(
    '/api/display/:entityType/:bundle/:mode/apply',
    authenticate() as any,
    asyncHandler(handleApplyViewDisplay)
  );

  // Workflow routes
  app.get(
    '/api/workflows',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleListWorkflows)
  );
  app.get(
    '/api/workflows/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleGetWorkflow)
  );
  app.post(
    '/api/workflows',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleCreateWorkflow)
  );
  app.delete(
    '/api/workflows/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleDeleteWorkflow)
  );
  app.get(
    '/api/workflows/:id/transitions/:state',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleGetTransitions)
  );

  // Language management routes
  app.get(
    '/api/languages',
    authenticate() as any,
    asyncHandler(handleListLanguages)
  );
  app.get(
    '/api/languages/enabled',
    authenticate() as any,
    asyncHandler(handleListEnabledLanguages)
  );
  app.get(
    '/api/languages/default',
    authenticate() as any,
    asyncHandler(handleGetDefaultLanguage)
  );
  app.post(
    '/api/languages',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleAddLanguage)
  );
  app.patch(
    '/api/languages/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleUpdateLanguage)
  );
  app.delete(
    '/api/languages/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleRemoveLanguage)
  );

  // Layout Builder routes (MUST come before generic entity CRUD routes)
  app.get(
    '/api/layout-types',
    authenticate() as any,
    asyncHandler(handleListLayoutTypes)
  );
  app.get(
    '/api/layout/:entityType/:bundle/:viewMode/render',
    authenticate() as any,
    asyncHandler(handleRenderLayout)
  );
  app.get(
    '/api/layout/:entityType/:bundle/:viewMode',
    authenticate() as any,
    asyncHandler(handleGetLayout)
  );
  app.put(
    '/api/layout/:entityType/:bundle/:viewMode',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleSaveLayout)
  );
  app.delete(
    '/api/layout/:entityType/:bundle/:viewMode',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleDeleteLayout)
  );
  app.post(
    '/api/layout/:entityType/:bundle/:viewMode/sections',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleAddSection)
  );
  app.delete(
    '/api/layout/:entityType/:bundle/:viewMode/sections/:sectionId',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleRemoveSection)
  );
  app.post(
    '/api/layout/:entityType/:bundle/:viewMode/sections/:sectionId/components',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleAddComponent)
  );
  app.delete(
    '/api/layout/:entityType/:bundle/:viewMode/sections/:sectionId/components/:componentId',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleRemoveComponent)
  );

  // Scheduled publishing routes (MUST come before generic entity CRUD routes)
  app.get(
    '/api/schedules',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleListSchedules)
  );
  app.get(
    '/api/:entityType/:bundle/:id/schedule',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleGetSchedule)
  );
  app.post(
    '/api/:entityType/:bundle/:id/schedule',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleSetSchedule)
  );
  app.delete(
    '/api/:entityType/:bundle/:id/schedule',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleCancelSchedule)
  );

  // Content lock routes (MUST come before generic entity CRUD routes)
  app.get(
    '/api/content-locks',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleListLocks)
  );
  app.get(
    '/api/:entityType/:bundle/:id/lock',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleCheckLock)
  );
  app.post(
    '/api/:entityType/:bundle/:id/lock',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleAcquireLock)
  );
  app.delete(
    '/api/:entityType/:bundle/:id/lock',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleReleaseLock)
  );
  app.post(
    '/api/:entityType/:bundle/:id/lock/renew',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleRenewLock)
  );
  app.post(
    '/api/:entityType/:bundle/:id/lock/break',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleBreakLock)
  );

  // Translation routes (MUST come before generic entity CRUD routes)
  app.get(
    '/api/:entityType/:bundle/:id/translations',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleGetTranslations)
  );
  app.get(
    '/api/:entityType/:bundle/:id/translations/:langcode',
    authenticate() as any,
    asyncHandler(handleGetTranslation)
  );
  app.post(
    '/api/:entityType/:bundle/:id/translations/:langcode',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleCreateTranslation)
  );
  app.patch(
    '/api/:entityType/:bundle/:id/translations/:langcode',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleUpdateTranslation)
  );
  app.delete(
    '/api/:entityType/:bundle/:id/translations/:langcode',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleDeleteTranslation)
  );

  // Paragraph type routes (MUST come before generic entity CRUD routes)
  app.get(
    '/api/paragraph-types',
    authenticate() as any,
    asyncHandler(handleListParagraphTypes)
  );
  app.post(
    '/api/paragraph-types',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleCreateParagraphType)
  );
  app.delete(
    '/api/paragraph-types/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleDeleteParagraphType)
  );

  // Paragraph item routes (MUST come before generic entity CRUD routes)
  app.get(
    '/api/paragraphs/:paragraphId',
    authenticate() as any,
    asyncHandler(handleGetParagraph)
  );
  app.patch(
    '/api/paragraphs/:paragraphId',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleUpdateParagraph)
  );
  app.delete(
    '/api/paragraphs/:paragraphId',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleDeleteParagraph)
  );

  // Paragraph entity-scoped routes (MUST come before generic entity CRUD routes)
  app.get(
    '/api/:entityType/:bundle/:id/paragraphs',
    authenticate() as any,
    asyncHandler(handleListParagraphs)
  );
  app.post(
    '/api/:entityType/:bundle/:id/paragraphs',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleCreateParagraph)
  );
  app.patch(
    '/api/:entityType/:bundle/:id/paragraphs/reorder',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(handleReorderParagraphs)
  );

  // Moderation routes (MUST come before generic entity CRUD routes)
  app.post(
    '/api/:entityType/:bundle/:id/moderation',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleApplyTransition)
  );
  app.get(
    '/api/:entityType/:bundle/:id/moderation',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleGetModerationHistory)
  );

  // Content preview routes (before entity CRUD router)
  app.post(
    '/api/preview',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleCreatePreview)
  );
  app.get(
    '/api/preview/:previewId',
    asyncHandler(handleGetPreview)
  );
  app.delete(
    '/api/preview/:previewId',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleDeletePreview)
  );

  // Revision routes (before entity CRUD router)
  app.get(
    '/api/node/:bundle/:nid/revisions',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(async (req, res) => {
      const nid = parseInt(req.params.nid, 10);
      if (isNaN(nid)) {
        throw new BadRequestError('Invalid nid');
      }

      const entity = await Entity.load('node', nid);
      if (!entity) {
        throw new NotFoundError('Entity not found');
      }

      const revisions = await Entity.listRevisions('node', nid);
      res.json({
        data: revisions,
        meta: { current_vid: entity.vid },
      });
    })
  );

  app.get(
    '/api/node/:bundle/:nid/revisions/:vid',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(async (req, res) => {
      const nid = parseInt(req.params.nid, 10);
      const vid = parseInt(req.params.vid, 10);
      if (isNaN(nid) || isNaN(vid)) {
        throw new BadRequestError('Invalid nid or vid');
      }

      const entity = await Entity.loadRevision('node', nid, vid);
      if (!entity) {
        throw new NotFoundError('Revision not found');
      }

      res.json({ data: entity.toJSON() });
    })
  );

  app.post(
    '/api/node/:bundle/:nid/revisions/:vid/revert',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer nodes') as any,
    asyncHandler(async (req, res) => {
      const nid = parseInt(req.params.nid, 10);
      const vid = parseInt(req.params.vid, 10);
      if (isNaN(nid) || isNaN(vid)) {
        throw new BadRequestError('Invalid nid or vid');
      }

      const entity = await Entity.revertToRevision('node', nid, vid);
      res.json({ data: entity.toJSON() });
    })
  );

  // Revision diff endpoint: compare two revisions
  app.get(
    '/api/node/:bundle/:nid/revisions/:vid1/diff/:vid2',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(async (req, res) => {
      const nid = parseInt(req.params.nid, 10);
      const vid1 = parseInt(req.params.vid1, 10);
      const vid2 = parseInt(req.params.vid2, 10);
      if (isNaN(nid) || isNaN(vid1) || isNaN(vid2)) {
        throw new BadRequestError('Invalid nid, vid1, or vid2');
      }

      const rev1 = await Entity.loadRevision('node', nid, vid1);
      const rev2 = await Entity.loadRevision('node', nid, vid2);
      if (!rev1 || !rev2) {
        throw new NotFoundError('One or both revisions not found');
      }

      const data1 = rev1.toJSON();
      const data2 = rev2.toJSON();

      // Collect all keys from both revisions
      const allKeys = new Set([...Object.keys(data1), ...Object.keys(data2)]);
      // Skip internal/meta fields that aren't meaningful to compare
      const skipFields = new Set(['nid', 'uuid', 'type', 'langcode', 'vid', 'default_langcode', 'revision_translation_affected']);

      const changes: Array<{
        field: string;
        old_value: unknown;
        new_value: unknown;
      }> = [];

      for (const key of allKeys) {
        if (skipFields.has(key)) continue;
        const oldVal = data1[key];
        const newVal = data2[key];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changes.push({ field: key, old_value: oldVal, new_value: newVal });
        }
      }

      res.json({
        data: {
          from_vid: vid1,
          to_vid: vid2,
          changes,
        },
      });
    })
  );

  // URL alias resolution middleware (resolves /content/* to internal paths)
  app.use(aliasResolver());

  // OpenAPI documentation
  app.get('/api/docs/openapi.json', (_req, res) => {
    res.json(generateOpenApiSpec());
  });
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(null, {
    swaggerOptions: { url: '/api/docs/openapi.json' },
  }));

  // Actions & Triggers routes
  app.get(
    '/api/actions',
    authenticate() as any,
    asyncHandler(handleListActions)
  );
  app.get(
    '/api/triggers',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleListTriggers)
  );
  app.get(
    '/api/triggers/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleGetTrigger)
  );
  app.post(
    '/api/triggers',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleCreateTrigger)
  );
  app.patch(
    '/api/triggers/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleUpdateTrigger)
  );
  app.delete(
    '/api/triggers/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleDeleteTrigger)
  );
  app.post(
    '/api/triggers/:id/execute',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleExecuteTrigger)
  );

  // Contact form routes
  app.get(
    '/api/contact/forms',
    authenticate() as any,
    asyncHandler(handleListContactForms)
  );
  app.get(
    '/api/contact/forms/:machineName',
    authenticate() as any,
    asyncHandler(handleGetContactForm)
  );
  app.post(
    '/api/contact/forms',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleCreateContactForm)
  );
  app.patch(
    '/api/contact/forms/:machineName',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleUpdateContactForm)
  );
  app.delete(
    '/api/contact/forms/:machineName',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleDeleteContactForm)
  );
  app.post(
    '/api/contact/forms/:machineName/submit',
    authenticate() as any,
    asyncHandler(handleSubmitContact)
  );
  app.get(
    '/api/contact/messages',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleListContactMessages)
  );
  app.get(
    '/api/contact/messages/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleGetContactMessage)
  );
  app.patch(
    '/api/contact/messages/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleUpdateContactMessageStatus)
  );
  app.delete(
    '/api/contact/messages/:id',
    authenticate() as any,
    requireAuth() as any,
    requirePermission('administer site') as any,
    asyncHandler(handleDeleteContactMessage)
  );

  // Shortcut routes
  app.get(
    '/api/shortcuts',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleListShortcuts)
  );
  app.post(
    '/api/shortcuts',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleAddShortcut)
  );
  app.patch(
    '/api/shortcuts/reorder',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleReorderShortcuts)
  );
  app.patch(
    '/api/shortcuts/:id',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleUpdateShortcut)
  );
  app.delete(
    '/api/shortcuts/:id',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleDeleteShortcut)
  );
  app.get(
    '/api/shortcut-sets',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleListShortcutSets)
  );

  // Token routes
  app.get(
    '/api/tokens',
    authenticate() as any,
    asyncHandler(handleListTokenTypes)
  );
  app.post(
    '/api/tokens/replace',
    authenticate() as any,
    asyncHandler(handleReplaceTokens)
  );

  // Field group routes
  app.get(
    '/api/field-groups/:entityType/:bundle',
    authenticate() as any,
    asyncHandler(async (req, res) => {
      const { listFieldGroups } = await import('../core/index.js');
      const viewMode = (req.query.view_mode as string) || 'default';
      const groups = await listFieldGroups(req.params.entityType, req.params.bundle, viewMode);
      res.json({ data: groups });
    })
  );

  // Batch API endpoint (before entity CRUD so /api/batch is not captured by :entityType/:bundle)
  app.post(
    '/api/batch',
    authenticate() as any,
    requireAuth() as any,
    asyncHandler(handleBatch)
  );

  // Entity CRUD routes
  const router = createApiRouter(options.customRoutes, {
    disableRateLimit: options.disableRateLimit,
  });
  app.use(options.prefix ?? '', router);

  // App-level error handler — catches errors thrown from routes mounted
  // directly on the app (batch, auth, etc.) that are outside the API router.
  app.use(errorHandler as any);

  // Drupal-compatible route redirects
  app.get('/user/login', (_req, res) => res.redirect('/login'));
  app.get('/user/register', (_req, res) => res.redirect('/register'));

  return app;
}

// ── REST Resource mount system ─────────────────────────────────────────────

/**
 * Reads all enabled REST resources and mounts their handlers on the configured
 * paths with the configured HTTP methods. Each mounted resource checks
 * authentication and the configured permissions.
 */
export async function mountRestResources(app: Express): Promise<void> {
  const resources = await getAllRestResources();
  for (const resource of resources) {
    if (!resource.enabled) continue;
    if (typeof resource.handler !== 'function') continue;
    mountSingleResource(app, resource);
  }
}

/**
 * Register a REST resource and immediately mount it on the Express app.
 * Convenience for runtime registration.
 */
export async function registerAndMountRestResource(
  app: Express,
  resource: RestResource
): Promise<void> {
  await registerRestResource(resource);
  if (resource.enabled && typeof resource.handler === 'function') {
    mountSingleResource(app, resource);
  }
}

function mountSingleResource(app: Express, resource: RestResource): void {
  const middleware: any[] = [authenticate() as any, requireAuth() as any];

  for (const perm of resource.permissions) {
    middleware.push(requirePermission(perm) as any);
  }

  const handler = asyncHandler(resource.handler as (req: any, res: any, next: any) => Promise<void>);

  for (const method of resource.methods) {
    switch (method) {
      case 'GET':
        app.get(resource.path, ...middleware, handler);
        break;
      case 'POST':
        app.post(resource.path, ...middleware, handler);
        break;
      case 'PATCH':
        app.patch(resource.path, ...middleware, handler);
        break;
      case 'DELETE':
        app.delete(resource.path, ...middleware, handler);
        break;
    }
  }
}
