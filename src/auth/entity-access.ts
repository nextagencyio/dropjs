import { userHasPermission } from './access.js';
import type { UserData } from './user.js';

export type EntityOperation = 'view' | 'create' | 'update' | 'delete';

export interface EntityAccessContext {
  entityType: string;
  bundle: string;
  entity?: {
    status?: boolean | number;
    uid?: number;
    [key: string]: unknown;
  };
  user: UserData | null;
}

/**
 * Check if a user can perform an operation on an entity.
 * Implements Drupal-style content access logic:
 *   - admin ('administer nodes') bypasses all checks
 *   - 'view': requires 'access content' for published; 'view own unpublished' or 'view any unpublished' for unpublished
 *   - 'create': requires 'create content' or 'administer nodes'
 *   - 'update': requires 'edit any content' or 'edit own content' (if author matches)
 *   - 'delete': requires 'delete any content' or 'delete own content' (if author matches)
 */
export async function checkEntityAccess(
  operation: EntityOperation,
  ctx: EntityAccessContext
): Promise<boolean> {
  const { user, entity, bundle } = ctx;

  // Admin bypasses all access checks
  if (await userHasPermission(user, 'administer nodes')) {
    return true;
  }

  switch (operation) {
    case 'view':
      return checkViewAccess(user, entity);
    case 'create':
      return checkCreateAccess(user, bundle);
    case 'update':
      return checkUpdateAccess(user, entity, bundle);
    case 'delete':
      return checkDeleteAccess(user, entity, bundle);
    default:
      return false;
  }
}

async function checkViewAccess(
  user: UserData | null,
  entity?: EntityAccessContext['entity']
): Promise<boolean> {
  if (!entity) return false;

  const isPublished = entity.status === true || entity.status === 1;

  if (isPublished) {
    return userHasPermission(user, 'access content');
  }

  // Unpublished content
  if (await userHasPermission(user, 'view any unpublished content')) {
    return true;
  }

  // Own unpublished content
  if (
    user &&
    entity.uid != null &&
    entity.uid === user.uid &&
    (await userHasPermission(user, 'view own unpublished content'))
  ) {
    return true;
  }

  return false;
}

async function checkCreateAccess(
  user: UserData | null,
  bundle?: string,
): Promise<boolean> {
  // Check per-bundle permission first (e.g., "create article content")
  if (bundle && await userHasPermission(user, `create ${bundle} content`)) {
    return true;
  }
  // Fall back to generic permission
  return userHasPermission(user, 'create content');
}

async function checkUpdateAccess(
  user: UserData | null,
  entity?: EntityAccessContext['entity'],
  bundle?: string,
): Promise<boolean> {
  // Check per-bundle "edit any" first
  if (bundle && await userHasPermission(user, `edit any ${bundle} content`)) {
    return true;
  }
  if (await userHasPermission(user, 'edit any content')) {
    return true;
  }

  // Check per-bundle "edit own"
  if (user && entity && entity.uid != null && entity.uid === user.uid) {
    if (bundle && await userHasPermission(user, `edit own ${bundle} content`)) {
      return true;
    }
    if (await userHasPermission(user, 'edit own content')) {
      return true;
    }
  }

  return false;
}

async function checkDeleteAccess(
  user: UserData | null,
  entity?: EntityAccessContext['entity'],
  bundle?: string,
): Promise<boolean> {
  // Check per-bundle "delete any" first
  if (bundle && await userHasPermission(user, `delete any ${bundle} content`)) {
    return true;
  }
  if (await userHasPermission(user, 'delete any content')) {
    return true;
  }

  // Check per-bundle "delete own"
  if (user && entity && entity.uid != null && entity.uid === user.uid) {
    if (bundle && await userHasPermission(user, `delete own ${bundle} content`)) {
      return true;
    }
    if (await userHasPermission(user, 'delete own content')) {
      return true;
    }
  }

  return false;
}
