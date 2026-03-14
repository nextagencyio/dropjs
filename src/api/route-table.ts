/**
 * Declarative route table — all API route definitions.
 * Used by the request-handler to dispatch incoming requests.
 */

import type { MiddlewareFn } from './middleware-runner.js';
import {
  authenticate,
  requireAuth,
  requirePermission,
  loadUser,
  createUser,
  updateUser,
  deleteUser,
  getAllPermissions,
  createRole as authCreateRole,
  deleteRole as authDeleteRole,
  loadAllRoles,
  loadRole,
  updateRolePermissions,
} from '../auth/index.js';
import { getAllEntityTypes, Entity, sendContactNotification } from '../core/index.js';
import { db } from '../db/index.js';
import { BadRequestError, NotFoundError } from './errors.js';
import { createContentType, updateContentType, deleteContentType } from './handlers/content-types.js';
import { addField, updateField, deleteField, reorderFields } from './handlers/fields.js';
import {
  listVocabularies, createVocabulary, updateVocabulary, deleteVocabulary,
  getTermTree, reorderTerms, getTermContentCounts, getTermAncestors,
} from './handlers/taxonomy.js';
import { csrfTokenHandler } from './csrf.js';
import {
  ensureFileTable, handleFileUpload, handleFileGet, handleFileDownload,
  handleFileStyleDownload, handleFileDelete, handleMediaList,
  handleMediaImages, handleMediaUpload, handleMediaDelete,
} from './handlers/files.js';
import { generateAllStyles } from './handlers/image-styles.js';
import { generateOpenApiSpec } from './openapi.js';
import {
  createLogger, logAccess, cacheStats, cacheClearAll,
} from '../core/index.js';
import {
  handleCreateAlias, handleListAliases, handleDeleteAlias, handleResolveAlias,
} from './handlers/aliases.js';
import {
  handleListWebhooks, handleGetWebhook, handleCreateWebhook,
  handleUpdateWebhook, handleDeleteWebhook,
} from './handlers/webhooks.js';
import { getSiteConfig, updateSiteConfig } from './handlers/site-config.js';
import { handleExportConfig, handleImportConfig, handleDiffConfig } from './handlers/config-sync.js';
import { getTextFormats, createTextFormat, updateTextFormat, deleteTextFormat } from './handlers/text-formats.js';
import {
  getImageStyles as getImageStylesConfig, createImageStyle,
  updateImageStyle, deleteImageStyle,
} from './handlers/image-styles-config.js';
import { listModules, enableModule as enableModuleHandler, disableModule as disableModuleHandler } from './handlers/modules.js';
import { getStatusReport, getLogs, clearLogs, getTopPages } from './handlers/reports.js';
import { handleSearch } from './handlers/search.js';
import { handleRunCron, handleGetCronStatus } from './handlers/cron.js';
import {
  handleListMenus, handleGetMenu, handleCreateMenu, handleDeleteMenu,
  handleAddMenuItem, handleUpdateMenuItem, handleDeleteMenuItem, handleReorderMenuItems,
} from './handlers/menus.js';
import {
  handleListViews, handleGetView, handleCreateView,
  handleUpdateView, handleDeleteView, handleExecuteView,
} from './handlers/views.js';
import {
  handleListComments, handleGetComment, handleCreateComment,
  handleUpdateComment, handleDeleteComment,
} from './handlers/comments.js';
import {
  handleListBlocks, handleListPlacements, handleGetPlacement,
  handleCreatePlacement, handleUpdatePlacement, handleDeletePlacement,
  handleGetRegions, handleSaveRegions, handleRenderRegion,
} from './handlers/blocks.js';
import {
  handleListViewModes, handleGetViewMode, handleCreateViewMode,
  handleDeleteViewMode, handleListViewDisplays, handleGetViewDisplay,
  handleSaveViewDisplay, handleDeleteViewDisplay, handleApplyViewDisplay,
} from './handlers/display-modes.js';
import {
  handleListWorkflows, handleGetWorkflow, handleCreateWorkflow,
  handleDeleteWorkflow, handleGetTransitions, handleApplyTransition,
  handleGetModerationHistory,
} from './handlers/workflow.js';
import {
  handleListLanguages, handleListEnabledLanguages, handleGetDefaultLanguage,
  handleAddLanguage, handleUpdateLanguage, handleRemoveLanguage,
  handleGetTranslations, handleGetTranslation, handleCreateTranslation,
  handleUpdateTranslation, handleDeleteTranslation,
} from './handlers/translation.js';
import {
  handleListLayoutTypes, handleGetLayout, handleSaveLayout,
  handleDeleteLayout, handleAddSection, handleRemoveSection,
  handleAddComponent, handleRemoveComponent, handleRenderLayout,
} from './handlers/layout-builder.js';
import { handleGetSchedule, handleSetSchedule, handleCancelSchedule, handleListSchedules } from './handlers/scheduler.js';
import { handleCheckLock, handleAcquireLock, handleReleaseLock, handleRenewLock, handleBreakLock, handleListLocks } from './handlers/content-lock.js';
import {
  handleListPatterns, handleGetPattern, handleCreatePattern,
  handleUpdatePattern, handleDeletePattern, handleBulkGenerate,
} from './handlers/pathauto.js';
import { handleGraphQL } from './graphql.js';
import { getModuleRoutes, isModuleEnabled } from '../core/index.js';
import { handleBatch } from './handlers/batch.js';
import {
  handleListRestResources, handleGetRestResource,
  handleEnableRestResource, handleDisableRestResource,
} from './handlers/rest-resources.js';
import {
  handleListParagraphTypes, handleCreateParagraphType, handleDeleteParagraphType,
  handleListParagraphs, handleGetParagraph, handleCreateParagraph,
  handleUpdateParagraph, handleDeleteParagraph, handleReorderParagraphs,
} from './handlers/paragraphs.js';
import { handleValidateEntity, handleGetConstraints, handleSetConstraints, handleDeleteConstraints } from './handlers/validation.js';
import { handleCreatePreview, handleGetPreview, handleDeletePreview } from './handlers/preview.js';
import {
  handleListActions, handleListTriggers, handleGetTrigger,
  handleCreateTrigger, handleUpdateTrigger, handleDeleteTrigger, handleExecuteTrigger,
} from './handlers/actions.js';
import {
  handleListContactForms, handleGetContactForm, handleCreateContactForm,
  handleUpdateContactForm, handleDeleteContactForm, handleSubmitContact,
  handleListContactMessages, handleGetContactMessage,
  handleUpdateContactMessageStatus, handleDeleteContactMessage,
} from './handlers/contact.js';
import {
  handleListShortcuts, handleAddShortcut, handleUpdateShortcut,
  handleDeleteShortcut, handleReorderShortcuts, handleListShortcutSets,
} from './handlers/shortcuts.js';
import { handleListTokenTypes, handleReplaceTokens } from './handlers/tokens.js';
import { handleList } from './handlers/list.js';
import { handleGet } from './handlers/get.js';
import { handleCreate } from './handlers/create.js';
import { handleUpdate } from './handlers/update.js';
import { handleDelete } from './handlers/delete.js';
import { validateEntityFields } from './validation.js';

const logger = createLogger('api:routes');

// ---------------------------------------------------------------------------
// Route entry type
// ---------------------------------------------------------------------------

export interface RouteEntry {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  pattern: string;
  handler: (req: any, res: any) => void | Promise<void>;
  middleware?: MiddlewareFn[];
  /** Skip CSRF validation for this route */
  skipCsrf?: boolean;
  /** This route accepts multipart/form-data uploads */
  isUpload?: boolean;
}

// ---------------------------------------------------------------------------
// Pattern matching
// ---------------------------------------------------------------------------

interface PatternRegex {
  regex: RegExp;
  keys: string[];
}

const patternCache = new Map<string, PatternRegex>();

function compilePattern(pattern: string): PatternRegex {
  let cached = patternCache.get(pattern);
  if (cached) return cached;

  const keys: string[] = [];
  const regexStr = pattern.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, key) => {
    keys.push(key);
    return '([^/]+)';
  });

  cached = { regex: new RegExp(`^${regexStr}$`), keys };
  patternCache.set(pattern, cached);
  return cached;
}

export function matchRoute(
  method: string,
  pathname: string,
  routes: RouteEntry[],
): { route: RouteEntry; params: Record<string, string> } | null {
  for (const route of routes) {
    if (route.method !== method) continue;

    const { regex, keys } = compilePattern(route.pattern);
    const match = pathname.match(regex);
    if (!match) continue;

    const params: Record<string, string> = {};
    for (let i = 0; i < keys.length; i++) {
      params[keys[i]] = decodeURIComponent(match[i + 1]);
    }
    return { route, params };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Route table builder
// ---------------------------------------------------------------------------

const startTime = Date.now();

// Shorthand for common middleware combos
const auth = () => [authenticate() as MiddlewareFn];
const authReq = () => [authenticate() as MiddlewareFn, requireAuth() as MiddlewareFn];
const adminUsers = () => [...authReq(), requirePermission('administer users') as MiddlewareFn];
const adminNodes = () => [...authReq(), requirePermission('administer nodes') as MiddlewareFn];
const adminSite = () => [...authReq(), requirePermission('administer site') as MiddlewareFn];
const adminBlocks = () => [...authReq(), requirePermission('administer blocks') as MiddlewareFn];

export function buildRouteTable(): RouteEntry[] {
  return [
    // ── Health ───────────────────────────────────────────────────────────
    {
      method: 'GET', pattern: '/api/health', skipCsrf: true,
      handler: async (_req: any, res: any) => {
        let dbStatus = 'ok';
        try {
          const { getConnection } = await import('../db/index.js');
          const conn = getConnection();
          await conn.raw('SELECT 1');
        } catch { dbStatus = 'error'; }
        const uptime = Math.floor((Date.now() - startTime) / 1000);
        res.json({ status: dbStatus === 'ok' ? 'healthy' : 'degraded', uptime, database: dbStatus, timestamp: new Date().toISOString() });
      },
    },

    // ── GraphQL (fallback when graphql module is not loaded) ───────────
    // When the graphql module is enabled, it provides these routes via the module system.
    // This fallback ensures backward compatibility for deployments that haven't adopted modules yet.
    ...(!isModuleEnabled('graphql') ? [
      { method: 'GET' as const, pattern: '/api/graphql', middleware: auth(), skipCsrf: true, handler: handleGraphQL },
      { method: 'POST' as const, pattern: '/api/graphql', middleware: auth(), skipCsrf: true, handler: handleGraphQL },
    ] : []),

    // ── CSRF token ───────────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/csrf-token', skipCsrf: true, handler: csrfTokenHandler },

    // ── Entity types ─────────────────────────────────────────────────────
    {
      method: 'GET', pattern: '/api/entity-types',
      middleware: auth(),
      handler: async (_req: any, res: any) => { res.json({ data: getAllEntityTypes() }); },
    },
    {
      method: 'GET', pattern: '/api/entity-types/:entityType/:bundle',
      middleware: auth(),
      handler: async (req: any, res: any) => {
        const { entityType, bundle } = req.params;
        const { getEntityTypeDefinition } = await import('../core/index.js');
        const definition = getEntityTypeDefinition(entityType, bundle);
        if (!definition) throw new NotFoundError(`Content type "${entityType}:${bundle}" not found`);
        res.json({ data: definition });
      },
    },
    { method: 'POST', pattern: '/api/entity-types', middleware: adminNodes(), handler: createContentType },
    { method: 'PATCH', pattern: '/api/entity-types/:entityType/:bundle', middleware: adminNodes(), handler: updateContentType },
    { method: 'DELETE', pattern: '/api/entity-types/:entityType/:bundle', middleware: adminNodes(), handler: deleteContentType },

    // ── Fields ───────────────────────────────────────────────────────────
    { method: 'POST', pattern: '/api/entity-types/:entityType/:bundle/fields', middleware: adminNodes(), handler: addField },
    { method: 'PUT', pattern: '/api/entity-types/:entityType/:bundle/fields/reorder', middleware: adminNodes(), handler: reorderFields },
    { method: 'PATCH', pattern: '/api/entity-types/:entityType/:bundle/fields/:fieldName', middleware: adminNodes(), handler: updateField },
    { method: 'DELETE', pattern: '/api/entity-types/:entityType/:bundle/fields/:fieldName', middleware: adminNodes(), handler: deleteField },

    // ── Public user profile (no auth required) ────────────────────────
    {
      method: 'GET', pattern: '/api/users/:uid/profile', skipCsrf: true,
      handler: async (req: any, res: any) => {
        const uid = parseInt(req.params.uid, 10);
        if (isNaN(uid)) throw new BadRequestError('Invalid user ID');
        const user = await loadUser(uid);
        if (!user || !user.status) throw new NotFoundError('User not found');
        res.json({ data: { uid: user.uid, name: user.name, created: user.created, roles: user.roles } });
      },
    },

    // ── Users ────────────────────────────────────────────────────────────
    {
      method: 'GET', pattern: '/api/users', middleware: adminUsers(),
      handler: async (_req: any, res: any) => {
        const users = await db.select('users', 'u').join('users_field_data', 'ufd', 'u.uid = ufd.uid').fields('u', ['uid', 'uuid']).fields('ufd', ['name', 'mail', 'status', 'created', 'changed']).orderBy('u.uid', 'ASC').execute<Record<string, unknown>>();
        const data = await Promise.all(users.map(async (user) => {
          const roleRows = await db.select('user__roles').fields(['roles_target_id']).condition('entity_id', user.uid).condition('deleted', 0).orderBy('delta', 'ASC').execute<{ roles_target_id: string }>();
          return { uid: user.uid, uuid: user.uuid, name: user.name, email: user.mail, status: (user.status as number) === 1, created: new Date((user.created as number) * 1000).toISOString(), changed: new Date(((user.changed as number) || (user.created as number)) * 1000).toISOString(), roles: roleRows.map((r) => r.roles_target_id) };
        }));
        res.json({ data, meta: { total: data.length } });
      },
    },
    {
      method: 'GET', pattern: '/api/users/:uid', middleware: adminUsers(),
      handler: async (req: any, res: any) => {
        const uid = parseInt(req.params.uid, 10);
        const user = await loadUser(uid);
        if (!user) throw new NotFoundError('User not found');
        res.json({ data: user });
      },
    },
    {
      method: 'POST', pattern: '/api/users', middleware: adminUsers(),
      handler: async (req: any, res: any) => {
        const { name, email, password, status, roles } = req.body;
        if (!name || !email || !password) throw new BadRequestError('name, email, and password are required');
        const user = await createUser({ name, email, password, status: status !== false, roles: roles ?? ['authenticated'] });
        res.status(201).json({ data: user });
      },
    },
    {
      method: 'PATCH', pattern: '/api/users/:uid', middleware: adminUsers(),
      handler: async (req: any, res: any) => {
        const uid = parseInt(req.params.uid, 10);
        const existing = await loadUser(uid);
        if (!existing) throw new NotFoundError('User not found');
        await updateUser(uid, req.body);
        const updated = await loadUser(uid);
        res.json({ data: updated });
      },
    },
    {
      method: 'DELETE', pattern: '/api/users/:uid', middleware: adminUsers(),
      handler: async (req: any, res: any) => {
        const uid = parseInt(req.params.uid, 10);
        const existing = await loadUser(uid);
        if (!existing) throw new NotFoundError('User not found');
        await deleteUser(uid);
        res.status(204).send();
      },
    },

    // ── Roles ────────────────────────────────────────────────────────────
    {
      method: 'GET', pattern: '/api/roles', middleware: authReq(),
      handler: async (_req: any, res: any) => {
        const roles = await loadAllRoles();
        const data = roles.map((r) => ({ name: r.id, label: r.label, weight: r.weight, is_admin: r.is_admin }));
        res.json({ data });
      },
    },
    {
      method: 'POST', pattern: '/api/roles', middleware: adminUsers(),
      handler: async (req: any, res: any) => {
        const { name, label } = req.body;
        if (!name || !label) throw new BadRequestError('name and label are required');
        await authCreateRole(name, label);
        const role = await loadRole(name);
        res.status(201).json({ data: { name: role!.id, label: role!.label, weight: role!.weight, is_admin: role!.is_admin } });
      },
    },
    {
      method: 'DELETE', pattern: '/api/roles/:name', middleware: adminUsers(),
      handler: async (req: any, res: any) => {
        const roleName = req.params.name;
        const role = await loadRole(roleName);
        if (!role) throw new NotFoundError('Role not found');
        await authDeleteRole(roleName);
        res.status(204).send();
      },
    },
    {
      method: 'GET', pattern: '/api/roles/:name/permissions', middleware: adminUsers(),
      handler: async (req: any, res: any) => {
        const roleName = req.params.name;
        const role = await loadRole(roleName);
        if (!role) throw new NotFoundError('Role not found');
        const allPerms = getAllPermissions();
        const allPermissions = Array.from(allPerms.entries()).map(([name, def]) => ({ name, title: def.title, description: def.description }));
        res.json({ role: { name: role.id, label: role.label, weight: role.weight, is_admin: role.is_admin }, permissions: role.permissions, allPermissions });
      },
    },
    {
      method: 'PUT', pattern: '/api/roles/:name/permissions', middleware: adminUsers(),
      handler: async (req: any, res: any) => {
        const roleName = req.params.name;
        const { permissions } = req.body as { permissions: string[] };
        if (!Array.isArray(permissions)) throw new BadRequestError('permissions must be an array');
        const role = await loadRole(roleName);
        if (!role) throw new NotFoundError('Role not found');
        await updateRolePermissions(roleName, permissions);
        res.status(204).send();
      },
    },

    // ── Taxonomy ─────────────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/taxonomy/vocabularies', middleware: auth(), handler: listVocabularies },
    {
      method: 'GET', pattern: '/api/taxonomy/vocabularies/:vid', middleware: auth(),
      handler: async (req: any, res: any) => {
        const { vid } = req.params;
        const { getEntityTypeDefinition } = await import('../core/index.js');
        const definition = getEntityTypeDefinition('taxonomy_term', vid);
        if (!definition) throw new NotFoundError(`Vocabulary "${vid}" not found`);
        res.json({ data: definition });
      },
    },
    { method: 'POST', pattern: '/api/taxonomy/vocabularies', middleware: adminNodes(), handler: createVocabulary },
    { method: 'PATCH', pattern: '/api/taxonomy/vocabularies/:vid', middleware: adminNodes(), handler: updateVocabulary },
    { method: 'DELETE', pattern: '/api/taxonomy/vocabularies/:vid', middleware: adminNodes(), handler: deleteVocabulary },
    { method: 'GET', pattern: '/api/taxonomy/:vid/tree', middleware: auth(), handler: getTermTree },
    { method: 'PATCH', pattern: '/api/taxonomy/:vid/reorder', middleware: authReq(), handler: reorderTerms },
    { method: 'GET', pattern: '/api/taxonomy/:vid/content-counts', middleware: auth(), handler: getTermContentCounts },
    { method: 'GET', pattern: '/api/taxonomy/:vid/term-ancestors/:tid', middleware: auth(), handler: getTermAncestors },

    // ── Files ────────────────────────────────────────────────────────────
    {
      method: 'POST', pattern: '/api/files/upload', middleware: authReq(), isUpload: true,
      handler: async (req: any, res: any) => {
        await handleFileUpload(req, res);
        const file = req.file;
        if (file && file.mimetype.startsWith('image/')) {
          generateAllStyles(file.path).catch((err: unknown) => { logger.error('Failed to generate image styles', { error: String(err) }); });
        }
      },
    },
    { method: 'GET', pattern: '/api/files/:id', handler: handleFileGet },
    { method: 'GET', pattern: '/api/files/:id/download', handler: handleFileDownload },
    { method: 'GET', pattern: '/api/files/:id/style/:style', handler: handleFileStyleDownload },
    { method: 'DELETE', pattern: '/api/files/:id', middleware: authReq(), handler: handleFileDelete },

    // ── Media ────────────────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/media', middleware: auth(), handler: handleMediaList },
    { method: 'GET', pattern: '/api/media/images', middleware: auth(), handler: handleMediaImages },
    {
      method: 'POST', pattern: '/api/media/upload', middleware: authReq(), isUpload: true,
      handler: async (req: any, res: any) => {
        await handleMediaUpload(req, res);
        const file = req.file;
        if (file && file.mimetype.startsWith('image/')) {
          generateAllStyles(file.path).catch((err: unknown) => { logger.error('Failed to generate image styles', { error: String(err) }); });
        }
      },
    },
    { method: 'DELETE', pattern: '/api/media/:id', middleware: authReq(), handler: handleMediaDelete },

    // ── Aliases ──────────────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/aliases', middleware: auth(), handler: handleListAliases },
    { method: 'GET', pattern: '/api/aliases/resolve', handler: handleResolveAlias },
    { method: 'POST', pattern: '/api/aliases', middleware: adminNodes(), handler: handleCreateAlias },
    { method: 'DELETE', pattern: '/api/aliases/:id', middleware: adminNodes(), handler: handleDeleteAlias },

    // ── Pathauto ─────────────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/pathauto/patterns', middleware: adminNodes(), handler: handleListPatterns },
    { method: 'GET', pattern: '/api/pathauto/patterns/:id', middleware: adminNodes(), handler: handleGetPattern },
    { method: 'POST', pattern: '/api/pathauto/patterns', middleware: adminNodes(), handler: handleCreatePattern },
    { method: 'PATCH', pattern: '/api/pathauto/patterns/:id', middleware: adminNodes(), handler: handleUpdatePattern },
    { method: 'DELETE', pattern: '/api/pathauto/patterns/:id', middleware: adminNodes(), handler: handleDeletePattern },
    { method: 'POST', pattern: '/api/pathauto/generate', middleware: adminNodes(), handler: handleBulkGenerate },

    // ── Webhooks ─────────────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/webhooks', middleware: adminNodes(), handler: handleListWebhooks },
    { method: 'GET', pattern: '/api/webhooks/:id', middleware: adminNodes(), handler: handleGetWebhook },
    { method: 'POST', pattern: '/api/webhooks', middleware: adminNodes(), handler: handleCreateWebhook },
    { method: 'PATCH', pattern: '/api/webhooks/:id', middleware: adminNodes(), handler: handleUpdateWebhook },
    { method: 'DELETE', pattern: '/api/webhooks/:id', middleware: adminNodes(), handler: handleDeleteWebhook },

    // ── Validation ───────────────────────────────────────────────────────
    { method: 'POST', pattern: '/api/validate/:entityType/:bundle', middleware: auth(), handler: handleValidateEntity },
    { method: 'GET', pattern: '/api/constraints/:entityType/:bundle', middleware: auth(), handler: handleGetConstraints },
    { method: 'PUT', pattern: '/api/constraints/:entityType/:bundle/:fieldName', middleware: adminNodes(), handler: handleSetConstraints },
    { method: 'DELETE', pattern: '/api/constraints/:entityType/:bundle/:fieldName', middleware: adminNodes(), handler: handleDeleteConstraints },

    // ── Site config ──────────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/config/site', middleware: auth(), handler: getSiteConfig },
    { method: 'PATCH', pattern: '/api/config/site', middleware: adminSite(), handler: updateSiteConfig },
    { method: 'GET', pattern: '/api/config/export', middleware: adminSite(), handler: handleExportConfig },
    { method: 'POST', pattern: '/api/config/import', middleware: adminSite(), handler: handleImportConfig },
    { method: 'POST', pattern: '/api/config/diff', middleware: adminSite(), handler: handleDiffConfig },

    // ── Text formats ─────────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/config/text-formats', middleware: auth(), handler: getTextFormats },
    { method: 'POST', pattern: '/api/config/text-formats', middleware: adminSite(), handler: createTextFormat },
    { method: 'PATCH', pattern: '/api/config/text-formats/:id', middleware: adminSite(), handler: updateTextFormat },
    { method: 'DELETE', pattern: '/api/config/text-formats/:id', middleware: adminSite(), handler: deleteTextFormat },

    // ── Image styles config ──────────────────────────────────────────────
    { method: 'GET', pattern: '/api/config/image-styles', middleware: auth(), handler: getImageStylesConfig },
    { method: 'POST', pattern: '/api/config/image-styles', middleware: adminSite(), handler: createImageStyle },
    { method: 'PATCH', pattern: '/api/config/image-styles/:id', middleware: adminSite(), handler: updateImageStyle },
    { method: 'DELETE', pattern: '/api/config/image-styles/:id', middleware: adminSite(), handler: deleteImageStyle },

    // ── Modules ──────────────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/modules', middleware: auth(), handler: listModules },
    { method: 'POST', pattern: '/api/modules/:name/enable', middleware: adminSite(), handler: enableModuleHandler },
    { method: 'POST', pattern: '/api/modules/:name/disable', middleware: adminSite(), handler: disableModuleHandler },

    // ── Reports ──────────────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/reports/status', middleware: auth(), handler: getStatusReport },
    { method: 'GET', pattern: '/api/reports/logs', middleware: authReq(), handler: getLogs },
    { method: 'DELETE', pattern: '/api/reports/logs', middleware: adminSite(), handler: clearLogs },
    { method: 'GET', pattern: '/api/reports/top-pages', middleware: authReq(), handler: getTopPages },

    // ── Cache ────────────────────────────────────────────────────────────
    {
      method: 'GET', pattern: '/api/cache/stats', middleware: adminSite(),
      handler: async (_req: any, res: any) => { res.json({ data: cacheStats() }); },
    },
    {
      method: 'DELETE', pattern: '/api/cache', middleware: adminSite(),
      handler: async (_req: any, res: any) => { cacheClearAll(); res.status(204).send(); },
    },

    // ── REST resources ───────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/rest-resources', middleware: adminSite(), handler: handleListRestResources },
    { method: 'GET', pattern: '/api/rest-resources/:id', middleware: adminSite(), handler: handleGetRestResource },
    { method: 'POST', pattern: '/api/rest-resources/:id/enable', middleware: adminSite(), handler: handleEnableRestResource },
    { method: 'POST', pattern: '/api/rest-resources/:id/disable', middleware: adminSite(), handler: handleDisableRestResource },

    // ── Cron ─────────────────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/cron/status', middleware: adminSite(), handler: handleGetCronStatus },
    { method: 'POST', pattern: '/api/cron/run', middleware: adminSite(), handler: handleRunCron },

    // ── Search ───────────────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/search', middleware: auth(), handler: handleSearch },

    // ── Menus ────────────────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/menus', middleware: auth(), handler: handleListMenus },
    { method: 'GET', pattern: '/api/menus/:menuId', middleware: auth(), handler: handleGetMenu },
    { method: 'POST', pattern: '/api/menus', middleware: adminSite(), handler: handleCreateMenu },
    { method: 'DELETE', pattern: '/api/menus/:menuId', middleware: adminSite(), handler: handleDeleteMenu },
    { method: 'POST', pattern: '/api/menus/:menuId/items', middleware: adminSite(), handler: handleAddMenuItem },
    { method: 'PATCH', pattern: '/api/menus/:menuId/items/:itemId', middleware: adminSite(), handler: handleUpdateMenuItem },
    { method: 'DELETE', pattern: '/api/menus/:menuId/items/:itemId', middleware: adminSite(), handler: handleDeleteMenuItem },
    { method: 'PATCH', pattern: '/api/menus/:menuId/reorder', middleware: adminSite(), handler: handleReorderMenuItems },

    // ── Views ────────────────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/views', middleware: auth(), handler: handleListViews },
    { method: 'GET', pattern: '/api/views/:id', middleware: auth(), handler: handleGetView },
    { method: 'GET', pattern: '/api/views/:id/execute', middleware: auth(), handler: handleExecuteView },
    { method: 'POST', pattern: '/api/views', middleware: adminSite(), handler: handleCreateView },
    { method: 'PATCH', pattern: '/api/views/:id', middleware: adminSite(), handler: handleUpdateView },
    { method: 'DELETE', pattern: '/api/views/:id', middleware: adminSite(), handler: handleDeleteView },

    // ── Comments ─────────────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/comments', middleware: auth(), handler: handleListComments },
    { method: 'GET', pattern: '/api/comments/:cid', middleware: auth(), handler: handleGetComment },
    { method: 'POST', pattern: '/api/comments', middleware: auth(), handler: handleCreateComment },
    { method: 'PATCH', pattern: '/api/comments/:cid', middleware: authReq(), handler: handleUpdateComment },
    { method: 'DELETE', pattern: '/api/comments/:cid', middleware: authReq(), handler: handleDeleteComment },

    // ── State API ────────────────────────────────────────────────────────
    {
      method: 'GET', pattern: '/api/state/:key', middleware: adminSite(),
      handler: async (req: any, res: any) => {
        const { stateGet } = await import('../core/index.js');
        const value = await stateGet(req.params.key);
        res.json({ data: { key: req.params.key, value: value ?? null } });
      },
    },
    {
      method: 'PUT', pattern: '/api/state/:key', middleware: adminSite(),
      handler: async (req: any, res: any) => {
        const { stateSet } = await import('../core/index.js');
        await stateSet(req.params.key, req.body.value);
        res.json({ data: { key: req.params.key, value: req.body.value } });
      },
    },
    {
      method: 'DELETE', pattern: '/api/state/:key', middleware: adminSite(),
      handler: async (req: any, res: any) => {
        const { stateDelete } = await import('../core/index.js');
        await stateDelete(req.params.key);
        res.status(204).send();
      },
    },

    // ── Queue API ────────────────────────────────────────────────────────
    {
      method: 'GET', pattern: '/api/queues', middleware: adminSite(),
      handler: async (_req: any, res: any) => {
        const { listQueues } = await import('../core/index.js');
        const queues = await listQueues();
        res.json({ data: queues });
      },
    },
    {
      method: 'POST', pattern: '/api/queues/:name', middleware: adminSite(),
      handler: async (req: any, res: any) => {
        const { createQueueItem } = await import('../core/index.js');
        const itemId = await createQueueItem(req.params.name, req.body.data);
        res.status(201).json({ data: { item_id: itemId } });
      },
    },
    {
      method: 'POST', pattern: '/api/queues/:name/process', middleware: adminSite(),
      handler: async (req: any, res: any) => {
        const { processQueue } = await import('../core/index.js');
        const maxItems = parseInt(req.query.max as string, 10) || 10;
        const processed = await processQueue(req.params.name, maxItems);
        res.json({ data: { processed } });
      },
    },
    {
      method: 'DELETE', pattern: '/api/queues/:name', middleware: adminSite(),
      handler: async (req: any, res: any) => {
        const { purgeQueue } = await import('../core/index.js');
        await purgeQueue(req.params.name);
        res.status(204).send();
      },
    },

    // ── Blocks ───────────────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/blocks', middleware: auth(), handler: handleListBlocks },
    { method: 'GET', pattern: '/api/block-placements', middleware: auth(), handler: handleListPlacements },
    { method: 'GET', pattern: '/api/block-placements/:id', middleware: auth(), handler: handleGetPlacement },
    { method: 'POST', pattern: '/api/block-placements', middleware: adminBlocks(), handler: handleCreatePlacement },
    { method: 'PATCH', pattern: '/api/block-placements/:id', middleware: adminBlocks(), handler: handleUpdatePlacement },
    { method: 'DELETE', pattern: '/api/block-placements/:id', middleware: adminBlocks(), handler: handleDeletePlacement },
    { method: 'GET', pattern: '/api/regions', middleware: auth(), handler: handleGetRegions },
    { method: 'PUT', pattern: '/api/regions', middleware: adminBlocks(), handler: handleSaveRegions },
    { method: 'GET', pattern: '/api/regions/:region/render', handler: handleRenderRegion },

    // ── Display modes ────────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/display-modes/:entityType', middleware: auth(), handler: handleListViewModes },
    { method: 'GET', pattern: '/api/display-modes/:entityType/:mode', middleware: auth(), handler: handleGetViewMode },
    { method: 'POST', pattern: '/api/display-modes/:entityType', middleware: adminNodes(), handler: handleCreateViewMode },
    { method: 'DELETE', pattern: '/api/display-modes/:entityType/:mode', middleware: adminNodes(), handler: handleDeleteViewMode },
    { method: 'GET', pattern: '/api/display/:entityType/:bundle', middleware: auth(), handler: handleListViewDisplays },
    { method: 'GET', pattern: '/api/display/:entityType/:bundle/:mode', middleware: auth(), handler: handleGetViewDisplay },
    { method: 'PUT', pattern: '/api/display/:entityType/:bundle/:mode', middleware: adminNodes(), handler: handleSaveViewDisplay },
    { method: 'DELETE', pattern: '/api/display/:entityType/:bundle/:mode', middleware: adminNodes(), handler: handleDeleteViewDisplay },
    { method: 'POST', pattern: '/api/display/:entityType/:bundle/:mode/apply', middleware: auth(), handler: handleApplyViewDisplay },

    // ── Workflows ────────────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/workflows', middleware: adminNodes(), handler: handleListWorkflows },
    { method: 'GET', pattern: '/api/workflows/:id', middleware: adminNodes(), handler: handleGetWorkflow },
    { method: 'POST', pattern: '/api/workflows', middleware: adminNodes(), handler: handleCreateWorkflow },
    { method: 'DELETE', pattern: '/api/workflows/:id', middleware: adminNodes(), handler: handleDeleteWorkflow },
    { method: 'GET', pattern: '/api/workflows/:id/transitions/:state', middleware: authReq(), handler: handleGetTransitions },

    // ── Languages ────────────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/languages', middleware: auth(), handler: handleListLanguages },
    { method: 'GET', pattern: '/api/languages/enabled', middleware: auth(), handler: handleListEnabledLanguages },
    { method: 'GET', pattern: '/api/languages/default', middleware: auth(), handler: handleGetDefaultLanguage },
    { method: 'POST', pattern: '/api/languages', middleware: adminSite(), handler: handleAddLanguage },
    { method: 'PATCH', pattern: '/api/languages/:id', middleware: adminSite(), handler: handleUpdateLanguage },
    { method: 'DELETE', pattern: '/api/languages/:id', middleware: adminSite(), handler: handleRemoveLanguage },

    // ── Layout builder ───────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/layout-types', middleware: auth(), handler: handleListLayoutTypes },
    { method: 'GET', pattern: '/api/layout/:entityType/:bundle/:viewMode/render', middleware: auth(), handler: handleRenderLayout },
    { method: 'GET', pattern: '/api/layout/:entityType/:bundle/:viewMode', middleware: auth(), handler: handleGetLayout },
    { method: 'PUT', pattern: '/api/layout/:entityType/:bundle/:viewMode', middleware: adminNodes(), handler: handleSaveLayout },
    { method: 'DELETE', pattern: '/api/layout/:entityType/:bundle/:viewMode', middleware: adminNodes(), handler: handleDeleteLayout },
    { method: 'POST', pattern: '/api/layout/:entityType/:bundle/:viewMode/sections', middleware: adminNodes(), handler: handleAddSection },
    { method: 'DELETE', pattern: '/api/layout/:entityType/:bundle/:viewMode/sections/:sectionId', middleware: adminNodes(), handler: handleRemoveSection },
    { method: 'POST', pattern: '/api/layout/:entityType/:bundle/:viewMode/sections/:sectionId/components', middleware: adminNodes(), handler: handleAddComponent },
    { method: 'DELETE', pattern: '/api/layout/:entityType/:bundle/:viewMode/sections/:sectionId/components/:componentId', middleware: adminNodes(), handler: handleRemoveComponent },

    // ── Schedules ────────────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/schedules', middleware: adminSite(), handler: handleListSchedules },
    { method: 'GET', pattern: '/api/:entityType/:bundle/:id/schedule', middleware: authReq(), handler: handleGetSchedule },
    { method: 'POST', pattern: '/api/:entityType/:bundle/:id/schedule', middleware: authReq(), handler: handleSetSchedule },
    { method: 'DELETE', pattern: '/api/:entityType/:bundle/:id/schedule', middleware: authReq(), handler: handleCancelSchedule },

    // ── Content locks ────────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/content-locks', middleware: adminSite(), handler: handleListLocks },
    { method: 'GET', pattern: '/api/:entityType/:bundle/:id/lock', middleware: authReq(), handler: handleCheckLock },
    { method: 'POST', pattern: '/api/:entityType/:bundle/:id/lock', middleware: authReq(), handler: handleAcquireLock },
    { method: 'DELETE', pattern: '/api/:entityType/:bundle/:id/lock', middleware: authReq(), handler: handleReleaseLock },
    { method: 'POST', pattern: '/api/:entityType/:bundle/:id/lock/renew', middleware: authReq(), handler: handleRenewLock },
    { method: 'POST', pattern: '/api/:entityType/:bundle/:id/lock/break', middleware: adminSite(), handler: handleBreakLock },

    // ── Translations ─────────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/:entityType/:bundle/:id/translations', middleware: authReq(), handler: handleGetTranslations },
    { method: 'GET', pattern: '/api/:entityType/:bundle/:id/translations/:langcode', middleware: auth(), handler: handleGetTranslation },
    { method: 'POST', pattern: '/api/:entityType/:bundle/:id/translations/:langcode', middleware: authReq(), handler: handleCreateTranslation },
    { method: 'PATCH', pattern: '/api/:entityType/:bundle/:id/translations/:langcode', middleware: authReq(), handler: handleUpdateTranslation },
    { method: 'DELETE', pattern: '/api/:entityType/:bundle/:id/translations/:langcode', middleware: authReq(), handler: handleDeleteTranslation },

    // ── Paragraph types ──────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/paragraph-types', middleware: auth(), handler: handleListParagraphTypes },
    { method: 'POST', pattern: '/api/paragraph-types', middleware: adminNodes(), handler: handleCreateParagraphType },
    { method: 'DELETE', pattern: '/api/paragraph-types/:id', middleware: adminNodes(), handler: handleDeleteParagraphType },

    // ── Paragraphs ───────────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/paragraphs/:paragraphId', middleware: auth(), handler: handleGetParagraph },
    { method: 'PATCH', pattern: '/api/paragraphs/:paragraphId', middleware: adminNodes(), handler: handleUpdateParagraph },
    { method: 'DELETE', pattern: '/api/paragraphs/:paragraphId', middleware: adminNodes(), handler: handleDeleteParagraph },
    { method: 'GET', pattern: '/api/:entityType/:bundle/:id/paragraphs', middleware: auth(), handler: handleListParagraphs },
    { method: 'POST', pattern: '/api/:entityType/:bundle/:id/paragraphs', middleware: adminNodes(), handler: handleCreateParagraph },
    { method: 'PATCH', pattern: '/api/:entityType/:bundle/:id/paragraphs/reorder', middleware: adminNodes(), handler: handleReorderParagraphs },

    // ── Moderation ───────────────────────────────────────────────────────
    { method: 'POST', pattern: '/api/:entityType/:bundle/:id/moderation', middleware: authReq(), handler: handleApplyTransition },
    { method: 'GET', pattern: '/api/:entityType/:bundle/:id/moderation', middleware: authReq(), handler: handleGetModerationHistory },

    // ── Preview ──────────────────────────────────────────────────────────
    { method: 'POST', pattern: '/api/preview', middleware: authReq(), handler: handleCreatePreview },
    { method: 'GET', pattern: '/api/preview/:previewId', handler: handleGetPreview },
    { method: 'DELETE', pattern: '/api/preview/:previewId', middleware: authReq(), handler: handleDeletePreview },

    // ── Revisions (generic — works for node, media, etc.) ────────────────
    {
      method: 'GET', pattern: '/api/:entityType/:bundle/:nid/revisions', middleware: authReq(),
      handler: async (req: any, res: any) => {
        const entityType = req.params.entityType;
        const nid = parseInt(req.params.nid, 10);
        if (isNaN(nid)) throw new BadRequestError('Invalid id');
        const entity = await Entity.load(entityType, nid);
        if (!entity) throw new NotFoundError('Entity not found');
        const revisions = await Entity.listRevisions(entityType, nid);
        res.json({ data: revisions, meta: { current_vid: entity.vid } });
      },
    },
    {
      method: 'GET', pattern: '/api/:entityType/:bundle/:nid/revisions/:vid', middleware: authReq(),
      handler: async (req: any, res: any) => {
        const entityType = req.params.entityType;
        const nid = parseInt(req.params.nid, 10);
        const vid = parseInt(req.params.vid, 10);
        if (isNaN(nid) || isNaN(vid)) throw new BadRequestError('Invalid id or vid');
        const entity = await Entity.loadRevision(entityType, nid, vid);
        if (!entity) throw new NotFoundError('Revision not found');
        res.json({ data: entity.toJSON() });
      },
    },
    {
      method: 'POST', pattern: '/api/:entityType/:bundle/:nid/revisions/:vid/revert', middleware: adminNodes(),
      handler: async (req: any, res: any) => {
        const entityType = req.params.entityType;
        const nid = parseInt(req.params.nid, 10);
        const vid = parseInt(req.params.vid, 10);
        if (isNaN(nid) || isNaN(vid)) throw new BadRequestError('Invalid id or vid');
        const entity = await Entity.revertToRevision(entityType, nid, vid);
        res.json({ data: entity.toJSON() });
      },
    },
    {
      method: 'GET', pattern: '/api/:entityType/:bundle/:nid/revisions/:vid1/diff/:vid2', middleware: authReq(),
      handler: async (req: any, res: any) => {
        const entityType = req.params.entityType;
        const nid = parseInt(req.params.nid, 10);
        const vid1 = parseInt(req.params.vid1, 10);
        const vid2 = parseInt(req.params.vid2, 10);
        if (isNaN(nid) || isNaN(vid1) || isNaN(vid2)) throw new BadRequestError('Invalid id, vid1, or vid2');
        const rev1 = await Entity.loadRevision(entityType, nid, vid1);
        const rev2 = await Entity.loadRevision(entityType, nid, vid2);
        if (!rev1 || !rev2) throw new NotFoundError('One or both revisions not found');
        const data1 = rev1.toJSON();
        const data2 = rev2.toJSON();
        const allKeys = new Set([...Object.keys(data1), ...Object.keys(data2)]);
        const skipFields = new Set(['nid', 'uuid', 'type', 'langcode', 'vid', 'default_langcode', 'revision_translation_affected']);
        const changes: Array<{ field: string; old_value: unknown; new_value: unknown }> = [];
        for (const key of allKeys) {
          if (skipFields.has(key)) continue;
          const oldVal = data1[key]; const newVal = data2[key];
          if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) changes.push({ field: key, old_value: oldVal, new_value: newVal });
        }
        res.json({ data: { from_vid: vid1, to_vid: vid2, changes } });
      },
    },

    // ── OpenAPI docs ─────────────────────────────────────────────────────
    {
      method: 'GET', pattern: '/api/docs/openapi.json', skipCsrf: true,
      handler: async (_req: any, res: any) => { res.json(generateOpenApiSpec()); },
    },
    {
      method: 'GET', pattern: '/api/docs', skipCsrf: true,
      handler: async (_req: any, res: any) => {
        res.setHeader('content-type', 'text/html');
        res.send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>DropJS API Docs</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head><body><div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: '/api/docs/openapi.json', dom_id: '#swagger-ui' });</script>
</body></html>`);
      },
    },

    // ── Actions & Triggers ───────────────────────────────────────────────
    { method: 'GET', pattern: '/api/actions', middleware: auth(), handler: handleListActions },
    { method: 'GET', pattern: '/api/triggers', middleware: adminSite(), handler: handleListTriggers },
    { method: 'GET', pattern: '/api/triggers/:id', middleware: adminSite(), handler: handleGetTrigger },
    { method: 'POST', pattern: '/api/triggers', middleware: adminSite(), handler: handleCreateTrigger },
    { method: 'PATCH', pattern: '/api/triggers/:id', middleware: adminSite(), handler: handleUpdateTrigger },
    { method: 'DELETE', pattern: '/api/triggers/:id', middleware: adminSite(), handler: handleDeleteTrigger },
    { method: 'POST', pattern: '/api/triggers/:id/execute', middleware: adminSite(), handler: handleExecuteTrigger },

    // ── Contact forms ────────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/contact/forms', middleware: auth(), handler: handleListContactForms },
    { method: 'GET', pattern: '/api/contact/forms/:machineName', middleware: auth(), handler: handleGetContactForm },
    { method: 'POST', pattern: '/api/contact/forms', middleware: adminSite(), handler: handleCreateContactForm },
    { method: 'PATCH', pattern: '/api/contact/forms/:machineName', middleware: adminSite(), handler: handleUpdateContactForm },
    { method: 'DELETE', pattern: '/api/contact/forms/:machineName', middleware: adminSite(), handler: handleDeleteContactForm },
    { method: 'POST', pattern: '/api/contact/forms/:machineName/submit', middleware: auth(), handler: handleSubmitContact },
    { method: 'GET', pattern: '/api/contact/messages', middleware: adminSite(), handler: handleListContactMessages },
    { method: 'GET', pattern: '/api/contact/messages/:id', middleware: adminSite(), handler: handleGetContactMessage },
    { method: 'PATCH', pattern: '/api/contact/messages/:id', middleware: adminSite(), handler: handleUpdateContactMessageStatus },
    { method: 'DELETE', pattern: '/api/contact/messages/:id', middleware: adminSite(), handler: handleDeleteContactMessage },

    // ── Shortcuts ────────────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/shortcuts', middleware: authReq(), handler: handleListShortcuts },
    { method: 'POST', pattern: '/api/shortcuts', middleware: authReq(), handler: handleAddShortcut },
    { method: 'PATCH', pattern: '/api/shortcuts/reorder', middleware: authReq(), handler: handleReorderShortcuts },
    { method: 'PATCH', pattern: '/api/shortcuts/:id', middleware: authReq(), handler: handleUpdateShortcut },
    { method: 'DELETE', pattern: '/api/shortcuts/:id', middleware: authReq(), handler: handleDeleteShortcut },
    { method: 'GET', pattern: '/api/shortcut-sets', middleware: authReq(), handler: handleListShortcutSets },

    // ── Tokens ───────────────────────────────────────────────────────────
    { method: 'GET', pattern: '/api/tokens', middleware: auth(), handler: handleListTokenTypes },
    { method: 'POST', pattern: '/api/tokens/replace', middleware: auth(), handler: handleReplaceTokens },

    // ── Field groups ─────────────────────────────────────────────────────
    {
      method: 'GET', pattern: '/api/field-groups/:entityType/:bundle', middleware: auth(),
      handler: async (req: any, res: any) => {
        const { listFieldGroups } = await import('../core/index.js');
        const viewMode = (req.query.view_mode as string) || 'default';
        const groups = await listFieldGroups(req.params.entityType, req.params.bundle, viewMode);
        res.json({ data: groups });
      },
    },

    // ── Batch ────────────────────────────────────────────────────────────
    { method: 'POST', pattern: '/api/batch', middleware: authReq(), handler: handleBatch },

    // ── Entity lookup by ID (no bundle required) ────────────────────────
    {
      method: 'GET',
      pattern: '/api/entity/:entityType/:id',
      middleware: auth(),
      handler: async (req: any, res: any) => {
        const { entityType, id } = req.params;
        const numId = parseInt(id, 10);
        if (isNaN(numId)) throw new BadRequestError('Invalid entity ID');
        const entity = await Entity.load(entityType, numId);
        if (!entity) throw new NotFoundError(`${entityType}/${id} not found`);
        res.json({ data: entity.toJSON() });
      },
    },

    // ── Module-contributed routes ────────────────────────────────────────
    // Inserted before generic entity catch-all routes so module patterns take priority.
    ...getModuleRoutes() as RouteEntry[],

    // ── Entity CRUD (catch-all — MUST be last) ──────────────────────────
    { method: 'GET', pattern: '/api/:entityType/:bundle', middleware: auth(), handler: handleList },
    { method: 'GET', pattern: '/api/:entityType/:bundle/:id', middleware: auth(), handler: handleGet },
    { method: 'POST', pattern: '/api/:entityType/:bundle', middleware: [...authReq(), validateEntityFields as MiddlewareFn], handler: handleCreate },
    { method: 'PATCH', pattern: '/api/:entityType/:bundle/:id', middleware: [...authReq(), validateEntityFields as MiddlewareFn], handler: handleUpdate },
    { method: 'DELETE', pattern: '/api/:entityType/:bundle/:id', middleware: authReq(), handler: handleDelete },
  ];
}
