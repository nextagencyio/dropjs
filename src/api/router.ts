import { Router } from 'express';
import {
  authenticate,
  requireAuth,
  requirePermission,
} from '../auth/index.js';
import { handleList } from './handlers/list.js';
import { handleGet } from './handlers/get.js';
import { handleCreate } from './handlers/create.js';
import { handleUpdate } from './handlers/update.js';
import { handleDelete } from './handlers/delete.js';
import { asyncHandler, errorHandler } from './middleware.js';
import { readLimiter, mutationLimiter } from './rate-limit.js';
import { validateEntityFields } from './validation.js';

export interface CustomRoute {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  handler: (req: any, context: any) => Promise<unknown>;
  permissions?: string[];
}

export function createApiRouter(
  customRoutes: CustomRoute[] = [],
  options: { disableRateLimit?: boolean } = {}
): Router {
  const router = Router();

  // Authenticate all requests (populates req.user, doesn't reject)
  router.use(authenticate() as any);

  // Register custom routes first (they take priority)
  for (const route of customRoutes) {
    const method = route.method.toLowerCase() as
      | 'get'
      | 'post'
      | 'patch'
      | 'put'
      | 'delete';
    const middlewares: any[] = [];

    if (route.permissions?.length) {
      middlewares.push(requireAuth());
      for (const perm of route.permissions) {
        middlewares.push(requirePermission(perm));
      }
    }

    router[method](
      route.path,
      ...middlewares,
      asyncHandler(async (req, res) => {
        const result = await route.handler(req, { user: (req as any).user });
        res.json(result);
      })
    );
  }

  // Auto-generated entity CRUD routes
  const rl = options.disableRateLimit ? [] : [readLimiter];
  const ml = options.disableRateLimit ? [] : [mutationLimiter];

  router.get(
    '/api/:entityType/:bundle',
    ...rl,
    asyncHandler(handleList)
  );
  router.get(
    '/api/:entityType/:bundle/:id',
    ...rl,
    asyncHandler(handleGet)
  );
  router.post(
    '/api/:entityType/:bundle',
    ...ml,
    requireAuth() as any,
    validateEntityFields,
    asyncHandler(handleCreate)
  );
  router.patch(
    '/api/:entityType/:bundle/:id',
    ...ml,
    requireAuth() as any,
    validateEntityFields,
    asyncHandler(handleUpdate)
  );
  router.delete(
    '/api/:entityType/:bundle/:id',
    ...ml,
    requireAuth() as any,
    asyncHandler(handleDelete)
  );

  // Error handler
  router.use(errorHandler as any);

  return router;
}
