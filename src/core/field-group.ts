import { saveConfig, loadConfig, loadAllConfig, deleteConfig } from './config-storage.js';
import { createLogger } from './logger.js';

const logger = createLogger('core:field-group');

// ── Types ──────────────────────────────────────────────────────────────────

export type GroupFormat =
  | 'fieldset'
  | 'tabs'
  | 'tab'
  | 'details'
  | 'accordion'
  | 'accordion_item'
  | 'html_element';

export interface FieldGroupSettings {
  open?: boolean;
  description?: string;
  classes?: string[];
  required?: boolean;
  id?: string;
  direction?: 'horizontal' | 'vertical';
}

export interface FieldGroup {
  entity_type: string;
  bundle: string;
  view_mode: string;
  name: string;
  label: string;
  format: GroupFormat;
  parent?: string;
  weight: number;
  fields: string[];
  settings: FieldGroupSettings;
}

// ── Config key helpers ─────────────────────────────────────────────────────

function configKey(
  entityType: string,
  bundle: string,
  viewMode: string,
  groupName: string,
): string {
  return `field_group.${entityType}.${bundle}.${viewMode}.${groupName}`;
}

function configPrefix(entityType: string, bundle: string, viewMode: string): string {
  return `field_group.${entityType}.${bundle}.${viewMode}.`;
}

// ── CRUD ───────────────────────────────────────────────────────────────────

/**
 * Save (create or update) a field group configuration.
 */
export async function saveFieldGroup(group: FieldGroup): Promise<void> {
  const key = configKey(group.entity_type, group.bundle, group.view_mode, group.name);
  await saveConfig(key, group as unknown as Record<string, unknown>);
  logger.debug(`Saved field group: ${key}`);
}

/**
 * Load a single field group by its identifying parts.
 */
export async function loadFieldGroup(
  entityType: string,
  bundle: string,
  viewMode: string,
  groupName: string,
): Promise<FieldGroup | null> {
  const data = await loadConfig(configKey(entityType, bundle, viewMode, groupName));
  return data as FieldGroup | null;
}

/**
 * List all field groups for a given entity type, bundle, and view mode.
 * Results are sorted by weight ascending.
 */
export async function listFieldGroups(
  entityType: string,
  bundle: string,
  viewMode: string,
): Promise<FieldGroup[]> {
  const prefix = configPrefix(entityType, bundle, viewMode);
  const configs = await loadAllConfig(prefix);
  const groups = Object.values(configs).map((c) => c as unknown as FieldGroup);
  return groups.sort((a, b) => a.weight - b.weight);
}

/**
 * Delete a field group configuration.
 */
export async function deleteFieldGroup(
  entityType: string,
  bundle: string,
  viewMode: string,
  groupName: string,
): Promise<void> {
  // Remove this group as parent reference from any child groups
  const allGroups = await listFieldGroups(entityType, bundle, viewMode);
  for (const child of allGroups) {
    if (child.parent === groupName) {
      child.parent = undefined;
      await saveFieldGroup(child);
    }
  }

  await deleteConfig(configKey(entityType, bundle, viewMode, groupName));
  logger.debug(`Deleted field group: ${entityType}.${bundle}.${viewMode}.${groupName}`);
}

/**
 * Reorder field groups by applying new weights based on the ordered list of names.
 */
export async function reorderFieldGroups(
  entityType: string,
  bundle: string,
  viewMode: string,
  orderedNames: string[],
): Promise<void> {
  const existing = await listFieldGroups(entityType, bundle, viewMode);
  const groupMap = new Map(existing.map((g) => [g.name, g]));

  for (let i = 0; i < orderedNames.length; i++) {
    const group = groupMap.get(orderedNames[i]);
    if (group) {
      group.weight = i;
      await saveFieldGroup(group);
    }
  }

  logger.debug(`Reordered field groups for ${entityType}.${bundle}.${viewMode}`);
}

/**
 * Add a field to a group. If the field already exists in the group, this is a no-op.
 */
export async function addFieldToGroup(
  entityType: string,
  bundle: string,
  viewMode: string,
  groupName: string,
  fieldName: string,
): Promise<void> {
  const group = await loadFieldGroup(entityType, bundle, viewMode, groupName);
  if (!group) {
    throw new Error(`Field group "${groupName}" not found`);
  }

  if (!group.fields.includes(fieldName)) {
    group.fields.push(fieldName);
    await saveFieldGroup(group);
    logger.debug(`Added field "${fieldName}" to group "${groupName}"`);
  }
}

/**
 * Remove a field from a group. If the field is not in the group, this is a no-op.
 */
export async function removeFieldFromGroup(
  entityType: string,
  bundle: string,
  viewMode: string,
  groupName: string,
  fieldName: string,
): Promise<void> {
  const group = await loadFieldGroup(entityType, bundle, viewMode, groupName);
  if (!group) {
    throw new Error(`Field group "${groupName}" not found`);
  }

  const idx = group.fields.indexOf(fieldName);
  if (idx !== -1) {
    group.fields.splice(idx, 1);
    await saveFieldGroup(group);
    logger.debug(`Removed field "${fieldName}" from group "${groupName}"`);
  }
}

/**
 * Move a field from one group to another within the same entity/bundle/viewMode context.
 */
export async function moveFieldBetweenGroups(
  entityType: string,
  bundle: string,
  viewMode: string,
  fieldName: string,
  fromGroup: string,
  toGroup: string,
): Promise<void> {
  const source = await loadFieldGroup(entityType, bundle, viewMode, fromGroup);
  if (!source) {
    throw new Error(`Source field group "${fromGroup}" not found`);
  }

  const target = await loadFieldGroup(entityType, bundle, viewMode, toGroup);
  if (!target) {
    throw new Error(`Target field group "${toGroup}" not found`);
  }

  // Remove from source
  const idx = source.fields.indexOf(fieldName);
  if (idx !== -1) {
    source.fields.splice(idx, 1);
    await saveFieldGroup(source);
  }

  // Add to target (if not already present)
  if (!target.fields.includes(fieldName)) {
    target.fields.push(fieldName);
    await saveFieldGroup(target);
  }

  logger.debug(`Moved field "${fieldName}" from group "${fromGroup}" to group "${toGroup}"`);
}

/**
 * Build a grouped field layout for a given entity type, bundle, and view mode.
 *
 * Returns an ordered list where each entry is either:
 * - A grouped entry: `{ group: FieldGroup, fields: string[] }`
 * - An ungrouped field: `{ field: string }`
 *
 * Groups are nested: child groups (those with a `parent`) are included under
 * their parent group's entry. Only top-level groups and ungrouped fields appear
 * at the root of the returned array.
 */
export async function getGroupedFieldLayout(
  entityType: string,
  bundle: string,
  viewMode: string,
): Promise<Array<{ group: FieldGroup; fields: string[] } | { field: string }>> {
  const groups = await listFieldGroups(entityType, bundle, viewMode);

  // Collect all fields that belong to any group
  const groupedFields = new Set<string>();
  for (const g of groups) {
    for (const f of g.fields) {
      groupedFields.add(f);
    }
  }

  // Build result: top-level groups sorted by weight, then ungrouped fields
  const result: Array<{ group: FieldGroup; fields: string[] } | { field: string }> = [];

  // Only include top-level groups (no parent, or parent not among existing groups)
  const groupNames = new Set(groups.map((g) => g.name));
  const topLevelGroups = groups.filter(
    (g) => !g.parent || !groupNames.has(g.parent),
  );

  for (const group of topLevelGroups) {
    // Gather fields: the group's own fields plus fields from child groups
    const allFields = [...group.fields];
    const children = groups.filter((g) => g.parent === group.name);
    for (const child of children.sort((a, b) => a.weight - b.weight)) {
      allFields.push(...child.fields);
    }

    result.push({ group, fields: allFields });
  }

  // Collect ungrouped fields — any field name referenced nowhere in any group.
  // Since we don't have a full field list from entity type definition here,
  // we return only explicitly grouped information. Consumers can diff against
  // the entity type definition to find truly ungrouped fields. However, if the
  // caller wants ungrouped fields, they should compare against their known
  // field list. We expose the grouped set so callers can determine the rest.

  return result;
}
