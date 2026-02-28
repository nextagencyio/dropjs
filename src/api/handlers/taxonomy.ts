import type { Request, Response } from '../types.js';
import {
  Entity,
  registerEntityType,
  getEntityTypeDefinition,
  getEntityTypesForType,
  getAllEntityTypes,
  unregisterEntityType,
  createLogger,
} from '../../core/index.js';
import { db } from '../../db/index.js';
import { fieldTableName } from '../../field/index.js';
import { ValidationError, NotFoundError, BadRequestError } from '../errors.js';

const logger = createLogger('api:taxonomy');

const VID_REGEX = /^[a-z][a-z0-9_]*$/;
const MAX_VID_LENGTH = 32;

function validateVid(vid: string): void {
  if (!vid || typeof vid !== 'string') {
    throw new ValidationError('Vocabulary ID (vid) is required');
  }
  if (vid.length > MAX_VID_LENGTH) {
    throw new ValidationError(`Vocabulary ID must be ${MAX_VID_LENGTH} characters or fewer`);
  }
  if (!VID_REGEX.test(vid)) {
    throw new ValidationError(
      'Vocabulary ID must start with a lowercase letter and contain only lowercase alphanumeric characters and underscores'
    );
  }
}

export async function listVocabularies(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const vocabularies = getEntityTypesForType('taxonomy_term');
    res.json({ data: vocabularies });
  } catch (err) {
    logger.error('Failed to list vocabularies', { error: (err as Error).message });
    res.status(500).json({ error: `Failed to list vocabularies: ${(err as Error).message}` });
  }
}

export async function createVocabulary(
  req: Request,
  res: Response
): Promise<void> {
  const { vid, name, description } = req.body ?? {};

  if (!name || typeof name !== 'string') {
    throw new ValidationError('Vocabulary name is required');
  }
  if (!vid || typeof vid !== 'string') {
    throw new ValidationError('Vocabulary ID (vid) is required');
  }

  validateVid(vid);

  // Check if already exists — return existing definition for idempotency
  const existing = getEntityTypeDefinition('taxonomy_term', vid);
  if (existing) {
    // Update name/description if provided (upsert behavior)
    if (name) existing.label = name;
    if (description !== undefined) existing.description = description || undefined;
    try {
      registerEntityType(existing);
    } catch {
      // ignore re-register errors
    }
    res.status(200).json({ data: existing });
    return;
  }

  const definition = {
    entity_type: 'taxonomy_term',
    bundle: vid,
    label: name,
    description: description || undefined,
    fields: {},
  };

  try {
    registerEntityType(definition);

    // Ensure tables exist
    await Entity.ensureBaseTable('taxonomy_term');
    await Entity.ensureFieldTables(definition);
  } catch (err) {
    logger.error('Failed to create vocabulary', { error: (err as Error).message });
    res.status(500).json({ error: `Failed to create vocabulary: ${(err as Error).message}` });
    return;
  }

  res.status(201).json({ data: definition });
}

export async function updateVocabulary(
  req: Request,
  res: Response
): Promise<void> {
  const { vid } = req.params;
  const { name, description } = req.body ?? {};

  const definition = getEntityTypeDefinition('taxonomy_term', vid);
  if (!definition) {
    throw new NotFoundError(`Vocabulary "${vid}" not found`);
  }

  if (name !== undefined) definition.label = name;
  if (description !== undefined) definition.description = description || undefined;

  try {
    registerEntityType(definition);
  } catch (err) {
    logger.error('Failed to update vocabulary', { error: (err as Error).message });
    res.status(500).json({ error: `Failed to update vocabulary: ${(err as Error).message}` });
    return;
  }

  res.json({ data: definition });
}

export async function deleteVocabulary(
  req: Request,
  res: Response
): Promise<void> {
  const { vid } = req.params;

  const definition = getEntityTypeDefinition('taxonomy_term', vid);
  if (!definition) {
    throw new NotFoundError(`Vocabulary "${vid}" not found`);
  }

  try {
    // Delete all taxonomy terms belonging to this vocabulary before removing it
    const termIds = await Entity.query('taxonomy_term')
      .condition('type', vid)
      .execute();

    for (const termId of termIds) {
      await Entity.delete('taxonomy_term', termId);
    }

    unregisterEntityType('taxonomy_term', vid);
  } catch (err) {
    logger.error('Failed to delete vocabulary', { error: (err as Error).message });
    res.status(500).json({ error: `Failed to delete vocabulary: ${(err as Error).message}` });
    return;
  }

  res.status(204).send();
}

interface TreeNode {
  tid: number;
  title: string;
  weight: number;
  parent: number;
  status: number;
  children: TreeNode[];
}

/**
 * GET /api/taxonomy/:vid/tree
 * Returns a nested tree of taxonomy terms for the given vocabulary.
 */
export async function getTermTree(
  req: Request,
  res: Response
): Promise<void> {
  const { vid } = req.params;

  const definition = getEntityTypeDefinition('taxonomy_term', vid);
  if (!definition) {
    throw new NotFoundError(`Vocabulary "${vid}" not found`);
  }

  // Fetch all terms for this vocabulary with their parent info
  const rows = await db
    .select('taxonomy_term_field_data', 'tfd')
    .fields('tfd', ['tid', 'name', 'weight', 'status'])
    .leftJoin('taxonomy_term__parent', 'tp', 'tfd.tid = tp.entity_id')
    .fields('tp', ['parent_target_id'])
    .condition('tfd.type', vid)
    .condition('tfd.langcode', 'en')
    .orderBy('tfd.weight', 'ASC')
    .orderBy('tfd.name', 'ASC')
    .execute<{
      tid: number;
      name: string;
      weight: number;
      status: number;
      parent_target_id: number | null;
    }>();

  // Build tree structure
  const byId = new Map<number, TreeNode>();
  for (const row of rows) {
    byId.set(row.tid, {
      tid: row.tid,
      title: row.name,
      weight: row.weight,
      parent: row.parent_target_id ?? 0,
      status: row.status,
      children: [],
    });
  }

  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parent === 0 || !byId.has(node.parent)) {
      roots.push(node);
    } else {
      byId.get(node.parent)!.children.push(node);
    }
  }

  // Sort children by weight then title at each level
  function sortChildren(nodes: TreeNode[]): void {
    nodes.sort((a, b) => a.weight - b.weight || a.title.localeCompare(b.title));
    for (const node of nodes) {
      sortChildren(node.children);
    }
  }
  sortChildren(roots);

  res.json({ data: roots });
}

/**
 * PATCH /api/taxonomy/:vid/reorder
 * Update parent and weight for one or more terms in a single call.
 * Body: { updates: [{ tid, parent, weight }] }
 */
export async function reorderTerms(
  req: Request,
  res: Response
): Promise<void> {
  const { vid } = req.params;

  const definition = getEntityTypeDefinition('taxonomy_term', vid);
  if (!definition) {
    throw new NotFoundError(`Vocabulary "${vid}" not found`);
  }

  const { updates } = req.body ?? {};
  if (!Array.isArray(updates) || updates.length === 0) {
    throw new BadRequestError('updates array is required');
  }

  for (const update of updates) {
    const { tid, parent, weight } = update;
    if (typeof tid !== 'number') {
      throw new BadRequestError('Each update must have a numeric tid');
    }

    // Update weight in taxonomy_term_field_data
    if (typeof weight === 'number') {
      await db
        .update('taxonomy_term_field_data')
        .set({ weight })
        .condition('tid', tid)
        .condition('langcode', 'en')
        .execute();
    }

    // Update parent in taxonomy_term__parent
    if (typeof parent === 'number') {
      await db
        .update('taxonomy_term__parent')
        .set({ parent_target_id: parent })
        .condition('entity_id', tid)
        .execute();
    }
  }

  res.json({ message: 'ok', updated: updates.length });
}

/**
 * GET /api/taxonomy/:vid/content-counts
 * Returns { data: { [tid]: count } } mapping each term id to the number
 * of content entities referencing it via entity_reference fields.
 */
export async function getTermContentCounts(
  req: Request,
  res: Response
): Promise<void> {
  const { vid } = req.params;

  const definition = getEntityTypeDefinition('taxonomy_term', vid);
  if (!definition) {
    throw new NotFoundError(`Vocabulary "${vid}" not found`);
  }

  // Get all term IDs for this vocabulary
  const termRows = await db
    .select('taxonomy_term_field_data')
    .fields(['tid'])
    .condition('type', vid)
    .condition('langcode', 'en')
    .execute<{ tid: number }>();

  const termIds = termRows.map((r) => r.tid);
  if (termIds.length === 0) {
    res.json({ data: {} });
    return;
  }

  // Find all entity_reference fields that target taxonomy terms
  const allTypes = getAllEntityTypes();
  const counts: Record<number, number> = {};
  for (const tid of termIds) counts[tid] = 0;

  for (const typeDef of allTypes) {
    for (const [fieldName, fieldDef] of Object.entries(typeDef.fields)) {
      if (
        fieldDef.type === 'entity_reference' &&
        fieldDef.settings?.target_type === 'taxonomy_term'
      ) {
        const table = fieldTableName(typeDef.entity_type, fieldName);
        try {
          const rows = await db
            .select(table)
            .fields([`${fieldName}_target_id`])
            .condition(`${fieldName}_target_id`, termIds, 'IN')
            .execute<Record<string, number>>();

          for (const row of rows) {
            const refTid = row[`${fieldName}_target_id`];
            if (refTid && counts[refTid] !== undefined) {
              counts[refTid]++;
            }
          }
        } catch {
          // Table may not exist yet, skip
        }
      }
    }
  }

  res.json({ data: counts });
}

/**
 * GET /api/taxonomy/:vid/term-ancestors/:tid
 * Returns the full ancestor chain from root to the given term.
 * Response: { data: [{ tid, title, parent }, ...] } ordered from root to term.
 */
export async function getTermAncestors(
  req: Request,
  res: Response
): Promise<void> {
  const { vid, tid: tidParam } = req.params;
  const tid = parseInt(tidParam, 10);
  if (isNaN(tid)) {
    throw new BadRequestError('Invalid tid');
  }

  const definition = getEntityTypeDefinition('taxonomy_term', vid);
  if (!definition) {
    throw new NotFoundError(`Vocabulary "${vid}" not found`);
  }

  // Walk up the parent chain
  const ancestors: Array<{ tid: number; title: string; parent: number }> = [];
  let currentTid = tid;
  const visited = new Set<number>();

  while (currentTid > 0 && !visited.has(currentTid)) {
    visited.add(currentTid);

    const rows = await db
      .select('taxonomy_term_field_data', 'tfd')
      .fields('tfd', ['tid', 'name'])
      .leftJoin('taxonomy_term__parent', 'tp', 'tfd.tid = tp.entity_id')
      .fields('tp', ['parent_target_id'])
      .condition('tfd.tid', currentTid)
      .condition('tfd.langcode', 'en')
      .execute<{ tid: number; name: string; parent_target_id: number | null }>();

    if (rows.length === 0) break;

    const row = rows[0];
    ancestors.unshift({
      tid: row.tid,
      title: row.name,
      parent: row.parent_target_id ?? 0,
    });
    currentTid = row.parent_target_id ?? 0;
  }

  res.json({ data: ancestors });
}
