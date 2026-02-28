import { createLogger } from './logger.js';
import { EventBus } from './event-bus.js';

const logger = createLogger('core:cache');

interface CacheEntry {
  data: unknown;
  tags: string[];
  expires: number;
}

/**
 * In-memory cache with tag-based invalidation.
 * Follows Drupal's cache tag pattern where entities and configs
 * declare cache tags, and any mutation invalidates all entries
 * sharing those tags.
 */
class CacheBackend {
  private store = new Map<string, CacheEntry>();
  private tagIndex = new Map<string, Set<string>>(); // tag -> set of cache keys

  /**
   * Get a cached value.
   * Returns undefined on miss or expiration.
   */
  get<T = unknown>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (entry.expires > 0 && Date.now() > entry.expires) {
      this.delete(key);
      return undefined;
    }

    return entry.data as T;
  }

  /**
   * Set a cache value with optional tags and TTL.
   * @param key - Cache key
   * @param data - Value to cache
   * @param tags - Cache tags for invalidation (e.g., ['node:42', 'node_list'])
   * @param ttl - Time-to-live in seconds (0 = no expiration)
   */
  set(key: string, data: unknown, tags: string[] = [], ttl: number = 0): void {
    const expires = ttl > 0 ? Date.now() + (ttl * 1000) : 0;

    // Remove old tag associations
    const existing = this.store.get(key);
    if (existing) {
      for (const tag of existing.tags) {
        this.tagIndex.get(tag)?.delete(key);
      }
    }

    this.store.set(key, { data, tags, expires });

    // Register tag associations
    for (const tag of tags) {
      let keys = this.tagIndex.get(tag);
      if (!keys) {
        keys = new Set();
        this.tagIndex.set(tag, keys);
      }
      keys.add(key);
    }
  }

  /**
   * Delete a single cache entry.
   */
  delete(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    for (const tag of entry.tags) {
      this.tagIndex.get(tag)?.delete(key);
    }
    this.store.delete(key);
    return true;
  }

  /**
   * Invalidate all cache entries matching any of the given tags.
   */
  invalidateTags(tags: string[]): number {
    let count = 0;
    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (!keys) continue;

      for (const key of keys) {
        this.store.delete(key);
        count++;
      }
      this.tagIndex.delete(tag);
    }
    return count;
  }

  /**
   * Invalidate all entries whose key starts with the given prefix.
   */
  invalidatePrefix(prefix: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.store.clear();
    this.tagIndex.clear();
  }

  /**
   * Get cache statistics.
   */
  stats(): { size: number; tags: number } {
    return {
      size: this.store.size,
      tags: this.tagIndex.size,
    };
  }
}

// Named cache bins (like Drupal's cache bins: default, entity, config, render, etc.)
const bins = new Map<string, CacheBackend>();

/**
 * Get or create a cache bin.
 * Common bins: 'default', 'entity', 'config', 'render', 'page'
 */
export function getCacheBin(bin: string = 'default'): CacheBackend {
  let backend = bins.get(bin);
  if (!backend) {
    backend = new CacheBackend();
    bins.set(bin, backend);
  }
  return backend;
}

/**
 * Shorthand: get from the default cache bin.
 */
export function cacheGet<T = unknown>(key: string): T | undefined {
  return getCacheBin('default').get<T>(key);
}

/**
 * Shorthand: set in the default cache bin.
 */
export function cacheSet(key: string, data: unknown, tags: string[] = [], ttl: number = 0): void {
  getCacheBin('default').set(key, data, tags, ttl);
}

/**
 * Invalidate cache tags across ALL bins.
 */
export function cacheInvalidateTags(tags: string[]): void {
  let totalInvalidated = 0;
  for (const [, backend] of bins) {
    totalInvalidated += backend.invalidateTags(tags);
  }
  if (totalInvalidated > 0) {
    logger.debug(`Invalidated ${totalInvalidated} cache entries for tags: ${tags.join(', ')}`);
  }
}

/**
 * Clear all cache bins.
 */
export function cacheClearAll(): void {
  for (const [, backend] of bins) {
    backend.clear();
  }
  bins.clear();
  logger.info('All cache bins cleared');
}

/**
 * Get stats for all cache bins.
 */
export function cacheStats(): Record<string, { size: number; tags: number }> {
  const result: Record<string, { size: number; tags: number }> = {};
  for (const [name, backend] of bins) {
    result[name] = backend.stats();
  }
  return result;
}

/**
 * Generate standard cache tags for an entity.
 */
export function entityCacheTags(entityType: string, id?: number | string, bundle?: string): string[] {
  const tags: string[] = [`${entityType}_list`];
  if (bundle) {
    tags.push(`${entityType}:${bundle}_list`);
  }
  if (id !== undefined) {
    tags.push(`${entityType}:${id}`);
  }
  return tags;
}

/**
 * Generate standard cache tags for a config item.
 */
export function configCacheTags(name: string): string[] {
  return [`config:${name}`];
}

/**
 * Register EventBus hooks that automatically invalidate cache
 * when entities are created, updated, or deleted.
 */
export function registerCacheHooks(): void {
  EventBus.on('entity:insert', async (data: unknown) => {
    const entity = data as { entityType?: string; type?: string; nid?: number; tid?: number };
    const entityType = entity.entityType ?? 'node';
    const id = entity.nid ?? entity.tid;
    const bundle = entity.type as string | undefined;
    cacheInvalidateTags(entityCacheTags(entityType, id, bundle));
  }, { priority: 90 });

  EventBus.on('entity:update', async (data: unknown) => {
    const entity = data as { entityType?: string; type?: string; nid?: number; tid?: number };
    const entityType = entity.entityType ?? 'node';
    const id = entity.nid ?? entity.tid;
    const bundle = entity.type as string | undefined;
    cacheInvalidateTags(entityCacheTags(entityType, id, bundle));
  }, { priority: 90 });

  EventBus.on('entity:delete', async (data: unknown) => {
    const entity = data as { entityType?: string; type?: string; nid?: number; tid?: number };
    const entityType = entity.entityType ?? 'node';
    const id = entity.nid ?? entity.tid;
    const bundle = entity.type as string | undefined;
    cacheInvalidateTags(entityCacheTags(entityType, id, bundle));
  }, { priority: 90 });

  logger.info('Cache invalidation hooks registered');
}
