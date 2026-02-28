import type { Request, Response } from '../types.js';
import {
  createComment,
  loadComment,
  loadComments,
  updateComment,
  deleteComment,
  countComments,
} from '../../core/index.js';
import { BadRequestError, NotFoundError, ValidationError } from '../errors.js';

/**
 * GET /api/comments?entity_type=node&entity_id=123
 * List comments for a given entity. Requires entity_type and entity_id query params.
 */
export async function handleListComments(
  req: Request,
  res: Response
): Promise<void> {
  const entityType = req.query.entity_type as string | undefined;
  const entityIdStr = req.query.entity_id as string | undefined;

  if (!entityType || !entityIdStr) {
    throw new BadRequestError('entity_type and entity_id query parameters are required');
  }

  const entityId = parseInt(entityIdStr, 10);
  if (isNaN(entityId)) {
    throw new BadRequestError('entity_id must be a valid integer');
  }

  const limit = parseInt(req.query.limit as string, 10) || 50;
  const offset = parseInt(req.query.offset as string, 10) || 0;
  const statusStr = req.query.status as string | undefined;
  const status = statusStr !== undefined ? parseInt(statusStr, 10) : undefined;

  const comments = await loadComments(entityType, entityId, {
    limit,
    offset,
    status,
  });

  const total = await countComments(
    entityType,
    entityId,
    status
  );

  res.json({
    data: comments,
    meta: {
      count: comments.length,
      total,
      offset,
      limit,
    },
  });
}

/**
 * GET /api/comments/:cid
 * Get a single comment by ID.
 */
export async function handleGetComment(
  req: Request,
  res: Response
): Promise<void> {
  const cid = parseInt(req.params.cid, 10);
  if (isNaN(cid)) {
    throw new BadRequestError('Invalid comment ID');
  }

  const comment = await loadComment(cid);
  if (!comment) {
    throw new NotFoundError('Comment not found');
  }

  res.json({ data: comment });
}

/**
 * POST /api/comments
 * Create a new comment. Requires entity_type and entity_id in the body.
 */
export async function handleCreateComment(
  req: Request,
  res: Response
): Promise<void> {
  const {
    entity_type,
    entity_id,
    comment_type,
    subject,
    name,
    mail,
    homepage,
    parent_cid,
    status,
    langcode,
  } = req.body;

  if (!entity_type || entity_id === undefined || entity_id === null) {
    throw new ValidationError('entity_type and entity_id are required');
  }

  const entityId = typeof entity_id === 'string' ? parseInt(entity_id, 10) : entity_id;
  if (typeof entityId !== 'number' || isNaN(entityId)) {
    throw new ValidationError('entity_id must be a valid integer');
  }

  // Get uid from authenticated user if available
  const user = (req as any).user;
  const uid = user?.uid ?? 0;

  const cid = await createComment({
    entity_type,
    entity_id: entityId,
    comment_type,
    uid,
    subject,
    name,
    mail,
    homepage,
    parent_cid,
    status,
    langcode,
  });

  const comment = await loadComment(cid);
  res.status(201).json({ data: comment });
}

/**
 * PATCH /api/comments/:cid
 * Update an existing comment's field data.
 */
export async function handleUpdateComment(
  req: Request,
  res: Response
): Promise<void> {
  const cid = parseInt(req.params.cid, 10);
  if (isNaN(cid)) {
    throw new BadRequestError('Invalid comment ID');
  }

  const existing = await loadComment(cid);
  if (!existing) {
    throw new NotFoundError('Comment not found');
  }

  const { status, subject, name, mail, homepage } = req.body;

  await updateComment(cid, { status, subject, name, mail, homepage });

  const updated = await loadComment(cid);
  res.json({ data: updated });
}

/**
 * DELETE /api/comments/:cid
 * Delete a comment.
 */
export async function handleDeleteComment(
  req: Request,
  res: Response
): Promise<void> {
  const cid = parseInt(req.params.cid, 10);
  if (isNaN(cid)) {
    throw new BadRequestError('Invalid comment ID');
  }

  const existing = await loadComment(cid);
  if (!existing) {
    throw new NotFoundError('Comment not found');
  }

  await deleteComment(cid);
  res.status(204).send();
}
