/**
 * Layout Builder system for configurable page layouts.
 *
 * Provides a system of sections, columns, and blocks that can be arranged
 * to build page layouts for entity view modes. Each section has a layout type
 * (one_column, two_column, etc.) that defines available regions, and components
 * (blocks) are placed within those regions.
 *
 * Layouts are stored in config as `layout.entity.{entityType}.{bundle}.{viewMode}`.
 */

import { saveConfig, loadConfig, deleteConfig } from './config-storage.js';
import { createLogger } from './logger.js';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('core:layout-builder');

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * A layout section represents one horizontal band of the page.
 * Each section uses a layout type that defines its available regions/columns.
 */
export interface LayoutSection {
  /** Unique section identifier */
  id: string;
  /** Layout type (e.g. 'one_column', 'two_column') */
  type: string;
  /** Sort weight (lower = higher on page) */
  weight: number;
  /** Layout-type-specific settings (e.g. column widths, background) */
  settings: Record<string, unknown>;
  /** Components placed within this section's regions */
  components: LayoutComponent[];
}

/**
 * A component placed within a layout section's region.
 * Components are typically blocks, but the system is extensible.
 */
export interface LayoutComponent {
  /** Unique component identifier */
  id: string;
  /** Component type / block plugin ID */
  type: string;
  /** Region within the section where this component is placed */
  region: string;
  /** Sort weight within the region */
  weight: number;
  /** Component-specific configuration */
  configuration: Record<string, unknown>;
}

/**
 * A region definition within a layout type.
 */
export interface LayoutRegion {
  /** Region machine name */
  id: string;
  /** Human-readable label */
  label: string;
}

/**
 * A layout type definition describing available regions.
 */
export interface LayoutTypeDefinition {
  /** Machine name of the layout type */
  id: string;
  /** Human-readable label */
  label: string;
  /** Description of the layout */
  description: string;
  /** Regions provided by this layout type */
  regions: LayoutRegion[];
}

// ── Layout Types Registry ──────────────────────────────────────────────────

const layoutTypes: LayoutTypeDefinition[] = [
  {
    id: 'one_column',
    label: 'One column',
    description: 'A single full-width column.',
    regions: [
      { id: 'content', label: 'Content' },
    ],
  },
  {
    id: 'two_column',
    label: 'Two column',
    description: 'Two equal-width columns (50%/50%).',
    regions: [
      { id: 'first', label: 'First' },
      { id: 'second', label: 'Second' },
    ],
  },
  {
    id: 'three_column',
    label: 'Three column',
    description: 'Three equal-width columns (33%/33%/33%).',
    regions: [
      { id: 'first', label: 'First' },
      { id: 'second', label: 'Second' },
      { id: 'third', label: 'Third' },
    ],
  },
  {
    id: 'two_column_33_67',
    label: 'Two column (33%/67%)',
    description: 'Two columns with a narrow left sidebar (33%/67%).',
    regions: [
      { id: 'first', label: 'First' },
      { id: 'second', label: 'Second' },
    ],
  },
  {
    id: 'two_column_67_33',
    label: 'Two column (67%/33%)',
    description: 'Two columns with a narrow right sidebar (67%/33%).',
    regions: [
      { id: 'first', label: 'First' },
      { id: 'second', label: 'Second' },
    ],
  },
];

// ── Config Key Helper ──────────────────────────────────────────────────────

function layoutConfigKey(entityType: string, bundle: string, viewMode: string): string {
  return `layout.entity.${entityType}.${bundle}.${viewMode}`;
}

// ── Layout Types ───────────────────────────────────────────────────────────

/**
 * Get all available layout types and their region definitions.
 */
export function getLayoutTypes(): LayoutTypeDefinition[] {
  return [...layoutTypes];
}

/**
 * Get a single layout type by ID.
 */
export function getLayoutType(id: string): LayoutTypeDefinition | undefined {
  return layoutTypes.find((lt) => lt.id === id);
}

// ── Layout CRUD ────────────────────────────────────────────────────────────

/**
 * Save a layout (array of sections) for an entity type + bundle + view mode.
 * Replaces the entire layout.
 */
export async function saveLayout(
  entityType: string,
  bundle: string,
  viewMode: string,
  sections: LayoutSection[],
): Promise<void> {
  const configName = layoutConfigKey(entityType, bundle, viewMode);
  const data: Record<string, unknown> = {
    entityType,
    bundle,
    viewMode,
    sections,
  };
  await saveConfig(configName, data);
  logger.debug(`Layout saved: ${configName}`, { entityType, bundle, viewMode, sectionCount: sections.length });
}

/**
 * Load a layout for an entity type + bundle + view mode.
 * Returns the array of sections, or null if no layout is configured.
 */
export async function loadLayout(
  entityType: string,
  bundle: string,
  viewMode: string,
): Promise<LayoutSection[] | null> {
  const configName = layoutConfigKey(entityType, bundle, viewMode);
  const data = await loadConfig(configName);
  if (!data) return null;
  return (data.sections as unknown as LayoutSection[]) ?? null;
}

/**
 * Delete a layout for an entity type + bundle + view mode.
 */
export async function deleteLayout(
  entityType: string,
  bundle: string,
  viewMode: string,
): Promise<void> {
  const configName = layoutConfigKey(entityType, bundle, viewMode);
  await deleteConfig(configName);
  logger.debug(`Layout deleted: ${configName}`, { entityType, bundle, viewMode });
}

// ── Section Management ─────────────────────────────────────────────────────

/**
 * Add a section to an existing layout. If no layout exists, creates one.
 * Returns the updated array of sections.
 */
export async function addSection(
  entityType: string,
  bundle: string,
  viewMode: string,
  section: Omit<LayoutSection, 'id' | 'components'> & { id?: string; components?: LayoutComponent[] },
): Promise<LayoutSection[]> {
  const existing = await loadLayout(entityType, bundle, viewMode);
  const sections = existing ?? [];

  const newSection: LayoutSection = {
    id: section.id ?? uuidv4(),
    type: section.type,
    weight: section.weight,
    settings: section.settings ?? {},
    components: section.components ?? [],
  };

  sections.push(newSection);
  sections.sort((a, b) => a.weight - b.weight);

  await saveLayout(entityType, bundle, viewMode, sections);
  logger.debug(`Section added: ${newSection.id}`, { entityType, bundle, viewMode });
  return sections;
}

/**
 * Remove a section from a layout by section ID.
 * Returns the updated array of sections.
 */
export async function removeSection(
  entityType: string,
  bundle: string,
  viewMode: string,
  sectionId: string,
): Promise<LayoutSection[]> {
  const existing = await loadLayout(entityType, bundle, viewMode);
  if (!existing) return [];

  const sections = existing.filter((s) => s.id !== sectionId);
  await saveLayout(entityType, bundle, viewMode, sections);
  logger.debug(`Section removed: ${sectionId}`, { entityType, bundle, viewMode });
  return sections;
}

// ── Component Management ───────────────────────────────────────────────────

/**
 * Add a component to a section within a layout.
 * Returns the updated array of sections.
 */
export async function addComponent(
  entityType: string,
  bundle: string,
  viewMode: string,
  sectionId: string,
  component: Omit<LayoutComponent, 'id'> & { id?: string },
): Promise<LayoutSection[]> {
  const existing = await loadLayout(entityType, bundle, viewMode);
  if (!existing) {
    throw new Error(`Layout not found for ${entityType}.${bundle}.${viewMode}`);
  }

  const section = existing.find((s) => s.id === sectionId);
  if (!section) {
    throw new Error(`Section "${sectionId}" not found in layout`);
  }

  const newComponent: LayoutComponent = {
    id: component.id ?? uuidv4(),
    type: component.type,
    region: component.region,
    weight: component.weight,
    configuration: component.configuration ?? {},
  };

  section.components.push(newComponent);
  section.components.sort((a, b) => a.weight - b.weight);

  await saveLayout(entityType, bundle, viewMode, existing);
  logger.debug(`Component added: ${newComponent.id} to section ${sectionId}`, { entityType, bundle, viewMode });
  return existing;
}

/**
 * Remove a component from a section within a layout.
 * Returns the updated array of sections.
 */
export async function removeComponent(
  entityType: string,
  bundle: string,
  viewMode: string,
  sectionId: string,
  componentId: string,
): Promise<LayoutSection[]> {
  const existing = await loadLayout(entityType, bundle, viewMode);
  if (!existing) {
    throw new Error(`Layout not found for ${entityType}.${bundle}.${viewMode}`);
  }

  const section = existing.find((s) => s.id === sectionId);
  if (!section) {
    throw new Error(`Section "${sectionId}" not found in layout`);
  }

  section.components = section.components.filter((c) => c.id !== componentId);

  await saveLayout(entityType, bundle, viewMode, existing);
  logger.debug(`Component removed: ${componentId} from section ${sectionId}`, { entityType, bundle, viewMode });
  return existing;
}

// ── Layout Rendering ───────────────────────────────────────────────────────

/**
 * Render context for layout rendering.
 */
export interface LayoutRenderContext {
  path?: string;
  entityType?: string;
  bundle?: string;
  entityId?: number;
  user?: { uid: number; roles: string[] };
}

/**
 * Rendered output for a single component.
 */
export interface RenderedComponent {
  id: string;
  type: string;
  region: string;
  weight: number;
  html: string;
}

/**
 * Rendered output for a single section.
 */
export interface RenderedSection {
  id: string;
  type: string;
  weight: number;
  regions: Record<string, RenderedComponent[]>;
}

/**
 * Render all sections and their components for a layout.
 * Returns an ordered array of rendered sections with their components grouped by region.
 */
export async function renderLayout(
  entityType: string,
  bundle: string,
  viewMode: string,
  _context: LayoutRenderContext = {},
): Promise<RenderedSection[]> {
  const sections = await loadLayout(entityType, bundle, viewMode);
  if (!sections) return [];

  const rendered: RenderedSection[] = [];

  for (const section of sections) {
    const layoutType = getLayoutType(section.type);
    if (!layoutType) {
      logger.warn(`Unknown layout type "${section.type}" in section "${section.id}"`);
      continue;
    }

    const regionMap: Record<string, RenderedComponent[]> = {};

    // Initialize all regions from the layout type
    for (const region of layoutType.regions) {
      regionMap[region.id] = [];
    }

    // Render components into their regions
    for (const component of section.components) {
      if (!regionMap[component.region]) {
        regionMap[component.region] = [];
      }

      regionMap[component.region].push({
        id: component.id,
        type: component.type,
        region: component.region,
        weight: component.weight,
        html: `<div class="layout-component layout-component--${component.type}" data-component-id="${component.id}">${component.type}</div>`,
      });
    }

    rendered.push({
      id: section.id,
      type: section.type,
      weight: section.weight,
      regions: regionMap,
    });
  }

  return rendered;
}
