import { apiFetch } from './api-client';

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

export interface ModuleInfo {
  name: string;
  label: string;
  description: string;
  version: string;
  package: string;
  required: boolean;
  enabled: boolean;
}

export interface SiteConfig {
  name: string;
  slogan: string;
  mail: string;
  front_page: string;
}

export interface StatusReportData {
  dropjs_version: string;
  node_version: string;
  database_type: string;
  database_status: string;
  entity_types_count: number;
  total_nodes: number;
  total_users: number;
  uptime: number;
  platform: string;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
}

export async function fetchThemes(): Promise<ThemeInfo[]> {
  const res = await apiFetch<{ data: ThemeInfo[] }>('/appearance/themes');
  return res.data;
}

export async function setActiveTheme(themeName: string): Promise<void> {
  await apiFetch('/appearance/themes/active', {
    method: 'POST',
    body: JSON.stringify({ theme: themeName }),
  });
}

export async function fetchModules(): Promise<ModuleInfo[]> {
  const res = await apiFetch<{ data: ModuleInfo[] }>('/modules');
  return res.data;
}

export async function enableModule(name: string): Promise<void> {
  await apiFetch(`/modules/${name}/enable`, { method: 'POST' });
}

export async function disableModule(name: string): Promise<void> {
  await apiFetch(`/modules/${name}/disable`, { method: 'POST' });
}

export async function fetchSiteConfig(): Promise<SiteConfig> {
  const res = await apiFetch<{ data: SiteConfig }>('/config/site');
  return res.data;
}

export async function updateSiteConfig(data: Partial<SiteConfig>): Promise<SiteConfig> {
  const res = await apiFetch<{ data: SiteConfig }>('/config/site', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function fetchStatusReport(): Promise<StatusReportData> {
  const res = await apiFetch<{ data: StatusReportData }>('/reports/status');
  return res.data;
}

// Text Formats

export interface TextFormat {
  id: string;
  label: string;
  weight: number;
  allowed_tags: string;
}

export async function fetchTextFormats(): Promise<TextFormat[]> {
  const res = await apiFetch<{ data: TextFormat[] }>('/config/text-formats');
  return res.data;
}

export async function createTextFormat(data: { id: string; label: string; allowed_tags?: string }): Promise<TextFormat> {
  const res = await apiFetch<{ data: TextFormat }>('/config/text-formats', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateTextFormat(id: string, data: { label?: string; allowed_tags?: string }): Promise<TextFormat> {
  const res = await apiFetch<{ data: TextFormat }>(`/config/text-formats/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteTextFormat(id: string): Promise<void> {
  await apiFetch(`/config/text-formats/${id}`, { method: 'DELETE' });
}

// Image Styles

export interface ImageStyleEffect {
  type: 'resize' | 'crop' | 'scale';
  width: number;
  height: number;
}

export interface ImageStyle {
  id: string;
  label: string;
  effects: ImageStyleEffect[];
}

export async function fetchImageStyles(): Promise<ImageStyle[]> {
  const res = await apiFetch<{ data: ImageStyle[] }>('/config/image-styles');
  return res.data;
}

export async function createImageStyle(data: { id: string; label: string; effects?: ImageStyleEffect[] }): Promise<ImageStyle> {
  const res = await apiFetch<{ data: ImageStyle }>('/config/image-styles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateImageStyle(id: string, data: { label?: string; effects?: ImageStyleEffect[] }): Promise<ImageStyle> {
  const res = await apiFetch<{ data: ImageStyle }>(`/config/image-styles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteImageStyle(id: string): Promise<void> {
  await apiFetch(`/config/image-styles/${id}`, { method: 'DELETE' });
}

// URL Aliases

export interface UrlAlias {
  id: number;
  path: string;
  alias: string;
  langcode: string;
}

export async function fetchAliases(): Promise<{ aliases: UrlAlias[]; total: number }> {
  const res = await apiFetch<{ data: UrlAlias[]; meta: { total: number } }>('/aliases');
  return { aliases: res.data, total: res.meta.total };
}

export async function createAlias(data: { path: string; alias: string; langcode?: string }): Promise<UrlAlias> {
  const res = await apiFetch<{ data: UrlAlias }>('/aliases', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteAlias(id: number): Promise<void> {
  await apiFetch(`/aliases/${id}`, { method: 'DELETE' });
}

// Webhooks

export interface WebhookData {
  id: number;
  url: string;
  events: string[];
  active: boolean;
  created?: number;
  changed?: number;
}

export async function fetchWebhooks(): Promise<WebhookData[]> {
  const res = await apiFetch<{ data: WebhookData[] }>('/webhooks');
  return res.data;
}

export async function createWebhook(data: {
  url: string;
  events: string[];
  secret?: string;
  active?: boolean;
}): Promise<WebhookData> {
  const res = await apiFetch<{ data: WebhookData }>('/webhooks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateWebhook(id: number, data: Partial<{
  url: string;
  events: string[];
  secret: string;
  active: boolean;
}>): Promise<WebhookData> {
  const res = await apiFetch<{ data: WebhookData }>(`/webhooks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteWebhook(id: number): Promise<void> {
  await apiFetch(`/webhooks/${id}`, { method: 'DELETE' });
}

// Menus

export interface MenuItem {
  id: string;
  title: string;
  url: string;
  weight: number;
  parent: string | null;
  enabled: boolean;
  expanded: boolean;
  description?: string;
}

export interface MenuSummary {
  id: string;
  label: string;
  description?: string;
  item_count: number;
}

export interface MenuDetail {
  id: string;
  label: string;
  description?: string;
  items: MenuItem[];
  tree: MenuTreeItem[];
}

export interface MenuTreeItem extends MenuItem {
  children: MenuTreeItem[];
}

export async function fetchMenus(): Promise<MenuSummary[]> {
  const res = await apiFetch<{ data: MenuSummary[] }>('/menus');
  return res.data;
}

export async function fetchMenu(menuId: string): Promise<MenuDetail> {
  const res = await apiFetch<{ data: MenuDetail }>(`/menus/${menuId}`);
  return res.data;
}

export async function createMenu(data: { id: string; label: string; description?: string }): Promise<void> {
  await apiFetch('/menus', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteMenu(menuId: string): Promise<void> {
  await apiFetch(`/menus/${menuId}`, { method: 'DELETE' });
}

export async function addMenuItem(menuId: string, data: {
  title: string;
  url: string;
  weight?: number;
  parent?: string | null;
  enabled?: boolean;
  expanded?: boolean;
  description?: string;
}): Promise<MenuItem> {
  const res = await apiFetch<{ data: MenuItem }>(`/menus/${menuId}/items`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateMenuItem(menuId: string, itemId: string, data: Partial<MenuItem>): Promise<MenuItem> {
  const res = await apiFetch<{ data: MenuItem }>(`/menus/${menuId}/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteMenuItem(menuId: string, itemId: string): Promise<void> {
  await apiFetch(`/menus/${menuId}/items/${itemId}`, { method: 'DELETE' });
}

// Watchdog / Logs

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

export interface LogsResponse {
  data: LogEntry[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    types: string[];
  };
}

export async function fetchLogs(params: {
  page?: number;
  limit?: number;
  type?: string;
  severity?: string;
} = {}): Promise<LogsResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.type) query.set('type', params.type);
  if (params.severity !== undefined && params.severity !== '') query.set('severity', params.severity);
  const qs = query.toString();
  return apiFetch<LogsResponse>(`/reports/logs${qs ? `?${qs}` : ''}`);
}

export async function clearLogs(): Promise<void> {
  await apiFetch('/reports/logs', { method: 'DELETE' });
}

// Top Pages

export interface TopPageEntry {
  path: string;
  hits: number;
}

export interface TopPagesResponse {
  data: TopPageEntry[];
  meta: { period: string };
}

export async function fetchTopPages(period: string = '7d'): Promise<TopPagesResponse> {
  return apiFetch<TopPagesResponse>(`/reports/top-pages?period=${encodeURIComponent(period)}`);
}

// Views

export interface ViewFilter {
  field: string;
  operator: string;
  value: unknown;
  exposed?: boolean;
  expose_identifier?: string;
  expose_label?: string;
}

export interface ViewSort {
  field: string;
  direction: 'ASC' | 'DESC';
  exposed?: boolean;
}

export interface ViewField {
  field: string;
  label?: string;
  formatter?: string;
}

export interface ViewData {
  id: string;
  label: string;
  description?: string;
  entity_type: string;
  bundle?: string | null;
  display_fields: ViewField[];
  filters: ViewFilter[];
  sorts: ViewSort[];
  pager: number;
  status: boolean;
}

export interface ViewExecuteResult {
  data: Record<string, unknown>[];
  meta: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

export async function fetchViews(): Promise<ViewData[]> {
  const res = await apiFetch<{ data: ViewData[] }>('/views');
  return res.data;
}

export async function fetchView(id: string): Promise<ViewData> {
  const res = await apiFetch<{ data: ViewData }>(`/views/${id}`);
  return res.data;
}

export async function createView(data: Partial<ViewData> & { id: string; label: string; entity_type: string }): Promise<ViewData> {
  const res = await apiFetch<{ data: ViewData }>('/views', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateView(id: string, data: Partial<ViewData>): Promise<ViewData> {
  const res = await apiFetch<{ data: ViewData }>(`/views/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteView(id: string): Promise<void> {
  await apiFetch(`/views/${id}`, { method: 'DELETE' });
}

export async function executeView(id: string, params: Record<string, string> = {}): Promise<ViewExecuteResult> {
  const query = new URLSearchParams(params);
  const qs = query.toString();
  return apiFetch<ViewExecuteResult>(`/views/${id}/execute${qs ? `?${qs}` : ''}`);
}

// Block Placements

export interface VisibilityCondition {
  paths?: string[];
  paths_negate?: boolean;
  roles?: string[];
  roles_negate?: boolean;
}

export interface BlockPlacement {
  id: string;
  block_id: string;
  region: string;
  weight: number;
  status: boolean;
  theme: string;
  settings: Record<string, unknown>;
  visibility: VisibilityCondition;
  label?: string;
}

export interface BlockDefinition {
  id: string;
  label: string;
}

export interface RegionDefinition {
  id: string;
  label: string;
}

export async function fetchBlockPlacements(): Promise<BlockPlacement[]> {
  const res = await apiFetch<{ data: BlockPlacement[] }>('/block-placements');
  return res.data;
}

export async function fetchBlockPlacement(id: string): Promise<BlockPlacement> {
  const res = await apiFetch<{ data: BlockPlacement }>(`/block-placements/${id}`);
  return res.data;
}

export async function createBlockPlacement(data: {
  id: string;
  block_id: string;
  region: string;
  weight?: number;
  status?: boolean;
  theme?: string;
  settings?: Record<string, unknown>;
  visibility?: VisibilityCondition;
}): Promise<BlockPlacement> {
  const res = await apiFetch<{ data: BlockPlacement }>('/block-placements', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateBlockPlacement(id: string, data: Partial<BlockPlacement>): Promise<BlockPlacement> {
  const res = await apiFetch<{ data: BlockPlacement }>(`/block-placements/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteBlockPlacement(id: string): Promise<void> {
  await apiFetch(`/block-placements/${id}`, { method: 'DELETE' });
}

export async function fetchBlocks(): Promise<BlockDefinition[]> {
  const res = await apiFetch<{ data: BlockDefinition[] }>('/blocks');
  return res.data;
}

export async function fetchRegions(): Promise<RegionDefinition[]> {
  const res = await apiFetch<{ data: { regions: RegionDefinition[] } }>('/regions');
  return res.data.regions;
}

