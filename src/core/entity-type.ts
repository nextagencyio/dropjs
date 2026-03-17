import type { FieldSettings } from '../field/index.js';
import { registerBundlePermissions } from '../auth/permissions.js';

export interface FieldDefinition {
  type: string;
  label: string;
  required?: boolean;
  cardinality?: number;  // -1 = unlimited, 1 = single (default), N = max N values
  settings?: FieldSettings;
  [key: string]: unknown;
}

export interface DisplaySettings {
  weight?: number;
  label?: string | 'hidden';
  format?: string;
  [key: string]: unknown;
}

export interface EntityTypeDefinition {
  entity_type: string;
  bundle: string;
  label: string;
  description?: string;
  fields: Record<string, FieldDefinition>;
  display?: Record<string, Record<string, DisplaySettings>>;
}

// Base fields that every entity of type "node" gets
export const NODE_BASE_FIELDS: Record<string, { type: string; nullable: boolean }> = {
  nid: { type: 'serial', nullable: false },
  vid: { type: 'int', nullable: true },
  uuid: { type: 'varchar', nullable: false },
  type: { type: 'varchar', nullable: false },
  langcode: { type: 'varchar', nullable: false },
  title: { type: 'varchar', nullable: true },
  status: { type: 'int', nullable: false },
  uid: { type: 'int', nullable: true },
  created: { type: 'int', nullable: true },
  changed: { type: 'int', nullable: true },
  promote: { type: 'int', nullable: false },
  sticky: { type: 'int', nullable: false },
  default_langcode: { type: 'int', nullable: false },
  revision_translation_affected: { type: 'int', nullable: true },
};

// Base fields that every entity of type "media" gets (like NODE_BASE_FIELDS but without promote/sticky)
export const MEDIA_BASE_FIELDS: Record<string, { type: string; nullable: boolean }> = {
  mid: { type: 'serial', nullable: false },
  vid: { type: 'int', nullable: true },
  uuid: { type: 'varchar', nullable: false },
  bundle: { type: 'varchar', nullable: false },
  langcode: { type: 'varchar', nullable: false },
  name: { type: 'varchar', nullable: true },
  status: { type: 'int', nullable: false },
  uid: { type: 'int', nullable: true },
  created: { type: 'int', nullable: true },
  changed: { type: 'int', nullable: true },
  default_langcode: { type: 'int', nullable: false },
  revision_translation_affected: { type: 'int', nullable: true },
};

// Registry for entity type definitions — stored on globalThis so webpack-externalized
// modules and tsx-loaded modules share the same Map even if module cache keys differ.
const g = globalThis as unknown as { __dropjs_entity_type_registry?: Map<string, EntityTypeDefinition> };
if (!g.__dropjs_entity_type_registry) {
  g.__dropjs_entity_type_registry = new Map<string, EntityTypeDefinition>();
}
const entityTypeRegistry = g.__dropjs_entity_type_registry;

function registryKey(entityType: string, bundle: string): string {
  return `${entityType}:${bundle}`;
}

export function registerEntityType(definition: EntityTypeDefinition): void {
  const key = registryKey(definition.entity_type, definition.bundle);
  entityTypeRegistry.set(key, definition);

  // Generate per-bundle CRUD permissions (e.g., "create article content")
  registerBundlePermissions(definition.entity_type, definition.bundle, definition.label);
}

export function getEntityTypeDefinition(
  entityType: string,
  bundle: string
): EntityTypeDefinition | undefined {
  return entityTypeRegistry.get(registryKey(entityType, bundle));
}

export function getAllEntityTypes(): EntityTypeDefinition[] {
  return [...entityTypeRegistry.values()];
}

export function getEntityTypesForType(entityType: string): EntityTypeDefinition[] {
  return [...entityTypeRegistry.values()].filter(
    (def) => def.entity_type === entityType
  );
}

export function unregisterEntityType(entityType: string, bundle: string): void {
  entityTypeRegistry.delete(registryKey(entityType, bundle));
}

export function clearEntityTypeRegistry(): void {
  entityTypeRegistry.clear();
}
