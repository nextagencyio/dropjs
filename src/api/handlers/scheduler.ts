/**
 * Scheduler API handlers — manage scheduled publish/unpublish transitions.
 */

import type { Request, Response } from '../types.js';
import {
  getScheduledTransition,
  scheduleTransition,
  cancelScheduledTransition,
  getUpcomingScheduledTransitions,
} from '../../core/index.js';
import { Entity } from '../../core/index.js';
import { BadRequestError, NotFoundError } from '../errors.js';

/**
 * GET /api/:entityType/:bundle/:id/schedule
 * Get the scheduled transition for an entity.
 */
export async function handleGetSchedule(req: Request, res: Response): Promise<void> {
  const { entityType, bundle, id } = req.params;

  const entityId = parseInt(id, 10);
  if (isNaN(entityId)) {
    throw new BadRequestError('Invalid entity id');
  }

  // Verify entity exists
  const entity = await Entity.load(entityType, entityId);
  if (!entity) {
    throw new NotFoundError(`Entity ${entityType}:${entityId} not found`);
  }

  const schedule = await getScheduledTransition(entityType, entityId);
  res.json({ data: schedule });
}

/**
 * POST /api/:entityType/:bundle/:id/schedule
 * Schedule a transition for an entity.
 * Body: { transition: 'publish'|'unpublish', scheduled_date: ISO string }
 */
export async function handleSetSchedule(req: Request, res: Response): Promise<void> {
  const { entityType, bundle, id } = req.params;
  const { transition, scheduled_date } = req.body;

  const entityId = parseInt(id, 10);
  if (isNaN(entityId)) {
    throw new BadRequestError('Invalid entity id');
  }

  if (!transition || !scheduled_date) {
    throw new BadRequestError('transition and scheduled_date are required');
  }

  if (transition !== 'publish' && transition !== 'unpublish') {
    throw new BadRequestError('transition must be "publish" or "unpublish"');
  }

  // Validate ISO date
  const parsedDate = new Date(scheduled_date);
  if (isNaN(parsedDate.getTime())) {
    throw new BadRequestError('scheduled_date must be a valid ISO date string');
  }

  const uid = (req as any).user?.uid;

  try {
    const schedule = await scheduleTransition(entityType, entityId, transition, scheduled_date, uid);
    res.status(201).json({ data: schedule });
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new BadRequestError(error.message);
    }
    throw error;
  }
}

/**
 * DELETE /api/:entityType/:bundle/:id/schedule
 * Cancel a scheduled transition for an entity.
 */
export async function handleCancelSchedule(req: Request, res: Response): Promise<void> {
  const { entityType, bundle, id } = req.params;

  const entityId = parseInt(id, 10);
  if (isNaN(entityId)) {
    throw new BadRequestError('Invalid entity id');
  }

  const cancelled = await cancelScheduledTransition(entityType, entityId);
  if (!cancelled) {
    throw new NotFoundError(`No scheduled transition for ${entityType}:${entityId}`);
  }

  res.status(204).send();
}

/**
 * GET /api/schedules
 * List all upcoming scheduled transitions. Admin only.
 */
export async function handleListSchedules(req: Request, res: Response): Promise<void> {
  const limit = parseInt(req.query.limit as string, 10) || 50;
  const schedules = await getUpcomingScheduledTransitions(limit);
  res.json({ data: schedules, meta: { total: schedules.length } });
}
