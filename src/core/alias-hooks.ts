import { EventBus } from './event-bus.js';
import { autoGenerateAlias, deleteAliasesBySource } from './url-alias.js';
import type { Entity } from './entity.js';

/**
 * Register EventBus hooks for auto-generating URL aliases
 * on entity create/update/delete.
 */
export function registerAliasHooks(): void {
  EventBus.on('entity:insert', async (data: unknown) => {
    const entity = data as Entity;
    const title = entity.toJSON().title as string | undefined;
    if (title) {
      await autoGenerateAlias(
        entity.entityType,
        entity.bundle,
        entity.nid!,
        title,
        entity.langcode
      );
    }
  }, { priority: 90 });

  EventBus.on('entity:update', async (data: unknown) => {
    const entity = data as Entity;
    const title = entity.toJSON().title as string | undefined;
    if (title) {
      await autoGenerateAlias(
        entity.entityType,
        entity.bundle,
        entity.nid!,
        title,
        entity.langcode
      );
    }
  }, { priority: 90 });

  EventBus.on('entity:delete', async (data: unknown) => {
    const entity = data as Entity;
    const sourcePath = `/api/${entity.entityType}/${entity.bundle}/${entity.nid}`;
    await deleteAliasesBySource(sourcePath);
  }, { priority: 90 });
}
