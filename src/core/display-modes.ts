import { saveConfig, loadConfig, loadAllConfig, deleteConfig } from './config-storage.js';
import { createLogger } from './logger.js';
import { getEntityTypeDefinition } from './entity-type.js';

const logger = createLogger('core:display-modes');

/**
 * Field display configuration within a view mode.
 */
export interface FieldDisplay {
  /** Field machine name */
  field: string;
  /** Display label: 'above', 'inline', 'hidden', or 'visually_hidden' */
  label: 'above' | 'inline' | 'hidden' | 'visually_hidden';
  /** Formatter plugin id (e.g. 'string', 'text_default', 'entity_reference_label') */
  formatter: string;
  /** Formatter-specific settings */
  formatter_settings: Record<string, unknown>;
  /** Sort weight */
  weight: number;
  /** Whether this field is visible in this mode */
  visible: boolean;
}

/**
 * A view mode defines how entity fields are rendered in a specific context.
 * Config key: core.entity_view_display.{entity_type}.{bundle}.{mode}
 */
export interface EntityViewDisplay {
  entity_type: string;
  bundle: string;
  mode: string;
  label: string;
  status: boolean;
  fields: Record<string, FieldDisplay>;
}

/**
 * A view mode definition (e.g. 'full', 'teaser', 'search_result').
 * Config key: core.entity_view_mode.{entity_type}.{mode}
 */
export interface ViewMode {
  id: string;
  entity_type: string;
  label: string;
  description?: string;
}

// Default view modes available for all entity types
const DEFAULT_VIEW_MODES: Omit<ViewMode, 'entity_type'>[] = [
  { id: 'default', label: 'Default' },
  { id: 'full', label: 'Full content' },
  { id: 'teaser', label: 'Teaser', description: 'A short summary used in lists' },
  { id: 'search_result', label: 'Search result', description: 'Used in search result listings' },
];

function viewModeConfigKey(entityType: string, mode: string): string {
  return `core.entity_view_mode.${entityType}.${mode}`;
}

function viewDisplayConfigKey(entityType: string, bundle: string, mode: string): string {
  return `core.entity_view_display.${entityType}.${bundle}.${mode}`;
}

// --- View Mode CRUD ---

export async function saveViewMode(viewMode: ViewMode): Promise<void> {
  await saveConfig(viewModeConfigKey(viewMode.entity_type, viewMode.id), viewMode as unknown as Record<string, unknown>);
  logger.debug(`Saved view mode: ${viewMode.entity_type}.${viewMode.id}`);
}

export async function loadViewMode(entityType: string, mode: string): Promise<ViewMode | null> {
  const data = await loadConfig(viewModeConfigKey(entityType, mode));
  return data as ViewMode | null;
}

export async function listViewModes(entityType: string): Promise<ViewMode[]> {
  const prefix = `core.entity_view_mode.${entityType}.`;
  const configs = await loadAllConfig(prefix);
  const stored = Object.values(configs).map((c) => c as unknown as ViewMode);

  // Merge with defaults (defaults that aren't already stored)
  const storedIds = new Set(stored.map((v) => v.id));
  const defaults = DEFAULT_VIEW_MODES
    .filter((d) => !storedIds.has(d.id))
    .map((d) => ({ ...d, entity_type: entityType }));

  return [...defaults, ...stored].sort((a, b) => a.label.localeCompare(b.label));
}

export async function deleteViewMode(entityType: string, mode: string): Promise<void> {
  await deleteConfig(viewModeConfigKey(entityType, mode));
  logger.debug(`Deleted view mode: ${entityType}.${mode}`);
}

// --- Entity View Display CRUD ---

export async function saveViewDisplay(display: EntityViewDisplay): Promise<void> {
  await saveConfig(
    viewDisplayConfigKey(display.entity_type, display.bundle, display.mode),
    display as unknown as Record<string, unknown>,
  );
  logger.debug(`Saved view display: ${display.entity_type}.${display.bundle}.${display.mode}`);
}

export async function loadViewDisplay(
  entityType: string,
  bundle: string,
  mode: string,
): Promise<EntityViewDisplay | null> {
  const data = await loadConfig(viewDisplayConfigKey(entityType, bundle, mode));
  return data as EntityViewDisplay | null;
}

export async function listViewDisplays(
  entityType: string,
  bundle: string,
): Promise<EntityViewDisplay[]> {
  const prefix = `core.entity_view_display.${entityType}.${bundle}.`;
  const configs = await loadAllConfig(prefix);
  return Object.values(configs).map((c) => c as unknown as EntityViewDisplay);
}

export async function deleteViewDisplay(
  entityType: string,
  bundle: string,
  mode: string,
): Promise<void> {
  await deleteConfig(viewDisplayConfigKey(entityType, bundle, mode));
}

/**
 * Get or generate the view display for a given entity type, bundle, and mode.
 * If no display exists in config, generates a default one from the entity type definition.
 */
export async function getOrCreateViewDisplay(
  entityType: string,
  bundle: string,
  mode: string,
): Promise<EntityViewDisplay> {
  const existing = await loadViewDisplay(entityType, bundle, mode);
  if (existing) return existing;

  // Generate default display from entity type definition
  return generateDefaultDisplay(entityType, bundle, mode);
}

/**
 * Generate a default display for an entity type + bundle + mode.
 * In 'teaser' mode: only shows title + a body summary.
 * In 'full' mode: shows all fields.
 * In 'search_result': shows title only.
 */
function generateDefaultDisplay(
  entityType: string,
  bundle: string,
  mode: string,
): EntityViewDisplay {
  const definition = getEntityTypeDefinition(entityType, bundle);
  const fields: Record<string, FieldDisplay> = {};

  if (definition) {
    let weight = 0;
    for (const [name, field] of Object.entries(definition.fields)) {
      const isBody = name === 'body' || name === 'field_body';

      const visible = mode === 'full' || mode === 'default'
        ? true
        : mode === 'teaser'
          ? (name === 'title' || isBody)
          : name === 'title'; // search_result: title only

      fields[name] = {
        field: name,
        label: mode === 'teaser' && isBody ? 'hidden' : 'above',
        formatter: getDefaultFormatter(field.type),
        formatter_settings: mode === 'teaser' && isBody ? { trim_length: 200 } : {},
        weight: weight++,
        visible,
      };
    }
  }

  return {
    entity_type: entityType,
    bundle,
    mode,
    label: DEFAULT_VIEW_MODES.find((m) => m.id === mode)?.label ?? mode,
    status: true,
    fields,
  };
}

function getDefaultFormatter(fieldType: string): string {
  switch (fieldType) {
    case 'entity_reference': return 'entity_reference_label';
    case 'image': return 'image';
    case 'file': return 'file_link';
    case 'link': return 'link';
    case 'boolean': return 'boolean';
    case 'timestamp': return 'timestamp';
    case 'date': return 'date';
    case 'color': return 'color_swatch';
    case 'list_string': return 'list_default';
    case 'text_long':
    case 'text_with_summary': return 'text_default';
    default: return 'string';
  }
}

/**
 * Apply a view display to an entity's data, returning only the visible fields
 * in the correct order with display metadata.
 */
export async function applyViewDisplay(
  entityType: string,
  bundle: string,
  mode: string,
  entityData: Record<string, unknown>,
): Promise<Array<{ field: string; label: string; value: unknown; display: FieldDisplay }>> {
  const display = await getOrCreateViewDisplay(entityType, bundle, mode);
  const result: Array<{ field: string; label: string; value: unknown; display: FieldDisplay }> = [];

  const sortedFields = Object.values(display.fields)
    .filter((f) => f.visible)
    .sort((a, b) => a.weight - b.weight);

  const definition = getEntityTypeDefinition(entityType, bundle);

  for (const fieldDisplay of sortedFields) {
    const fieldDef = definition?.fields[fieldDisplay.field];
    const label = fieldDisplay.label === 'hidden'
      ? ''
      : (fieldDef?.label ?? fieldDisplay.field);

    result.push({
      field: fieldDisplay.field,
      label,
      value: entityData[fieldDisplay.field] ?? null,
      display: fieldDisplay,
    });
  }

  return result;
}
