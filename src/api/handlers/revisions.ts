/**
 * Revision history API handlers for node entities.
 */

import type { Request, Response } from '../types.js';
import { Entity } from '../../core/index.js';
import { getConnection } from '../../db/index.js';
import { BadRequestError, NotFoundError } from '../errors.js';

/**
 * GET /api/node/:id/revisions
 * List all revisions for a node, including revision_log and author name.
 */
export async function handleListRevisions(
  req: Request,
  res: Response,
): Promise<void> {
  const { id } = req.params;
  const nid = parseInt(id, 10);
  if (isNaN(nid)) throw new BadRequestError('Invalid node ID');

  const conn = getConnection();
  const rows = await conn('node_revision')
    .select(
      'node_revision.vid',
      'node_revision.revision_uid',
      'node_revision.revision_timestamp',
      'node_revision.revision_log',
      'users_field_data.name as revision_user_name',
    )
    .leftJoin('users_field_data', 'node_revision.revision_uid', 'users_field_data.uid')
    .where('node_revision.nid', nid)
    .orderBy('node_revision.vid', 'desc');

  res.json({
    data: rows.map((r: any) => ({
      vid: r.vid,
      revision_uid: r.revision_uid,
      revision_user_name: r.revision_user_name ?? null,
      revision_timestamp: r.revision_timestamp,
      revision_log: r.revision_log ?? null,
    })),
  });
}

/**
 * GET /api/node/:id/revisions/:vid
 * Load a specific revision with full entity data.
 */
export async function handleGetRevision(
  req: Request,
  res: Response,
): Promise<void> {
  const { id, vid } = req.params;
  const nid = parseInt(id, 10);
  const vidNum = parseInt(vid, 10);
  if (isNaN(nid)) throw new BadRequestError('Invalid node ID');
  if (isNaN(vidNum)) throw new BadRequestError('Invalid revision ID');

  const entity = await Entity.loadRevision('node', nid, vidNum);
  if (!entity) {
    throw new NotFoundError(`Revision ${vid} not found for node ${id}`);
  }

  res.json({ data: entity.toJSON() });
}

/**
 * GET /api/node/:id/revisions/diff?from=VID1&to=VID2
 * Compare two revisions and return changed fields.
 */
export async function handleDiffRevisions(
  req: Request,
  res: Response,
): Promise<void> {
  const { id } = req.params;
  const nid = parseInt(id, 10);
  if (isNaN(nid)) throw new BadRequestError('Invalid node ID');

  const fromVid = parseInt(req.query.from as string, 10);
  const toVid = parseInt(req.query.to as string, 10);
  if (isNaN(fromVid) || isNaN(toVid)) {
    throw new BadRequestError('Both "from" and "to" query parameters are required and must be numeric');
  }

  const [fromEntity, toEntity] = await Promise.all([
    Entity.loadRevision('node', nid, fromVid),
    Entity.loadRevision('node', nid, toVid),
  ]);

  if (!fromEntity) throw new NotFoundError(`Revision ${fromVid} not found for node ${id}`);
  if (!toEntity) throw new NotFoundError(`Revision ${toVid} not found for node ${id}`);

  const fromData = fromEntity.toJSON();
  const toData = toEntity.toJSON();

  // Fields to skip in diff (they always differ between revisions)
  const skipFields = new Set(['vid', 'changed']);

  const changes: Record<string, { old: unknown; new: unknown }> = {};
  const allKeys = new Set([...Object.keys(fromData), ...Object.keys(toData)]);

  for (const key of allKeys) {
    if (skipFields.has(key)) continue;
    const oldVal = fromData[key];
    const newVal = toData[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = { old: oldVal, new: newVal };
    }
  }

  res.json({
    data: {
      from_vid: fromVid,
      to_vid: toVid,
      changes,
    },
  });
}

/**
 * POST /api/node/:id/revisions/:vid/restore
 * Restore a previous revision by applying its field values to the current entity.
 */
export async function handleRestoreRevision(
  req: Request,
  res: Response,
): Promise<void> {
  const { id, vid } = req.params;
  const nid = parseInt(id, 10);
  const vidNum = parseInt(vid, 10);
  if (isNaN(nid)) throw new BadRequestError('Invalid node ID');
  if (isNaN(vidNum)) throw new BadRequestError('Invalid revision ID');

  const oldRevision = await Entity.loadRevision('node', nid, vidNum);
  if (!oldRevision) {
    throw new NotFoundError(`Revision ${vid} not found for node ${id}`);
  }

  const current = await Entity.load('node', nid);
  if (!current) {
    throw new NotFoundError(`Node ${id} not found`);
  }

  // Apply old revision's field values to current entity
  const revisionData = oldRevision.toJSON();
  // Skip internal identifiers that shouldn't be overwritten
  const skipFields = new Set(['nid', 'vid', 'uuid']);
  for (const [key, value] of Object.entries(revisionData)) {
    if (!skipFields.has(key)) {
      current.set(key, value);
    }
  }

  await current.save();

  res.json({ data: current.toJSON() });
}
