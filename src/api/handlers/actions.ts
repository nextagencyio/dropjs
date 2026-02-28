import type { Request, Response } from '../types.js';
import {
  getAllActions,
  listTriggers,
  loadTrigger,
  createTrigger,
  updateTrigger,
  deleteTrigger,
  executeTrigger,
  getAction,
} from '../../core/index.js';
import { BadRequestError, NotFoundError } from '../errors.js';

/**
 * GET /api/actions
 * List all registered actions (in-memory definitions).
 */
export async function handleListActions(
  _req: Request,
  res: Response
): Promise<void> {
  const actions = getAllActions();

  // Return action metadata without the execute function
  const data = actions.map(({ id, label, description, category }) => ({
    id,
    label,
    description,
    category,
  }));

  res.json({ data });
}

/**
 * GET /api/triggers
 * List all triggers. Optional ?event= query parameter to filter by event.
 */
export async function handleListTriggers(
  req: Request,
  res: Response
): Promise<void> {
  const event = req.query.event as string | undefined;
  const triggers = await listTriggers(event || undefined);
  res.json({ data: triggers });
}

/**
 * GET /api/triggers/:id
 * Get a single trigger by ID.
 */
export async function handleGetTrigger(
  req: Request,
  res: Response
): Promise<void> {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) throw new BadRequestError('Invalid trigger ID');

  const trigger = await loadTrigger(id);
  if (!trigger) throw new NotFoundError('Trigger not found');

  res.json({ data: trigger });
}

/**
 * POST /api/triggers
 * Create a new trigger. Requires label, event, and action_id in the body.
 */
export async function handleCreateTrigger(
  req: Request,
  res: Response
): Promise<void> {
  const { label, event, action_id, conditions, weight, enabled } = req.body;

  if (!label || typeof label !== 'string') {
    throw new BadRequestError('label is required and must be a string');
  }
  if (!event || typeof event !== 'string') {
    throw new BadRequestError('event is required and must be a string');
  }
  if (!action_id || typeof action_id !== 'string') {
    throw new BadRequestError('action_id is required and must be a string');
  }

  // Validate that the action exists
  const action = getAction(action_id);
  if (!action) {
    throw new BadRequestError(`Action "${action_id}" is not registered`);
  }

  const trigger = await createTrigger({
    label,
    event,
    action_id,
    conditions: conditions || undefined,
    weight: weight !== undefined ? Number(weight) : undefined,
    enabled: enabled !== undefined ? Boolean(enabled) : undefined,
  });

  res.status(201).json({ data: trigger });
}

/**
 * PATCH /api/triggers/:id
 * Update an existing trigger.
 */
export async function handleUpdateTrigger(
  req: Request,
  res: Response
): Promise<void> {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) throw new BadRequestError('Invalid trigger ID');

  const existing = await loadTrigger(id);
  if (!existing) throw new NotFoundError('Trigger not found');

  const { label, event, action_id, conditions, weight, enabled } = req.body;

  // If changing action_id, validate that the new action exists
  if (action_id !== undefined) {
    const action = getAction(action_id);
    if (!action) {
      throw new BadRequestError(`Action "${action_id}" is not registered`);
    }
  }

  const trigger = await updateTrigger(id, {
    label,
    event,
    action_id,
    conditions,
    weight: weight !== undefined ? Number(weight) : undefined,
    enabled: enabled !== undefined ? Boolean(enabled) : undefined,
  });

  res.json({ data: trigger });
}

/**
 * DELETE /api/triggers/:id
 * Delete a trigger.
 */
export async function handleDeleteTrigger(
  req: Request,
  res: Response
): Promise<void> {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) throw new BadRequestError('Invalid trigger ID');

  const existing = await loadTrigger(id);
  if (!existing) throw new NotFoundError('Trigger not found');

  await deleteTrigger(id);
  res.status(204).send();
}

/**
 * POST /api/triggers/:id/execute
 * Manually execute a trigger. Optional body is used as context data.
 */
export async function handleExecuteTrigger(
  req: Request,
  res: Response
): Promise<void> {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) throw new BadRequestError('Invalid trigger ID');

  const trigger = await loadTrigger(id);
  if (!trigger) throw new NotFoundError('Trigger not found');

  const action = getAction(trigger.action_id);
  if (!action) {
    throw new BadRequestError(`Action "${trigger.action_id}" is not registered`);
  }

  // Use request body as event data, falling back to empty object
  const eventData = req.body && Object.keys(req.body).length > 0
    ? req.body
    : {};

  await executeTrigger(trigger, eventData);

  res.json({
    message: `Trigger #${trigger.id} ("${trigger.label}") executed action "${trigger.action_id}" successfully`,
  });
}
