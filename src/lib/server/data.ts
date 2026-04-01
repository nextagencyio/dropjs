import 'server-only';
import { ensureInitialized } from '../../api/init';
import { Entity, type EntityData } from '../../core/entity';
import { EntityQuery } from '../../core/entity-query';
import {
  getAllEntityTypes,
  getEntityTypeDefinition,
  getEntityTypesForType,
  type EntityTypeDefinition,
} from '../../core/entity-type';
import { loadUser, type UserData } from '../../auth/user';
import { loadAllRoles, loadRole, type RoleConfig } from '../../auth/access';
import { getAllPermissions, type PermissionDefinition } from '../../auth/permissions';
import { db } from '../../db/index';
import {
  listWebhooks,
  type Webhook,
} from '../../core/webhooks';
import {
  listViews,
  loadView,
  executeView,
  type ViewDefinition,
  type ViewResult,
} from '../../core/views';
import {
  listBlockPlacements,
  loadBlockPlacement,
  getAllBlocks,
  loadThemeRegions,
  getDefaultRegions,
  type BlockPlacement,
  type BlockDefinition,
  type RegionDefinition,
} from '../../core/blocks';
import {
  loadConfig,
  loadAllConfig,
} from '../../core/config-storage';
import {
  listAliases,
  type UrlAlias,
} from '../../core/url-alias';
import {
  listContactForms,
  listContactMessages,
  type ContactForm,
  type ContactMessage,
} from '../../core/contact';
import {
  listShortcutSets,
  listShortcuts,
  type ShortcutSet,
  type Shortcut,
} from '../../core/shortcuts';
import {
  getAllModules,
  getEnabledModules,
} from '../../core/module-loader';
import {
  getLanguages,
} from '../../core/translation';
import {
  getPathautoPatterns,
  type PathautoPattern,
} from '../../core/pathauto';
import {
  getAllParagraphTypes,
  type ParagraphType,
} from '../../core/paragraphs';
import {
  listFieldGroups,
  getGroupedFieldLayout,
  type FieldGroup,
} from '../../core/field-group';
import {
  getRecentAuditLog,
  getAuditLog,
  queryAuditLog,
  type AuditLogEntry,
  type AuditLogFilterOptions,
} from '../../core/audit-log';

// ── Entity Data ─────────────────────────────────────────────────────

export async function getEntityTypes(): Promise<EntityTypeDefinition[]> {
  await ensureInitialized();
  return getAllEntityTypes();
}

export async function getEntityType(entityType: string, bundle: string): Promise<EntityTypeDefinition | undefined> {
  await ensureInitialized();
  return getEntityTypeDefinition(entityType, bundle);
}

export async function getEntityTypesFor(entityType: string): Promise<EntityTypeDefinition[]> {
  await ensureInitialized();
  return getEntityTypesForType(entityType);
}

export interface EntityListParams {
  offset?: number;
  limit?: number;
  sort?: string;
  filters?: Record<string, string>;
  search?: string;
}

export interface EntityListResult {
  data: EntityData[];
  meta: { count: number; total: number; offset: number; limit: number };
}

export async function listEntities(
  entityType: string,
  bundle: string,
  params?: EntityListParams,
): Promise<EntityListResult> {
  await ensureInitialized();

  const offset = params?.offset ?? 0;
  const limit = params?.limit ?? 50;

  // Build query for total count (without pagination)
  const countQuery = new EntityQuery(entityType);
  countQuery.condition('type', bundle);

  // Build query for results
  const query = new EntityQuery(entityType);
  query.condition('type', bundle);

  // Apply filters to both queries
  if (params?.filters) {
    for (const [key, value] of Object.entries(params.filters)) {
      if (value !== undefined && value !== '') {
        query.condition(key, value);
        countQuery.condition(key, value);
      }
    }
  }

  // Apply search (title LIKE)
  if (params?.search) {
    query.condition('title', `%${params.search}%`, 'LIKE');
    countQuery.condition('title', `%${params.search}%`, 'LIKE');
  }

  // Apply sorting
  if (params?.sort) {
    const desc = params.sort.startsWith('-');
    const field = desc ? params.sort.slice(1) : params.sort;
    query.sort(field, desc ? 'DESC' : 'ASC');
  } else {
    query.sort('changed', 'DESC');
  }

  // Get total count (execute returns IDs, count them)
  const allIds = await countQuery.execute();
  const total = allIds.length;

  // Apply pagination and get result IDs
  query.range(offset, limit);
  const ids = await query.execute();

  // Load full entities
  const data: EntityData[] = [];
  for (const id of ids) {
    const entity = await Entity.load(entityType, id);
    if (entity) data.push(entity.toJSON());
  }

  return {
    data,
    meta: { count: data.length, total, offset, limit },
  };
}

export async function loadEntity(entityType: string, id: number): Promise<EntityData | null> {
  await ensureInitialized();
  const entity = await Entity.load(entityType, id);
  return entity ? entity.toJSON() : null;
}

// ── Users ───────────────────────────────────────────────────────────

export async function listUsers(): Promise<{ data: UserData[]; total: number }> {
  await ensureInitialized();
  const rows = await db
    .select('users', 'u')
    .join('users_field_data', 'ufd', 'u.uid = ufd.uid')
    .fields('u', ['uid', 'uuid'])
    .fields('ufd', ['name', 'mail', 'status', 'created', 'changed'])
    .orderBy('ufd.created', 'DESC')
    .execute<Record<string, unknown>>();

  const users: UserData[] = [];
  for (const row of rows) {
    const user = await loadUser(row.uid as number);
    if (user) users.push(user);
  }

  return { data: users, total: users.length };
}

// ── Roles ───────────────────────────────────────────────────────────

export async function getRoles(): Promise<RoleConfig[]> {
  await ensureInitialized();
  return loadAllRoles();
}

export async function getRole(name: string): Promise<RoleConfig | null> {
  await ensureInitialized();
  return loadRole(name);
}

export interface RolePermissionsData {
  role: { name: string; label: string };
  permissions: string[];
  allPermissions: { name: string; title: string; description?: string }[];
}

export async function getRolePermissions(roleName: string): Promise<RolePermissionsData | null> {
  await ensureInitialized();
  const role = await loadRole(roleName);
  if (!role) return null;

  const allPerms = getAllPermissions();
  const permList = Array.from(allPerms.entries()).map(([name, def]) => ({
    name,
    title: def.title,
    description: def.description,
  }));

  return {
    role: { name: role.id, label: role.label },
    permissions: role.permissions ?? [],
    allPermissions: permList,
  };
}

// ── System / Config ─────────────────────────────────────────────────

export interface SiteConfig {
  name: string;
  slogan: string;
  mail: string;
  front_page: string;
}

export async function getSiteConfig(): Promise<SiteConfig> {
  await ensureInitialized();
  const config = await loadConfig('system.site');
  if (config) {
    const data = typeof config === 'string' ? JSON.parse(config) : config;
    return {
      name: data.name ?? 'drop',
      slogan: data.slogan ?? '',
      mail: data.mail ?? '',
      front_page: data.front_page ?? '/node',
    };
  }
  return { name: 'drop', slogan: '', mail: '', front_page: '/node' };
}

export async function getStatusReport() {
  await ensureInitialized();

  const allTypes = getAllEntityTypes();
  const nodeTypes = allTypes.filter(t => t.entity_type === 'node');

  let totalNodes = 0;
  for (const t of nodeTypes) {
    const q = new EntityQuery('node');
    q.condition('type', t.bundle);
    const ids = await q.execute();
    totalNodes += ids.length;
  }

  const userRows = await db
    .select('users_field_data')
    .fields(['uid'])
    .execute<{ uid: number }>();

  const mem = process.memoryUsage();

  return {
    dropjs_version: '0.1.0',
    node_version: process.version,
    database_type: 'SQLite',
    database_status: 'ok',
    entity_types_count: allTypes.length,
    total_nodes: totalNodes,
    total_users: userRows.length,
    uptime: process.uptime(),
    platform: process.platform,
    memory: {
      rss: mem.rss,
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed,
      external: mem.external,
    },
  };
}

export async function getCacheStats(): Promise<Record<string, { size: number; tags: number }>> {
  await ensureInitialized();
  const { cacheStats } = await import('../../core/cache');
  return cacheStats();
}

// ── Watchdog / Logs ─────────────────────────────────────────────────

export interface LogEntry {
  wid: number;
  uid: number;
  type: string;
  message: string;
  variables: string | null;
  severity: number;
  severity_label: string;
  link: string;
  location: string;
  referer: string;
  hostname: string;
  timestamp: number;
}

export async function getLogs(params: {
  page?: number;
  limit?: number;
  type?: string;
  severity?: string;
} = {}): Promise<{
  data: LogEntry[];
  meta: { total: number; page: number; limit: number; pages: number; types: string[] };
}> {
  await ensureInitialized();

  const page = params.page ?? 1;
  const limit = params.limit ?? 50;
  const offset = (page - 1) * limit;

  const conn = (await import('../../db/index')).getConnection();

  let query = conn('watchdog').orderBy('wid', 'desc');
  let countQuery = conn('watchdog').count('* as total');

  if (params.type) {
    query = query.where('type', params.type);
    countQuery = countQuery.where('type', params.type);
  }
  if (params.severity !== undefined && params.severity !== '') {
    query = query.where('severity', Number(params.severity));
    countQuery = countQuery.where('severity', Number(params.severity));
  }

  const [countResult, rows, typesResult] = await Promise.all([
    countQuery.first() as unknown as Promise<{ total: number }>,
    query.offset(offset).limit(limit),
    conn('watchdog').distinct('type').orderBy('type'),
  ]);

  const severityLabels = ['Emergency', 'Alert', 'Critical', 'Error', 'Warning', 'Notice', 'Info', 'Debug'];
  const total = Number(countResult?.total ?? 0);

  return {
    data: (rows as any[]).map(r => ({
      ...r,
      severity_label: severityLabels[r.severity] ?? 'Unknown',
    })),
    meta: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      types: (typesResult as any[]).map(r => r.type),
    },
  };
}

// ── Top Pages ───────────────────────────────────────────────────────

export async function getTopPages(period: string = '7d') {
  await ensureInitialized();
  const conn = (await import('../../db/index')).getConnection();

  const periodMs = period === '24h' ? 86400 : period === '30d' ? 2592000 : 604800;
  const since = Math.floor(Date.now() / 1000) - periodMs;

  const rows = await conn('access_log')
    .select('path')
    .count('* as hits')
    .where('timestamp', '>=', since)
    .groupBy('path')
    .orderBy('hits', 'desc')
    .limit(50);

  return {
    data: (rows as any[]).map(r => ({ path: r.path, hits: Number(r.hits) })),
    meta: { period },
  };
}


export interface ModuleWithStatus {
  name: string;
  label: string;
  description: string;
  version: string;
  package: string;
  required: boolean;
  enabled: boolean;
}

export async function getModules(): Promise<ModuleWithStatus[]> {
  await ensureInitialized();
  const allModules = getAllModules();
  const enabledNames = new Set(getEnabledModules().map((m) => m.name));
  const config = await loadConfig('core.extension');
  const persisted: Record<string, boolean> = config?.modules as Record<string, boolean> ?? {};

  return allModules.map((m) => {
    if (m.required) return { ...m, enabled: true };
    const enabled = persisted[m.name] !== undefined
      ? persisted[m.name]
      : enabledNames.has(m.name);
    return { ...m, enabled };
  });
}

// ── Text Formats ────────────────────────────────────────────────────

export async function getTextFormats() {
  await ensureInitialized();
  const config = await loadAllConfig('filter.format.');
  return Object.entries(config).map(([key, val]) => {
    const data = typeof val === 'string' ? JSON.parse(val) : val;
    return { id: key.replace('filter.format.', ''), ...data };
  });
}

// ── Image Styles ────────────────────────────────────────────────────

export async function getImageStyles() {
  await ensureInitialized();
  const config = await loadAllConfig('image.style.');
  return Object.entries(config).map(([key, val]) => {
    const data = typeof val === 'string' ? JSON.parse(val) : val;
    return { id: key.replace('image.style.', ''), ...data };
  });
}

// ── URL Aliases ─────────────────────────────────────────────────────

export async function getAliases(): Promise<{ aliases: UrlAlias[]; total: number }> {
  await ensureInitialized();
  const result = await listAliases();
  const aliases = Array.isArray(result) ? result : (result as any).aliases ?? [];
  return { aliases, total: aliases.length };
}

// ── Webhooks ────────────────────────────────────────────────────────

export async function getWebhooks(): Promise<Webhook[]> {
  await ensureInitialized();
  return listWebhooks();
}

// ── Menus ───────────────────────────────────────────────────────────

export async function getMenus() {
  await ensureInitialized();
  const { loadConfig } = await import('../../core/config-storage');
  const config = await loadConfig('system.menus');
  const DEFAULT_MENUS = [
    { id: 'main', label: 'Main navigation', description: 'Site-wide navigation links', items: [{ id: 'home', title: 'Home', url: '/', weight: 0, parent: null, enabled: true, expanded: false }] },
    { id: 'footer', label: 'Footer', description: 'Links displayed in the site footer', items: [] as any[] },
  ];
  const menus = (config && typeof config === 'object' && Array.isArray((config as any).menus))
    ? (config as any).menus
    : DEFAULT_MENUS;
  return menus.map((m: any) => ({
    id: m.id,
    label: m.label,
    description: m.description,
    item_count: m.items?.length ?? 0,
  }));
}

export interface MenuItemData {
  id: string;
  title: string;
  url: string;
  weight: number;
  parent: string | null;
  enabled: boolean;
  expanded: boolean;
  description?: string;
}

export interface MenuTreeItemData extends MenuItemData {
  children: MenuTreeItemData[];
}

export interface MenuDetailData {
  id: string;
  label: string;
  description?: string;
  items: MenuItemData[];
  tree: MenuTreeItemData[];
}

function buildMenuTree(items: MenuItemData[]): MenuTreeItemData[] {
  const map = new Map<string, MenuTreeItemData>();
  const roots: MenuTreeItemData[] = [];
  for (const item of items) {
    map.set(item.id, { ...item, children: [] });
  }
  for (const item of items) {
    const treeItem = map.get(item.id)!;
    if (item.parent && map.has(item.parent)) {
      map.get(item.parent)!.children.push(treeItem);
    } else {
      roots.push(treeItem);
    }
  }
  return roots;
}

export async function getMenuDetail(menuId: string): Promise<MenuDetailData | null> {
  await ensureInitialized();
  const { loadConfig } = await import('../../core/config-storage');
  const config = await loadConfig('system.menus');
  let menus: Array<{ id: string; label: string; description?: string; items: MenuItemData[] }> = [];
  if (config && typeof config === 'object' && Array.isArray((config as any).menus)) {
    menus = (config as any).menus;
  } else {
    menus = [
      {
        id: 'main',
        label: 'Main navigation',
        description: 'Site-wide navigation links',
        items: [
          { id: 'home', title: 'Home', url: '/', weight: 0, parent: null, enabled: true, expanded: false, description: '' },
        ],
      },
      {
        id: 'footer',
        label: 'Footer',
        description: 'Links displayed in the site footer',
        items: [],
      },
    ];
  }
  const menu = menus.find(m => m.id === menuId);
  if (!menu) return null;
  return { ...menu, tree: buildMenuTree(menu.items) };
}

// ── Views ───────────────────────────────────────────────────────────

export async function getViews(): Promise<ViewDefinition[]> {
  await ensureInitialized();
  return listViews();
}

export async function getView(id: string): Promise<ViewDefinition | null> {
  await ensureInitialized();
  return loadView(id);
}

export async function getViewPreview(id: string): Promise<ViewResult | null> {
  await ensureInitialized();
  const view = await loadView(id);
  if (!view) return null;
  return executeView(view);
}

// ── Block Placements ────────────────────────────────────────────────

export async function getBlockPlacements(): Promise<BlockPlacement[]> {
  await ensureInitialized();
  return listBlockPlacements();
}

export async function getBlockPlacement(id: string): Promise<BlockPlacement | null> {
  await ensureInitialized();
  return loadBlockPlacement(id);
}

export async function getBlocks(): Promise<{ id: string; label: string }[]> {
  await ensureInitialized();
  return getAllBlocks().map(b => ({ id: b.id, label: b.label }));
}

export async function getRegions(): Promise<RegionDefinition[]> {
  await ensureInitialized();
  const regions = await loadThemeRegions('gin');
  if (regions) {
    return regions.regions;
  }
  return getDefaultRegions();
}

// ── Contact Forms ───────────────────────────────────────────────────

export async function getContactForms(): Promise<ContactForm[]> {
  await ensureInitialized();
  return listContactForms();
}

export async function getContactMessages(): Promise<ContactMessage[]> {
  await ensureInitialized();
  return listContactMessages();
}

// ── Shortcuts ───────────────────────────────────────────────────────

export async function getShortcutSets(): Promise<ShortcutSet[]> {
  await ensureInitialized();
  return listShortcutSets();
}

export async function getShortcuts(uid: number): Promise<Shortcut[]> {
  await ensureInitialized();
  return listShortcuts(uid);
}

// ── Taxonomy ────────────────────────────────────────────────────────

export async function getVocabularies(): Promise<EntityTypeDefinition[]> {
  await ensureInitialized();
  return getEntityTypesForType('taxonomy_term');
}

export interface TermTreeNode {
  tid: number;
  title: string;
  weight: number;
  parent: number;
  status: number;
  children: TermTreeNode[];
}

export async function getTermTree(vid: string): Promise<TermTreeNode[]> {
  await ensureInitialized();

  const rows = await db
    .select('taxonomy_term_field_data', 'tfd')
    .fields('tfd', ['tid', 'name', 'weight', 'status'])
    .leftJoin('taxonomy_term__parent', 'tp', 'tfd.tid = tp.entity_id')
    .fields('tp', ['parent_target_id'])
    .condition('tfd.type', vid)
    .condition('tfd.langcode', 'en')
    .orderBy('tfd.weight', 'ASC')
    .orderBy('tfd.name', 'ASC')
    .execute<{
      tid: number;
      name: string;
      weight: number;
      status: number;
      parent_target_id: number | null;
    }>();

  const byId = new Map<number, TermTreeNode>();
  for (const row of rows) {
    byId.set(row.tid, {
      tid: row.tid,
      title: row.name,
      weight: row.weight,
      parent: row.parent_target_id ?? 0,
      status: row.status,
      children: [],
    });
  }

  const roots: TermTreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parent === 0 || !byId.has(node.parent)) {
      roots.push(node);
    } else {
      byId.get(node.parent)!.children.push(node);
    }
  }

  function sortChildren(nodes: TermTreeNode[]): void {
    nodes.sort((a, b) => a.weight - b.weight || a.title.localeCompare(b.title));
    for (const node of nodes) {
      sortChildren(node.children);
    }
  }
  sortChildren(roots);

  return roots;
}

export async function getTermContentCounts(vid: string): Promise<Record<number, number>> {
  await ensureInitialized();
  const conn = (await import('../../db/index')).getConnection();

  try {
    const rows = await conn('taxonomy_index')
      .select('tid')
      .count('* as count')
      .groupBy('tid');

    const counts: Record<number, number> = {};
    for (const row of rows as any[]) {
      counts[row.tid] = Number(row.count);
    }
    return counts;
  } catch {
    return {};
  }
}

// ── Paragraphs ──────────────────────────────────────────────────────

export async function getParagraphTypes(): Promise<ParagraphType[]> {
  await ensureInitialized();
  return getAllParagraphTypes();
}

// ── Field Groups ────────────────────────────────────────────────────

export async function getFieldGroups(entityType: string, bundle: string, viewMode: string): Promise<FieldGroup[]> {
  await ensureInitialized();
  return listFieldGroups(entityType, bundle, viewMode);
}

export interface FieldLayoutItem {
  field_name: string;
  label: string;
  type: string;
  group: string | null;
  weight: number;
}

export async function getFieldLayout(entityType: string, bundle: string, viewMode: string): Promise<FieldLayoutItem[]> {
  await ensureInitialized();
  try {
    const rawLayout = await getGroupedFieldLayout(entityType, bundle, viewMode);
    // Transform grouped layout into flat field layout items
    const items: FieldLayoutItem[] = [];
    let weight = 0;
    for (const entry of rawLayout) {
      if ('group' in entry) {
        for (const fieldName of entry.fields) {
          items.push({
            field_name: fieldName,
            label: fieldName,
            type: '',
            group: entry.group.name,
            weight: weight++,
          });
        }
      } else if ('field' in entry) {
        items.push({
          field_name: entry.field,
          label: entry.field,
          type: '',
          group: null,
          weight: weight++,
        });
      }
    }
    return items;
  } catch {
    return [];
  }
}

// ── Languages ───────────────────────────────────────────────────────

export async function getLanguagesList() {
  await ensureInitialized();
  return getLanguages();
}

// ── Pathauto ────────────────────────────────────────────────────────

export async function getPatterns(): Promise<PathautoPattern[]> {
  await ensureInitialized();
  return getPathautoPatterns();
}

// ── Media / Files ───────────────────────────────────────────────────

export interface FileData {
  fid: number;
  uuid: string;
  filename: string;
  uri: string;
  filemime: string;
  filesize: number;
  status: number;
  created: number;
  changed: number;
  url: string;
  thumbnail_url: string | null;
}

export async function getMediaList(params?: {
  mimetype?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: FileData[]; meta: { total: number; page: number; limit: number; pages: number } }> {
  await ensureInitialized();
  const conn = (await import('../../db/index')).getConnection();

  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const offset = (page - 1) * limit;

  let query = conn('file_managed').orderBy('created', 'desc');
  let countQuery = conn('file_managed').count('* as total');

  if (params?.mimetype) {
    query = query.where('filemime', 'like', `${params.mimetype}%`);
    countQuery = countQuery.where('filemime', 'like', `${params.mimetype}%`);
  }
  if (params?.search) {
    query = query.where('filename', 'like', `%${params.search}%`);
    countQuery = countQuery.where('filename', 'like', `%${params.search}%`);
  }

  const [countResult, rows] = await Promise.all([
    countQuery.first() as unknown as Promise<{ total: number }>,
    query.offset(offset).limit(limit),
  ]);

  const total = Number(countResult?.total ?? 0);

  return {
    data: (rows as any[]).map(r => ({
      ...r,
      url: `/files/${r.uri?.replace?.('public://', '') ?? r.filename}`,
      thumbnail_url: r.filemime?.startsWith('image/') ? `/files/styles/thumbnail/${r.uri?.replace?.('public://', '') ?? r.filename}` : null,
    })),
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  };
}

// ── Term Ancestors ──────────────────────────────────────────────────

export interface TermAncestor {
  tid: number;
  title: string;
  parent: number;
}

export async function getTermAncestors(vid: string, tid: number): Promise<TermAncestor[]> {
  await ensureInitialized();

  const ancestors: TermAncestor[] = [];
  let currentTid = tid;
  const visited = new Set<number>();

  while (currentTid > 0 && !visited.has(currentTid)) {
    visited.add(currentTid);

    const rows = await db
      .select('taxonomy_term_field_data', 'tfd')
      .fields('tfd', ['tid', 'name'])
      .leftJoin('taxonomy_term__parent', 'tp', 'tfd.tid = tp.entity_id')
      .fields('tp', ['parent_target_id'])
      .condition('tfd.tid', currentTid)
      .condition('tfd.langcode', 'en')
      .execute<{ tid: number; name: string; parent_target_id: number | null }>();

    if (rows.length === 0) break;

    const row = rows[0];
    ancestors.unshift({
      tid: row.tid,
      title: row.name,
      parent: row.parent_target_id ?? 0,
    });
    currentTid = row.parent_target_id ?? 0;
  }

  return ancestors;
}

// ── Themes ──────────────────────────────────────────────────────────

export interface ThemeInfo {
  name: string;
  machine_name: string;
  description: string;
  version: string;
  engine: string;
  admin: boolean;
  regions: Record<string, string>;
  screenshot: string | null;
  is_default: boolean;
  is_admin: boolean;
}

export interface ThemeConfig {
  default: string;
  admin: string;
}

export async function getThemes(): Promise<{ themes: ThemeInfo[]; config: ThemeConfig }> {
  await ensureInitialized();
  const fs = await import('fs');
  const path = await import('path');
  const yaml = await import('js-yaml');

  // Load current theme config
  const themeConfig = await loadConfig('system.theme');
  const config: ThemeConfig = {
    default: (themeConfig as any)?.default ?? 'claro',
    admin: (themeConfig as any)?.admin ?? 'claro',
  };

  // Scan themes/ directory (cwd and package root)
  const themesDir = path.join(process.cwd(), 'themes');
  const packageRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..', '..');
  const packageThemesDir = path.join(packageRoot, 'themes');

  const themeDirs = new Set<string>();
  for (const dir of [themesDir, packageThemesDir]) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const infoPath = path.join(dir, entry.name, 'theme.info.yml');
          if (fs.existsSync(infoPath)) {
            themeDirs.add(infoPath);
          }
        }
      }
    } catch {
      // Directory doesn't exist, skip
    }
  }

  const themes: ThemeInfo[] = [];
  for (const infoPath of themeDirs) {
    try {
      const raw = fs.readFileSync(infoPath, 'utf-8');
      const info = yaml.load(raw) as any;
      const machineName = path.basename(path.dirname(infoPath));
      const screenshotPath = path.join(path.dirname(infoPath), 'screenshot.png');

      themes.push({
        name: info.name ?? machineName,
        machine_name: machineName,
        description: info.description ?? '',
        version: info.version ?? '0.0.0',
        engine: info.engine ?? 'react',
        admin: info.admin === true,
        regions: info.regions ?? {},
        screenshot: fs.existsSync(screenshotPath) ? `/themes/${machineName}/screenshot.png` : null,
        is_default: machineName === config.default,
        is_admin: machineName === config.admin,
      });
    } catch {
      // Skip malformed theme info
    }
  }

  // Sort: default theme first, then alphabetical
  themes.sort((a, b) => {
    if (a.is_default) return -1;
    if (b.is_default) return 1;
    return a.name.localeCompare(b.name);
  });

  return { themes, config };
}

// ── Public Page Helpers ─────────────────────────────────────────────

export interface PublishedNode {
  nid: number;
  type: string;
  title: string;
  status: number;
  uid: number;
  created: number;
  changed: number;
  promote: number;
  sticky: number;
  field_body?: { value: string; format?: string; summary?: string };
  field_image?: { url?: string; alt?: string; medium_url?: string; thumbnail_url?: string } | null;
  field_tags?: Array<{ target_id: number; name?: string }>;
}

export async function getPublishedNodes(params: {
  bundles: string[];
  promote?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ data: PublishedNode[]; total: number }> {
  await ensureInitialized();

  const allData: EntityData[] = [];
  let total = 0;

  for (const bundle of params.bundles) {
    try {
      const query = new EntityQuery('node');
      query.condition('type', bundle);
      query.condition('status', 1);
      if (params.promote) query.condition('promote', 1);
      query.sort('created', 'DESC');

      const allIds = await query.execute();
      total += allIds.length;

      const offset = params.offset ?? 0;
      const limit = params.limit ?? 1000;
      const pageIds = allIds.slice(offset, offset + limit);

      for (const id of pageIds) {
        const entity = await Entity.load('node', id);
        if (entity) allData.push(entity.toJSON());
      }
    } catch {
      // Bundle may not exist on this database — skip
    }
  }

  return { data: allData as unknown as PublishedNode[], total };
}

export interface TaxonomyTermSummary {
  tid: number;
  name: string;
}

export async function getTaxonomyTerms(vocabulary: string): Promise<TaxonomyTermSummary[]> {
  await ensureInitialized();

  try {
    const rows = await db
      .select('taxonomy_term_field_data', 'tfd')
      .fields('tfd', ['tid', 'name'])
      .condition('tfd.type', vocabulary)
      .condition('tfd.langcode', 'en')
      .execute<{ tid: number; name: string }>();

    return rows;
  } catch {
    return [];
  }
}

export async function getUserProfile(uid: number): Promise<{ uid: number; name: string; created: string; roles: string[] } | null> {
  await ensureInitialized();
  const user = await loadUser(uid);
  if (!user || user.status === false) return null;
  return {
    uid: user.uid!,
    name: user.name,
    created: user.created ?? new Date().toISOString(),
    roles: user.roles ?? [],
  };
}

export async function getNodesByTag(tid: number, limit: number = 200): Promise<EntityData[]> {
  await ensureInitialized();
  const conn = (await import('../../db/index')).getConnection();

  const rows = await conn('taxonomy_index')
    .select('nid')
    .where('tid', tid)
    .orderBy('nid', 'desc')
    .limit(limit);

  const results: EntityData[] = [];
  for (const row of rows as { nid: number }[]) {
    const entity = await Entity.load('node', row.nid);
    if (entity) {
      const data = entity.toJSON();
      if (data.status === 1) results.push(data);
    }
  }

  return results;
}

export async function getMainMenu(): Promise<{ tree: MenuTreeItemData[]; items: MenuItemData[] } | null> {
  const detail = await getMenuDetail('main');
  if (!detail) return null;
  return { tree: detail.tree, items: detail.items };
}

// ── Comments ────────────────────────────────────────────────────────

export interface CommentSummary {
  cid: number;
  entity_type: string;
  entity_id: number;
  uid: number;
  subject: string | null;
  comment_body: string;
  created: number;
  status: number;
  pid: number | null;
  thread: string;
  author_name?: string;
}

export async function getComments(entityType: string, entityId: number): Promise<CommentSummary[]> {
  await ensureInitialized();
  const { loadComments } = await import('../../core/comments');
  const comments = await loadComments(entityType, entityId, { status: 1 });
  return comments.map((c) => ({
    cid: c.cid,
    entity_type: c.entity_type,
    entity_id: c.entity_id,
    uid: c.uid,
    subject: c.subject,
    comment_body: (c as any).comment_body ?? '',
    created: c.created,
    status: c.status,
    pid: c.parent_cid > 0 ? c.parent_cid : null,
    thread: c.thread,
    author_name: c.name ?? undefined,
  }));
}

// ── Search ──────────────────────────────────────────────────────────

export interface SearchResultItem {
  entity_type: string;
  bundle: string;
  id: number;
  title: string;
  status: boolean;
  changed: number;
}

export async function searchContent(query: string, limit: number = 50): Promise<{ data: SearchResultItem[]; meta: { query: string; total: number; engine: string } }> {
  await ensureInitialized();
  const { searchIndex, getActiveSearchBackend } = await import('../../core/search');
  const results = await searchIndex(query, { limit });
  const data: SearchResultItem[] = results.map((r) => ({
    entity_type: r.entity_type,
    bundle: r.bundle,
    id: r.entity_id,
    title: r.title,
    status: true,
    changed: 0,
  }));
  return {
    data,
    meta: { query, total: data.length, engine: getActiveSearchBackend() },
  };
}

// ── Audit Log ───────────────────────────────────────────────────────

export async function getRecentAuditEntries(limit: number = 50): Promise<AuditLogEntry[]> {
  await ensureInitialized();
  return getRecentAuditLog(limit);
}

export async function getFilteredAuditEntries(
  filters: AuditLogFilterOptions
): Promise<AuditLogEntry[]> {
  await ensureInitialized();
  return queryAuditLog(filters);
}

export async function getEntityAuditEntries(
  entityType: string,
  entityId: number,
  options?: { limit?: number; offset?: number },
): Promise<AuditLogEntry[]> {
  await ensureInitialized();
  return getAuditLog(entityType, entityId, options);
}

// ── Node Revisions ──────────────────────────────────────────────────

export interface RevisionSummary {
  vid: number;
  revision_uid: number;
  revision_timestamp: number;
  revision_log: string | null;
  author_name: string | null;
}

export async function getNodeRevisions(nid: number): Promise<RevisionSummary[]> {
  await ensureInitialized();
  const revisions = await Entity.listRevisions('node', nid);

  const conn = (await import('../../db/index')).getConnection();

  const enriched: RevisionSummary[] = [];
  for (const rev of revisions) {
    // Get revision_log from node_revision
    let revisionLog: string | null = null;
    try {
      const logRows = await conn('node_revision')
        .select('revision_log')
        .where('vid', rev.vid)
        .first();
      revisionLog = logRows?.revision_log ?? null;
    } catch {
      // Column may not exist
    }

    // Get author name
    let authorName: string | null = null;
    if (rev.revision_uid) {
      try {
        const userRow = await conn('users_field_data')
          .select('name')
          .where('uid', rev.revision_uid)
          .first();
        authorName = userRow?.name ?? null;
      } catch {
        // Table may not exist
      }
    }

    enriched.push({
      vid: rev.vid,
      revision_uid: rev.revision_uid,
      revision_timestamp: rev.revision_timestamp,
      revision_log: revisionLog,
      author_name: authorName,
    });
  }

  return enriched;
}

export async function getNodeRevision(nid: number, vid: number): Promise<EntityData | null> {
  await ensureInitialized();
  const entity = await Entity.loadRevision('node', nid, vid);
  return entity ? entity.toJSON() : null;
}

// ── Redirects ────────────────────────────────────────────────────────

export interface RedirectEntry {
  id: number;
  uuid: string;
  source_path: string;
  redirect_path: string;
  status_code: number;
  langcode: string;
  enabled: number;
  count: number;
  created: number | null;
  changed: number | null;
}

export async function getRedirects(options?: {
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<{ redirects: RedirectEntry[]; total: number }> {
  await ensureInitialized();
  const { listRedirects } = await import('../../core/redirect.js');
  return listRedirects(options) as Promise<{ redirects: RedirectEntry[]; total: number }>;
}

// Re-export types for convenience
export type { EntityData, EntityTypeDefinition, ViewDefinition, ViewResult, BlockPlacement, BlockDefinition, RegionDefinition, UrlAlias, Webhook, ContactForm, ContactMessage, ShortcutSet, Shortcut, ParagraphType, FieldGroup, PathautoPattern, RoleConfig, AuditLogEntry };
