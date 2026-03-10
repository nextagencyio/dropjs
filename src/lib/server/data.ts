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

// ── Themes / Appearance ─────────────────────────────────────────────

export interface ThemeInfo {
  name: string;
  label: string;
  description: string;
  version: string;
  status: string;
  default: boolean;
  admin: boolean;
  engine: string;
}

export async function getThemes(): Promise<ThemeInfo[]> {
  await ensureInitialized();
  const fs = await import('node:fs');
  const path = await import('node:path');
  const yaml = (await import('js-yaml')).default;

  const config = await loadConfig('system.theme');
  const activeTheme = (config as any)?.default ?? null;

  // Discover themes from themes/ directory (same logic as API handler)
  const themesDir = path.resolve('themes');
  const themes: ThemeInfo[] = [];

  if (fs.existsSync(themesDir)) {
    const entries = fs.readdirSync(themesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const infoPath = path.join(themesDir, entry.name, 'theme.info.yml');
      if (!fs.existsSync(infoPath)) continue;
      const raw = fs.readFileSync(infoPath, 'utf-8');
      const info = yaml.load(raw) as Record<string, unknown>;
      if (!info || typeof info !== 'object' || !info.name) continue;
      const isDefault = activeTheme ? entry.name === activeTheme : false;
      themes.push({
        name: entry.name,
        label: info.name as string,
        description: (info.description as string) ?? '',
        version: (info.version as string) ?? '0.0.0',
        status: isDefault ? 'default' : 'installed',
        default: isDefault,
        admin: info.admin === true,
        engine: (info.engine as string) ?? 'react',
      });
    }
  }

  // If no themes found, return a fallback
  if (themes.length === 0) {
    themes.push({
      name: 'gin', label: 'Gin', description: 'A modern admin theme',
      version: '1.0.0', status: 'default', default: true, admin: true, engine: 'next',
    });
  }

  // If no default is set, mark the first non-admin theme or the first theme
  if (!themes.some(t => t.default) && themes.length > 0) {
    const fallback = themes.find(t => !t.admin) ?? themes[0];
    fallback.default = true;
    fallback.status = 'default';
  }

  return themes;
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
  const conn = (await import('../../db/index')).getConnection();
  const hasTable = await conn.schema.hasTable('menu_link_content_data');
  if (!hasTable) return [];

  try {
    const rows = await conn('menu_link_content_data')
      .select('menu_name')
      .countDistinct('id as item_count')
      .groupBy('menu_name');

    return (rows as any[]).map(r => ({
      id: r.menu_name,
      label: r.menu_name.charAt(0).toUpperCase() + r.menu_name.slice(1).replace(/-/g, ' '),
      item_count: Number(r.item_count),
    }));
  } catch {
    return [];
  }
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

// Re-export types for convenience
export type { EntityData, EntityTypeDefinition, ViewDefinition, ViewResult, BlockPlacement, BlockDefinition, RegionDefinition, UrlAlias, Webhook, ContactForm, ContactMessage, ShortcutSet, Shortcut, ParagraphType, FieldGroup, PathautoPattern, RoleConfig };
