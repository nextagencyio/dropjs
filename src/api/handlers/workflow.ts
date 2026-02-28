/**
 * Workflow API handlers — CRUD for workflows and moderation operations.
 */

import type { Request, Response } from '../types.js';
import {
  listWorkflows,
  loadWorkflow,
  saveWorkflow,
  deleteWorkflow,
  getAvailableTransitions,
  applyTransition,
  getModerationHistory,
} from '../../core/index.js';
import type { Workflow } from '../../core/index.js';
import { BadRequestError, NotFoundError } from '../errors.js';
import { Entity } from '../../core/index.js';

/**
 * GET /api/workflows
 * List all workflows.
 */
export async function handleListWorkflows(_req: Request, res: Response): Promise<void> {
  const workflows = await listWorkflows();
  res.json({ data: workflows });
}

/**
 * GET /api/workflows/:id
 * Get a single workflow.
 */
export async function handleGetWorkflow(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const workflow = await loadWorkflow(id);
  if (!workflow) {
    throw new NotFoundError(`Workflow "${id}" not found`);
  }
  res.json({ data: workflow });
}

/**
 * POST /api/workflows
 * Create a new workflow.
 */
export async function handleCreateWorkflow(req: Request, res: Response): Promise<void> {
  const { id, label, states, transitions, entity_types } = req.body;

  if (!id || !label) {
    throw new BadRequestError('id and label are required');
  }

  // Validate id format
  if (!/^[a-z][a-z0-9_]*$/.test(id)) {
    throw new BadRequestError('Workflow id must start with a letter and contain only lowercase letters, numbers, and underscores');
  }

  const existing = await loadWorkflow(id);
  if (existing) {
    throw new BadRequestError(`Workflow "${id}" already exists`);
  }

  const workflow: Workflow = {
    id,
    label,
    states: states ?? {},
    transitions: transitions ?? {},
    entity_types: entity_types ?? [],
  };

  await saveWorkflow(workflow);
  res.status(201).json({ data: workflow });
}

/**
 * DELETE /api/workflows/:id
 * Delete a workflow.
 */
export async function handleDeleteWorkflow(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const deleted = await deleteWorkflow(id);
  if (!deleted) {
    throw new NotFoundError(`Workflow "${id}" not found`);
  }
  res.status(204).send();
}

/**
 * GET /api/workflows/:id/transitions/:state
 * Get available transitions from a given state in a workflow.
 */
export async function handleGetTransitions(req: Request, res: Response): Promise<void> {
  const { id, state } = req.params;
  const workflow = await loadWorkflow(id);
  if (!workflow) {
    throw new NotFoundError(`Workflow "${id}" not found`);
  }

  const transitions = await getAvailableTransitions(id, state);
  res.json({ data: transitions });
}

/**
 * POST /api/:entityType/:bundle/:id/moderation
 * Apply a moderation transition to an entity.
 */
export async function handleApplyTransition(req: Request, res: Response): Promise<void> {
  const { entityType, bundle, id } = req.params;
  const { transition } = req.body;

  if (!transition) {
    throw new BadRequestError('transition is required in request body');
  }

  const entityId = parseInt(id, 10);
  if (isNaN(entityId)) {
    throw new BadRequestError('Invalid entity id');
  }

  const uid = (req as any).user?.uid;

  try {
    const entity = await applyTransition(entityType, entityId, transition, uid);
    res.json({ data: entity.toJSON() });
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new BadRequestError(error.message);
    }
    throw error;
  }
}

/**
 * GET /api/:entityType/:bundle/:id/moderation
 * Get moderation history for an entity.
 */
export async function handleGetModerationHistory(req: Request, res: Response): Promise<void> {
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

  const history = await getModerationHistory(entityType, entityId);
  res.json({ data: history });
}
