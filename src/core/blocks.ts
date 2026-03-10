/**
 * Block/Region system for page layout management.
 *
 * Inspired by Drupal's Block module. Blocks are reusable content units placed
 * in page regions (e.g. header, sidebar, content, footer). Each theme defines
 * regions, and blocks are assigned to regions with configurable visibility
 * conditions.
 *
 * - Block definitions are registered in-memory (like plugins).
 * - Block placements are persisted in config as `block.block.<placement-id>`.
 * - Theme regions are persisted in config as `block.theme.<theme-name>`.
 */

import { saveConfig, loadConfig, loadAllConfig, deleteConfig } from './config-storage.js';
import { EventBus } from './event-bus.js';
import { createLogger } from './logger.js';

const logger = createLogger('blocks');

// ── Types ──────────────────────────────────────────────────────────────────

export interface BlockDefinition {
  id: string;           // machine name e.g. 'system_branding_block'
  label: string;        // human-readable name
  provider: string;     // module that provides this block
  category?: string;    // grouping category
  render: (context: BlockContext) => Promise<BlockContent>;
}

export interface BlockContext {
  path?: string;
  entityType?: string;
  bundle?: string;
  entityId?: number;
  user?: { uid: number; roles: string[] };
}

export interface BlockContent {
  html: string;
  cacheTags?: string[];
}

export interface BlockPlacement {
  id: string;            // unique placement ID
  blockId: string;       // references BlockDefinition.id
  region: string;        // region machine name
  weight: number;        // sort order within region
  visibility: VisibilityCondition[];
  settings: Record<string, unknown>;
  status: boolean;       // enabled/disabled
  theme: string;         // theme this placement belongs to
}

export interface VisibilityCondition {
  type: 'path' | 'role' | 'entity_bundle' | 'node_type';
  negate?: boolean;
  value: string[];       // paths, role IDs, bundle names, etc.
}

export interface RegionDefinition {
  id: string;
  label: string;
}

export interface ThemeRegions {
  theme: string;
  regions: RegionDefinition[];
}

// ── Block Registry (in-memory) ─────────────────────────────────────────────
// Stored on globalThis for webpack module sharing.
const gBlocks = globalThis as unknown as { __dropjs_block_registry?: Map<string, BlockDefinition> };
if (!gBlocks.__dropjs_block_registry) {
  gBlocks.__dropjs_block_registry = new Map<string, BlockDefinition>();
}
const blockRegistry = gBlocks.__dropjs_block_registry;

/**
 * Register a block plugin definition.
 */
export function registerBlock(definition: BlockDefinition): void {
  if (blockRegistry.has(definition.id)) {
    logger.warn(`Block "${definition.id}" is being re-registered`, { id: definition.id });
  }
  blockRegistry.set(definition.id, definition);
  logger.debug(`Block registered: ${definition.id}`, { id: definition.id, provider: definition.provider });
}

/**
 * Unregister a block plugin by ID.
 */
export function unregisterBlock(id: string): void {
  blockRegistry.delete(id);
}

/**
 * Get a block definition by ID.
 */
export function getBlock(id: string): BlockDefinition | undefined {
  return blockRegistry.get(id);
}

/**
 * Get all registered block definitions.
 */
export function getAllBlocks(): BlockDefinition[] {
  return [...blockRegistry.values()];
}

/**
 * Clear all registered block definitions (for testing).
 */
export function clearBlockRegistry(): void {
  blockRegistry.clear();
}

// ── Block Placement CRUD (config-stored) ───────────────────────────────────

const BLOCK_PLACEMENT_PREFIX = 'block.block.';

/**
 * Save a block placement to config storage.
 */
export async function saveBlockPlacement(placement: BlockPlacement): Promise<void> {
  const configName = `${BLOCK_PLACEMENT_PREFIX}${placement.id}`;
  const data: Record<string, unknown> = {
    id: placement.id,
    blockId: placement.blockId,
    region: placement.region,
    weight: placement.weight,
    visibility: placement.visibility,
    settings: placement.settings,
    status: placement.status,
    theme: placement.theme,
  };
  await saveConfig(configName, data);
  logger.debug(`Block placement saved: ${placement.id}`, { id: placement.id, region: placement.region });
  await EventBus.emit('block:placement:save', placement);
}

/**
 * Load a block placement from config storage.
 */
export async function loadBlockPlacement(id: string): Promise<BlockPlacement | null> {
  const configName = `${BLOCK_PLACEMENT_PREFIX}${id}`;
  const data = await loadConfig(configName);
  if (!data) return null;
  return data as unknown as BlockPlacement;
}

/**
 * List all block placements, optionally filtered by theme.
 */
export async function listBlockPlacements(theme?: string): Promise<BlockPlacement[]> {
  const all = await loadAllConfig(BLOCK_PLACEMENT_PREFIX);
  const placements = Object.values(all) as unknown as BlockPlacement[];

  if (theme) {
    return placements.filter((p) => p.theme === theme);
  }
  return placements;
}

/**
 * Delete a block placement from config storage.
 */
export async function deleteBlockPlacement(id: string): Promise<void> {
  const configName = `${BLOCK_PLACEMENT_PREFIX}${id}`;
  const existing = await loadConfig(configName);
  if (existing) {
    await deleteConfig(configName);
    logger.debug(`Block placement deleted: ${id}`);
    await EventBus.emit('block:placement:delete', { id });
  }
}

// ── Region Management (config-stored) ──────────────────────────────────────

const THEME_REGIONS_PREFIX = 'block.theme.';

/**
 * Save theme region definitions to config storage.
 */
export async function saveThemeRegions(themeRegions: ThemeRegions): Promise<void> {
  const configName = `${THEME_REGIONS_PREFIX}${themeRegions.theme}`;
  const data: Record<string, unknown> = {
    theme: themeRegions.theme,
    regions: themeRegions.regions,
  };
  await saveConfig(configName, data);
  logger.debug(`Theme regions saved for: ${themeRegions.theme}`);
}

/**
 * Load theme region definitions from config storage.
 */
export async function loadThemeRegions(theme: string): Promise<ThemeRegions | null> {
  const configName = `${THEME_REGIONS_PREFIX}${theme}`;
  const data = await loadConfig(configName);
  if (!data) return null;
  return data as unknown as ThemeRegions;
}

/**
 * Get the default regions that every theme should have.
 */
export function getDefaultRegions(): RegionDefinition[] {
  return [
    { id: 'header', label: 'Header' },
    { id: 'navigation', label: 'Navigation' },
    { id: 'breadcrumb', label: 'Breadcrumb' },
    { id: 'highlighted', label: 'Highlighted' },
    { id: 'content', label: 'Content' },
    { id: 'sidebar_first', label: 'Sidebar first' },
    { id: 'sidebar_second', label: 'Sidebar second' },
    { id: 'footer', label: 'Footer' },
  ];
}

// ── Visibility Checking ────────────────────────────────────────────────────

/**
 * Evaluate visibility conditions against a block context.
 *
 * All conditions must pass for the block to be visible (AND logic).
 * An empty conditions array means the block is always visible.
 */
export function checkVisibility(conditions: VisibilityCondition[], context: BlockContext): boolean {
  if (conditions.length === 0) return true;

  for (const condition of conditions) {
    const result = evaluateCondition(condition, context);
    if (!result) return false;
  }

  return true;
}

/**
 * Evaluate a single visibility condition.
 */
function evaluateCondition(condition: VisibilityCondition, context: BlockContext): boolean {
  let match = false;

  switch (condition.type) {
    case 'path': {
      if (!context.path) {
        match = false;
        break;
      }
      match = condition.value.some((pattern) => matchPath(context.path!, pattern));
      break;
    }

    case 'role': {
      if (!context.user?.roles) {
        match = false;
        break;
      }
      match = condition.value.some((role) => context.user!.roles.includes(role));
      break;
    }

    case 'entity_bundle': {
      if (!context.bundle) {
        match = false;
        break;
      }
      match = condition.value.includes(context.bundle);
      break;
    }

    case 'node_type': {
      if (!context.bundle || context.entityType !== 'node') {
        match = false;
        break;
      }
      match = condition.value.includes(context.bundle);
      break;
    }

    default:
      // Unknown condition type — treat as not matching
      match = false;
  }

  return condition.negate ? !match : match;
}

/**
 * Match a path against a pattern. Supports:
 * - Exact match: `/about` matches `/about`
 * - Wildcard: `/node/*` matches `/node/1`, `/node/2`
 * - Front page: `<front>` matches `/`
 */
function matchPath(path: string, pattern: string): boolean {
  if (pattern === '<front>') {
    return path === '/' || path === '';
  }

  if (pattern === path) {
    return true;
  }

  // Convert wildcard pattern to regex
  if (pattern.includes('*')) {
    const regexStr = '^' + pattern.replace(/\*/g, '[^/]*') + '$';
    const regex = new RegExp(regexStr);
    return regex.test(path);
  }

  return false;
}

// ── Block Rendering ────────────────────────────────────────────────────────

/**
 * Render all blocks in a given region.
 *
 * Loads placements for the region, filters by visibility conditions,
 * sorts by weight, and renders each block.
 *
 * @param region Region machine name (e.g. 'header', 'content')
 * @param context Block rendering context (path, user, entity info)
 * @param theme Theme name; defaults to 'default'
 * @returns Array of rendered block content, in weight order
 */
export async function renderRegion(
  region: string,
  context: BlockContext,
  theme: string = 'default'
): Promise<BlockContent[]> {
  const placements = await listBlockPlacements(theme);

  // Filter to the requested region, enabled placements only
  const regionPlacements = placements
    .filter((p) => p.region === region && p.status)
    .sort((a, b) => a.weight - b.weight);

  const results: BlockContent[] = [];

  for (const placement of regionPlacements) {
    // Check visibility conditions
    if (!checkVisibility(placement.visibility, context)) {
      continue;
    }

    // Look up the block definition
    const block = blockRegistry.get(placement.blockId);
    if (!block) {
      logger.warn(`Block definition not found for placement "${placement.id}": blockId="${placement.blockId}"`);
      continue;
    }

    try {
      const content = await block.render(context);
      results.push(content);
    } catch (err) {
      logger.error(`Failed to render block "${placement.blockId}" in region "${region}"`, {
        blockId: placement.blockId,
        placementId: placement.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}

// ── Default Block Plugins ──────────────────────────────────────────────────

/**
 * Register the default system block plugins.
 */
export function registerDefaultBlocks(): void {
  registerBlock({
    id: 'system_powered_by',
    label: 'Powered by DropJS',
    provider: 'system',
    category: 'System',
    render: async (_context: BlockContext): Promise<BlockContent> => {
      return {
        html: '<span>Powered by <a href="https://github.com/jrcalgo/dropjs">DropJS</a></span>',
        cacheTags: ['system:powered_by'],
      };
    },
  });

  registerBlock({
    id: 'system_branding_block',
    label: 'Site branding',
    provider: 'system',
    category: 'System',
    render: async (_context: BlockContext): Promise<BlockContent> => {
      let siteName = 'DropJS';
      let siteSlogan = '';

      try {
        const siteConfig = await loadConfig('system.site');
        if (siteConfig) {
          siteName = (siteConfig.name as string) ?? siteName;
          siteSlogan = (siteConfig.slogan as string) ?? siteSlogan;
        }
      } catch (err) {
        logger.warn('Failed to load system.site config for branding block', {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      let html = `<div class="site-branding">`;
      html += `<div class="site-branding__name"><a href="/">${escapeHtml(siteName)}</a></div>`;
      if (siteSlogan) {
        html += `<div class="site-branding__slogan">${escapeHtml(siteSlogan)}</div>`;
      }
      html += `</div>`;

      return {
        html,
        cacheTags: ['config:system.site'],
      };
    },
  });

  logger.debug('Default block plugins registered');
}

/**
 * Escape HTML special characters to prevent XSS.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
