import { EventBus } from './event-bus.js';
import { registerEntityType, type EntityTypeDefinition } from './entity-type.js';
import { Entity } from './entity.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

type EventHandler = (data: unknown, context?: unknown) => Promise<void> | void;

export interface ModuleDefinition {
  name: string;
  version: string;
  label: string;
  description?: string;
  dependencies?: string[];

  install?: (context: ModuleContext) => Promise<void>;
  uninstall?: (context: ModuleContext) => Promise<void>;

  events?: Record<string, EventHandler>;
}

export interface ModuleContext {
  entityType: {
    create: (entityType: string, bundle: string, definition: Omit<EntityTypeDefinition, 'entity_type' | 'bundle'>) => Promise<void>;
    delete: (entityType: string, bundle: string) => Promise<void>;
  };
}

interface LoadedModule {
  definition: ModuleDefinition;
  enabled: boolean;
}

const moduleRegistry = new Map<string, LoadedModule>();

function createModuleContext(): ModuleContext {
  return {
    entityType: {
      async create(entityType, bundle, partial) {
        const definition: EntityTypeDefinition = {
          entity_type: entityType,
          bundle,
          ...partial,
        } as EntityTypeDefinition;
        registerEntityType(definition);
        await Entity.ensureBaseTable(entityType);
        await Entity.ensureFieldTables(definition);
      },
      async delete(_entityType, _bundle) {
        // For Phase 1, just unregister — don't drop tables
        // unregisterEntityType(entityType, bundle);
      },
    },
  };
}

export async function loadModule(definition: ModuleDefinition): Promise<void> {
  // Check dependencies
  if (definition.dependencies) {
    for (const dep of definition.dependencies) {
      const loaded = moduleRegistry.get(dep);
      if (!loaded || !loaded.enabled) {
        throw new Error(
          `Module "${definition.name}" requires "${dep}" which is not enabled.`
        );
      }
    }
  }

  // Register event handlers
  if (definition.events) {
    for (const [event, handler] of Object.entries(definition.events)) {
      EventBus.on(event, handler);
    }
  }

  moduleRegistry.set(definition.name, { definition, enabled: true });
}

export async function installModule(definition: ModuleDefinition): Promise<void> {
  await loadModule(definition);

  if (definition.install) {
    const context = createModuleContext();
    await definition.install(context);
  }
}

export async function uninstallModule(name: string): Promise<void> {
  const loaded = moduleRegistry.get(name);
  if (!loaded) return;

  // Remove event handlers
  if (loaded.definition.events) {
    for (const [event, handler] of Object.entries(loaded.definition.events)) {
      EventBus.off(event, handler);
    }
  }

  if (loaded.definition.uninstall) {
    const context = createModuleContext();
    await loaded.definition.uninstall(context);
  }

  moduleRegistry.delete(name);
}

export function getModule(name: string): ModuleDefinition | undefined {
  return moduleRegistry.get(name)?.definition;
}

export function getEnabledModules(): ModuleDefinition[] {
  return [...moduleRegistry.values()]
    .filter((m) => m.enabled)
    .map((m) => m.definition);
}

export interface CoreModuleInfo {
  name: string;
  label: string;
  description: string;
  version: string;
  package: string;
  required: boolean;
}

const CORE_MODULES: CoreModuleInfo[] = [
  { name: 'node', label: 'Node', description: 'Content entity management and storage', version: '0.1.0', package: 'Core', required: true },
  { name: 'taxonomy', label: 'Taxonomy', description: 'Organize content with hierarchical vocabularies and terms', version: '0.1.0', package: 'Core', required: true },
  { name: 'user', label: 'User', description: 'User authentication, roles, and permissions', version: '0.1.0', package: 'Core', required: true },
  { name: 'file', label: 'File', description: 'File upload and storage management', version: '0.1.0', package: 'Core', required: false },
  { name: 'media', label: 'Media', description: 'Media library with image processing', version: '0.1.0', package: 'Core', required: false },
  { name: 'system', label: 'System', description: 'Core system functionality and configuration', version: '0.1.0', package: 'Core', required: true },
  { name: 'field', label: 'Field', description: 'Field types and storage for entities', version: '0.1.0', package: 'Core', required: true },
  { name: 'text', label: 'Text', description: 'Long text and rich text field support', version: '0.1.0', package: 'Core', required: false },
  { name: 'image', label: 'Image', description: 'Image field type with styles and transformations', version: '0.1.0', package: 'Core', required: false },
  { name: 'options', label: 'Options', description: 'List and select field types with allowed values', version: '0.1.0', package: 'Core', required: false },
  { name: 'path', label: 'Path', description: 'URL aliases for content', version: '0.1.0', package: 'Core', required: false },
  { name: 'webhook', label: 'Webhook', description: 'Event-driven webhook notifications', version: '0.1.0', package: 'Core', required: false },
];

export function getAllModules(): CoreModuleInfo[] {
  const coreNames = new Set(CORE_MODULES.map((m) => m.name));
  const userModules: CoreModuleInfo[] = [...moduleRegistry.values()]
    .filter((m) => !coreNames.has(m.definition.name))
    .map((m) => ({
      name: m.definition.name,
      label: m.definition.label,
      description: m.definition.description ?? '',
      version: m.definition.version,
      package: 'Custom',
      required: false,
    }));
  return [...CORE_MODULES, ...userModules];
}

/**
 * Load entity type definitions from JSON files in a directory.
 */
export async function loadEntityTypesFromDir(dir: string): Promise<void> {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const definition: EntityTypeDefinition = JSON.parse(content);

    registerEntityType(definition);
    await Entity.ensureBaseTable(definition.entity_type);
    await Entity.ensureFieldTables(definition);
  }
}

export function clearModuleRegistry(): void {
  moduleRegistry.clear();
}
