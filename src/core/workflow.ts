/**
 * Workflow/Moderation system — manage content moderation states and transitions.
 *
 * Similar to Drupal's Content Moderation module, this provides:
 * - Workflow states (draft, review, published, archived)
 * - Transitions between states (submit for review, publish, archive, etc.)
 * - Moderation history tracking
 * - Per-bundle workflow assignment
 */

import { saveConfig, loadConfig, loadAllConfig, deleteConfig } from './config-storage.js';
import { Entity } from './entity.js';
import { stateGet, stateSet } from './state.js';
import { EventBus } from './event-bus.js';
import { sendWorkflowTransitionEmail } from './mail.js';
import { createLogger } from './logger.js';

const logger = createLogger('workflow');

export interface WorkflowState {
  id: string;           // e.g. 'draft', 'review', 'published', 'archived'
  label: string;
  weight: number;
  published: boolean;   // whether this state means content is publicly visible
}

export interface WorkflowTransition {
  id: string;           // e.g. 'submit_for_review', 'publish', 'archive'
  label: string;
  from: string[];       // array of state IDs this transition starts from
  to: string;           // state ID this transitions to
}

export interface Workflow {
  id: string;           // e.g. 'editorial'
  label: string;
  states: Record<string, WorkflowState>;
  transitions: Record<string, WorkflowTransition>;
  entity_types: string[];  // which entity type bundles use this workflow, e.g. ['node:article']
}

interface ModerationLogEntry {
  timestamp: number;
  from_state: string;
  to_state: string;
  transition: string;
  uid?: number;
}

/**
 * Save a workflow to config storage.
 */
export async function saveWorkflow(workflow: Workflow): Promise<void> {
  await saveConfig(`workflows.workflow.${workflow.id}`, workflow as unknown as Record<string, unknown>);
}

/**
 * Load a workflow from config storage.
 */
export async function loadWorkflow(id: string): Promise<Workflow | null> {
  return await loadConfig(`workflows.workflow.${id}`) as Workflow | null;
}

/**
 * List all workflows.
 */
export async function listWorkflows(): Promise<Workflow[]> {
  const configs = await loadAllConfig('workflows.workflow.');
  return Object.values(configs).map(config => config as unknown as Workflow);
}

/**
 * Delete a workflow.
 */
export async function deleteWorkflow(id: string): Promise<boolean> {
  return await deleteConfig(`workflows.workflow.${id}`);
}

/**
 * Get the workflow assigned to a specific entity type + bundle.
 */
export async function getWorkflowForBundle(
  entityType: string,
  bundle: string
): Promise<Workflow | null> {
  const workflows = await listWorkflows();
  const key = `${entityType}:${bundle}`;

  for (const workflow of workflows) {
    if (workflow.entity_types.includes(key)) {
      return workflow;
    }
  }

  return null;
}

/**
 * Get available transitions from a given state in a workflow.
 */
export async function getAvailableTransitions(
  workflowId: string,
  currentState: string
): Promise<WorkflowTransition[]> {
  const workflow = await loadWorkflow(workflowId);
  if (!workflow) {
    return [];
  }

  const transitions: WorkflowTransition[] = [];
  for (const transition of Object.values(workflow.transitions)) {
    // Check if transition allows starting from current state (or from any state with empty array)
    if (transition.from.length === 0 || transition.from.includes(currentState)) {
      transitions.push(transition);
    }
  }

  return transitions;
}

/**
 * Apply a transition to an entity.
 * Validates the transition is allowed, updates moderation_state and status,
 * saves the entity, and logs to moderation history.
 */
export async function applyTransition(
  entityType: string,
  entityId: number,
  transitionId: string,
  uid?: number
): Promise<Entity> {
  // Load the entity
  const entity = await Entity.load(entityType, entityId);
  if (!entity) {
    throw new Error(`Entity ${entityType}:${entityId} not found`);
  }

  // Get current moderation state from KV store (default to 'draft' if unset)
  const stateKey = `moderation_state:${entityType}:${entityId}`;
  const currentState = await stateGet<string>(stateKey) ?? 'draft';

  // Load the workflow for this bundle
  const workflow = await getWorkflowForBundle(entityType, entity.bundle);
  if (!workflow) {
    throw new Error(`No workflow found for ${entityType}:${entity.bundle}`);
  }

  // Find the transition
  const transition = workflow.transitions[transitionId];
  if (!transition) {
    throw new Error(`Transition "${transitionId}" not found in workflow "${workflow.id}"`);
  }

  // Validate transition is allowed from current state
  if (transition.from.length > 0 && !transition.from.includes(currentState)) {
    throw new Error(
      `Transition "${transitionId}" is not allowed from state "${currentState}". ` +
      `Allowed from: ${transition.from.join(', ')}`
    );
  }

  // Validate target state exists
  const targetState = workflow.states[transition.to];
  if (!targetState) {
    throw new Error(`Target state "${transition.to}" not found in workflow`);
  }

  // Update entity's moderation state in KV store
  await stateSet(stateKey, transition.to);

  // Also set on entity data for convenience (in-memory only for current request)
  entity.set('moderation_state', transition.to);

  // Update entity's published status based on the target state
  entity.status = targetState.published;

  // Save the entity
  await entity.save();

  // Log to moderation history
  const logKey = `moderation_log:${entityType}:${entityId}`;
  const history = await stateGet<ModerationLogEntry[]>(logKey, []) ?? [];

  history.push({
    timestamp: Date.now(),
    from_state: currentState,
    to_state: transition.to,
    transition: transitionId,
    uid,
  });

  await stateSet(logKey, history);

  // Emit workflow transition event
  await EventBus.emit('workflow:transition', {
    entity,
    entityType,
    entityId,
    workflow,
    transition,
    from_state: currentState,
    to_state: transition.to,
    uid,
  });

  // Send email notifications (non-blocking)
  sendWorkflowNotifications({
    entity,
    entityType,
    entityId,
    workflow,
    transition,
    fromState: currentState,
    toState: transition.to,
    fromStateLabel: workflow.states[currentState]?.label ?? currentState,
    toStateLabel: targetState.label,
    uid,
  }).catch((err) => {
    logger.error('Failed to send workflow notifications', {
      error: err instanceof Error ? err.message : String(err),
    });
  });

  return entity;
}

/**
 * Send email notifications for a workflow transition.
 * Notifies the admin email (SITE_EMAIL) about the transition.
 */
async function sendWorkflowNotifications(params: {
  entity: Entity;
  entityType: string;
  entityId: number;
  workflow: Workflow;
  transition: WorkflowTransition;
  fromState: string;
  toState: string;
  fromStateLabel: string;
  toStateLabel: string;
  uid?: number;
}): Promise<void> {
  const { entity, entityType, entityId, transition, fromStateLabel, toStateLabel, uid } = params;

  // Resolve actor name
  let actorName = 'System';
  if (uid) {
    try {
      const { loadUser } = await import('../auth/user.js');
      const user = await loadUser(uid);
      if (user) actorName = user.name;
    } catch {
      // Auth module may not be available
    }
  }

  const entityTitle = entity.get('title') as string || `${entityType} #${entityId}`;
  const adminEmail = process.env.SITE_EMAIL || process.env.MAIL_FROM;

  if (adminEmail) {
    await sendWorkflowTransitionEmail(adminEmail, {
      entityType,
      entityId,
      entityTitle,
      fromState: fromStateLabel,
      toState: toStateLabel,
      transitionLabel: transition.label,
      actorName,
    });
  }
}

/**
 * Get the moderation history for an entity.
 */
export async function getModerationHistory(
  entityType: string,
  entityId: number
): Promise<ModerationLogEntry[]> {
  const logKey = `moderation_log:${entityType}:${entityId}`;
  return await stateGet<ModerationLogEntry[]>(logKey, []) ?? [];
}

/**
 * Seed the default editorial workflow.
 */
export async function seedDefaultWorkflow(): Promise<void> {
  const existing = await loadWorkflow('editorial');
  if (existing) {
    // Already seeded
    return;
  }

  const editorial: Workflow = {
    id: 'editorial',
    label: 'Editorial',
    states: {
      draft: {
        id: 'draft',
        label: 'Draft',
        weight: 0,
        published: false,
      },
      review: {
        id: 'review',
        label: 'In Review',
        weight: 5,
        published: false,
      },
      published: {
        id: 'published',
        label: 'Published',
        weight: 10,
        published: true,
      },
      archived: {
        id: 'archived',
        label: 'Archived',
        weight: 15,
        published: false,
      },
    },
    transitions: {
      create_draft: {
        id: 'create_draft',
        label: 'Create New Draft',
        from: [],
        to: 'draft',
      },
      submit_for_review: {
        id: 'submit_for_review',
        label: 'Submit for Review',
        from: ['draft'],
        to: 'review',
      },
      publish: {
        id: 'publish',
        label: 'Publish',
        from: ['review', 'draft'],
        to: 'published',
      },
      archive: {
        id: 'archive',
        label: 'Archive',
        from: ['published'],
        to: 'archived',
      },
      unpublish: {
        id: 'unpublish',
        label: 'Unpublish',
        from: ['published', 'archived'],
        to: 'draft',
      },
    },
    entity_types: [],
  };

  await saveWorkflow(editorial);
}
