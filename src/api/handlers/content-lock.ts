/**
 * Content Lock API handlers — check, acquire, release, renew, and break content locks.
 */

import type { Request, Response } from '../types.js';
import {
  checkLock,
  acquireLock,
  releaseLock,
  renewLock,
  breakLock,
  getActiveLocks,
} from '../../core/index.js';
import { BadRequestError, NotFoundError } from '../errors.js';

/**
 * GET /api/:entityType/:bundle/:id/lock
 * Check lock status for a piece of content.
 */
export async function handleCheckLock(req: Request, res: Response): Promise<void> {
  const { entityType, id } = req.params;

  const entityId = parseInt(id, 10);
  if (isNaN(entityId)) {
    throw new BadRequestError('Invalid entity id');
  }

  const lock = await checkLock(entityType, entityId);
  res.json({ data: lock });
}

/**
 * POST /api/:entityType/:bundle/:id/lock
 * Acquire a lock on a piece of content.
 */
export async function handleAcquireLock(req: Request, res: Response): Promise<void> {
  const { entityType, id } = req.params;

  const entityId = parseInt(id, 10);
  if (isNaN(entityId)) {
    throw new BadRequestError('Invalid entity id');
  }

  const user = (req as any).user;
  if (!user || !user.uid) {
    throw new BadRequestError('User information is required to acquire a lock');
  }

  const result = await acquireLock(entityType, entityId, user.uid, user.name ?? `User ${user.uid}`);

  if (!result.success) {
    res.status(409).json({
      error: {
        status: 409,
        message: `Content is locked by ${result.lock.name}`,
      },
      data: result.lock,
    });
    return;
  }

  res.status(200).json({ data: result.lock });
}

/**
 * DELETE /api/:entityType/:bundle/:id/lock
 * Release a lock on a piece of content.
 */
export async function handleReleaseLock(req: Request, res: Response): Promise<void> {
  const { entityType, id } = req.params;

  const entityId = parseInt(id, 10);
  if (isNaN(entityId)) {
    throw new BadRequestError('Invalid entity id');
  }

  const user = (req as any).user;
  if (!user || !user.uid) {
    throw new BadRequestError('User information is required to release a lock');
  }

  const released = await releaseLock(entityType, entityId, user.uid);
  if (!released) {
    throw new NotFoundError('No lock found or you are not the lock owner');
  }

  res.status(204).send();
}

/**
 * POST /api/:entityType/:bundle/:id/lock/renew
 * Renew (extend) an existing lock.
 */
export async function handleRenewLock(req: Request, res: Response): Promise<void> {
  const { entityType, id } = req.params;

  const entityId = parseInt(id, 10);
  if (isNaN(entityId)) {
    throw new BadRequestError('Invalid entity id');
  }

  const user = (req as any).user;
  if (!user || !user.uid) {
    throw new BadRequestError('User information is required to renew a lock');
  }

  const lock = await renewLock(entityType, entityId, user.uid);
  if (!lock) {
    throw new NotFoundError('No lock found or you are not the lock owner');
  }

  res.json({ data: lock });
}

/**
 * POST /api/:entityType/:bundle/:id/lock/break
 * Force-break a lock (admin only).
 */
export async function handleBreakLock(req: Request, res: Response): Promise<void> {
  const { entityType, id } = req.params;

  const entityId = parseInt(id, 10);
  if (isNaN(entityId)) {
    throw new BadRequestError('Invalid entity id');
  }

  const lock = await breakLock(entityType, entityId);
  if (!lock) {
    throw new NotFoundError('No lock found');
  }

  res.json({ data: lock });
}

/**
 * GET /api/content-locks
 * List all active locks (admin only).
 */
export async function handleListLocks(_req: Request, res: Response): Promise<void> {
  const locks = await getActiveLocks();
  res.json({ data: locks, meta: { total: locks.length } });
}
