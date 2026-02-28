/**
 * REST Resources API handlers — admin CRUD + enable/disable for REST resource plugins.
 */

import type { Request, Response } from '../types.js';
import {
  getAllRestResources,
  getRestResource,
  enableRestResource,
  disableRestResource,
} from '../../core/index.js';
import { NotFoundError } from '../errors.js';

export async function handleListRestResources(_req: Request, res: Response): Promise<void> {
  const resources = await getAllRestResources();
  const data = resources.map((r) => ({
    id: r.id,
    label: r.label,
    description: r.description,
    path: r.path,
    methods: r.methods,
    permissions: r.permissions,
    enabled: r.enabled,
  }));
  res.json({ data });
}

export async function handleGetRestResource(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const resource = await getRestResource(id);
  if (!resource) {
    throw new NotFoundError(`REST resource "${id}" not found`);
  }
  res.json({
    data: {
      id: resource.id,
      label: resource.label,
      description: resource.description,
      path: resource.path,
      methods: resource.methods,
      permissions: resource.permissions,
      enabled: resource.enabled,
    },
  });
}

export async function handleEnableRestResource(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const ok = await enableRestResource(id);
  if (!ok) {
    throw new NotFoundError(`REST resource "${id}" not found`);
  }
  res.json({ message: `REST resource "${id}" enabled` });
}

export async function handleDisableRestResource(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const ok = await disableRestResource(id);
  if (!ok) {
    throw new NotFoundError(`REST resource "${id}" not found`);
  }
  res.json({ message: `REST resource "${id}" disabled` });
}
