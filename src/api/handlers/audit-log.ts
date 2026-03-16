import type { Request, Response } from '../types.js';
import { getAuditLog, getRecentAuditLog } from '../../core/index.js';
import { BadRequestError } from '../errors.js';

/**
 * GET /api/audit-log — list recent audit log entries (admin only).
 */
export async function handleListAuditLog(
  req: Request,
  res: Response,
): Promise<void> {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const entries = await getRecentAuditLog(limit);
  res.json({ data: entries });
}

/**
 * GET /api/:entityType/:id/audit-log — audit log for a specific entity.
 */
export async function handleEntityAuditLog(
  req: Request,
  res: Response,
): Promise<void> {
  const { entityType, id } = req.params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) throw new BadRequestError('Invalid entity ID');

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

  const entries = await getAuditLog(entityType, numId, { limit, offset });
  res.json({ data: entries });
}
