/**
 * REST Resource plugin system — allows modules to define custom API endpoints.
 *
 * Inspired by Drupal's REST module. Each REST resource defines a path, HTTP
 * methods, handler function, and required permissions. Resources are stored
 * in config as `rest.resource.<id>`.
 */

import { saveConfig, loadConfig, loadAllConfig, deleteConfig } from './config-storage.js';

// ── Types ──────────────────────────────────────────────────────────────────

export type RestMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface RestResource {
  /** Unique machine name for this resource plugin */
  id: string;
  /** Human-readable label */
  label: string;
  /** Description of what this resource provides */
  description: string;
  /** Route pattern, e.g. '/api/custom/things' or '/api/custom/things/:id' */
  path: string;
  /** HTTP methods this resource responds to */
  methods: RestMethod[];
  /** Handler function — `(req, res) => Promise<void>` when registered programmatically */
  handler: ((req: any, res: any) => Promise<void>) | string;
  /** Permissions required to access this resource */
  permissions: string[];
  /** Whether this resource is currently enabled */
  enabled: boolean;
}

/**
 * Serialisable representation of a REST resource (stored in config).
 * The handler field is omitted because functions cannot be serialised.
 */
export interface RestResourceConfig {
  id: string;
  label: string;
  description: string;
  path: string;
  methods: RestMethod[];
  permissions: string[];
  enabled: boolean;
  /** If the handler was a string (module reference), it is persisted here */
  handler_module?: string;
}

// ── In-memory registry ─────────────────────────────────────────────────────
// Stored on globalThis for webpack module sharing.
const gRest = globalThis as unknown as { __dropjs_rest_resource_registry?: Map<string, RestResource> };
if (!gRest.__dropjs_rest_resource_registry) gRest.__dropjs_rest_resource_registry = new Map<string, RestResource>();
const registry = gRest.__dropjs_rest_resource_registry;

const REST_CONFIG_PREFIX = 'rest.resource.';

// ── Registration ───────────────────────────────────────────────────────────

/**
 * Register a REST resource plugin. Persists the serialisable portion to the
 * config table and stores the full definition (with handler) in memory.
 */
export async function registerRestResource(resource: RestResource): Promise<void> {
  registry.set(resource.id, resource);

  const configData: Record<string, unknown> = {
    id: resource.id,
    label: resource.label,
    description: resource.description,
    path: resource.path,
    methods: resource.methods,
    permissions: resource.permissions,
    enabled: resource.enabled,
  };

  if (typeof resource.handler === 'string') {
    configData.handler_module = resource.handler;
  }

  await saveConfig(`${REST_CONFIG_PREFIX}${resource.id}`, configData);
}

// ── Lookup ─────────────────────────────────────────────────────────────────

/**
 * Get a single registered REST resource by id. Checks the in-memory registry
 * first, then falls back to config storage.
 */
export async function getRestResource(id: string): Promise<RestResource | null> {
  const mem = registry.get(id);
  if (mem) return mem;

  const data = await loadConfig(`${REST_CONFIG_PREFIX}${id}`);
  if (!data) return null;

  return configToResource(data);
}

/**
 * Get all registered REST resources. Merges in-memory registry with any
 * config-only entries (resources registered by other processes/restarts).
 */
export async function getAllRestResources(): Promise<RestResource[]> {
  const allConfig = await loadAllConfig(REST_CONFIG_PREFIX);
  const merged = new Map<string, RestResource>();

  // Config entries first (may lack live handlers)
  for (const [, data] of Object.entries(allConfig)) {
    const resource = configToResource(data);
    merged.set(resource.id, resource);
  }

  // In-memory entries override config (they have the live handler)
  for (const [id, resource] of registry) {
    merged.set(id, resource);
  }

  return Array.from(merged.values());
}

// ── Unregister ─────────────────────────────────────────────────────────────

/**
 * Remove a REST resource from both the in-memory registry and config storage.
 */
export async function unregisterRestResource(id: string): Promise<boolean> {
  registry.delete(id);
  return deleteConfig(`${REST_CONFIG_PREFIX}${id}`);
}

// ── Enable / Disable ───────────────────────────────────────────────────────

/**
 * Enable a REST resource plugin.
 */
export async function enableRestResource(id: string): Promise<boolean> {
  return setResourceEnabled(id, true);
}

/**
 * Disable a REST resource plugin.
 */
export async function disableRestResource(id: string): Promise<boolean> {
  return setResourceEnabled(id, false);
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function setResourceEnabled(id: string, enabled: boolean): Promise<boolean> {
  const resource = await getRestResource(id);
  if (!resource) return false;

  resource.enabled = enabled;

  // Update in-memory
  if (registry.has(id)) {
    registry.set(id, resource);
  }

  // Update config
  const configData: Record<string, unknown> = {
    id: resource.id,
    label: resource.label,
    description: resource.description,
    path: resource.path,
    methods: resource.methods,
    permissions: resource.permissions,
    enabled,
  };

  if (typeof resource.handler === 'string') {
    configData.handler_module = resource.handler;
  }

  await saveConfig(`${REST_CONFIG_PREFIX}${resource.id}`, configData);
  return true;
}

function configToResource(data: Record<string, unknown>): RestResource {
  return {
    id: data.id as string,
    label: data.label as string,
    description: (data.description as string) ?? '',
    path: data.path as string,
    methods: (data.methods as RestMethod[]) ?? [],
    handler: (data.handler_module as string) ?? '',
    permissions: (data.permissions as string[]) ?? [],
    enabled: data.enabled !== false,
  };
}
