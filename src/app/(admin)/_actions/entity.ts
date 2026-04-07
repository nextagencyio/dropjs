'use server';

import { revalidatePath } from 'next/cache';
import { ensureInitialized } from '../../../api/init';
import { Entity } from '../../../core/entity';
import {
  registerEntityType,
  unregisterEntityType,
  getEntityTypeDefinition,
  getAllEntityTypes,
} from '../../../core/entity-type';
import { getSessionUser } from '../../../lib/server/auth';
import { userHasPermission } from '../../../auth/access';

interface ActionResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

async function requirePerm(permission: string) {
  const user = await getSessionUser();
  if (!user) return { success: false as const, error: 'Authentication required' };
  const allowed = await userHasPermission(user, permission);
  if (!allowed) return { success: false as const, error: 'Access denied' };
  return { success: true as const, user };
}

export async function createEntity(
  entityType: string,
  bundle: string,
  data: Record<string, unknown>,
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('create content');
  if (!auth.success) return auth;

  try {
    const entity = await Entity.create(entityType, bundle, {
      ...data,
      uid: auth.user.uid,
    });
    revalidatePath('/content');
    return { success: true, data: entity.toJSON() };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateEntity(
  entityType: string,
  bundle: string,
  id: number,
  data: Record<string, unknown>,
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('edit any content');
  if (!auth.success) return auth;

  try {
    const entity = await Entity.load(entityType, id);
    if (!entity) return { success: false, error: 'Entity not found' };
    for (const [key, value] of Object.entries(data)) {
      entity.set(key, value);
    }
    await entity.save();
    revalidatePath('/content');
    revalidatePath(`/node/${id}/edit`);
    if (entityType === 'taxonomy_term') {
      revalidatePath(`/structure/taxonomy/${bundle}`);
    }
    return { success: true, data: entity.toJSON() };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteEntity(
  entityType: string,
  bundle: string,
  id: number,
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('delete any content');
  if (!auth.success) return auth;

  try {
    await Entity.delete(entityType, id);
    revalidatePath('/content');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function createContentType(data: {
  entity_type?: string;
  bundle: string;
  label: string;
  description?: string;
}): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer content types');
  if (!auth.success) return auth;

  try {
    const entityType = data.entity_type ?? 'node';
    registerEntityType({
      entity_type: entityType,
      bundle: data.bundle,
      label: data.label,
      description: data.description,
      fields: {},
    });
    await Entity.ensureBaseTable(entityType);
    const def = getEntityTypeDefinition(entityType, data.bundle);
    revalidatePath('/structure/types');
    return { success: true, data: def };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteContentType(
  entityType: string,
  bundle: string,
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer content types');
  if (!auth.success) return auth;

  try {
    unregisterEntityType(entityType, bundle);
    revalidatePath('/structure/types');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function addField(
  entityType: string,
  bundle: string,
  field: {
    name: string;
    label: string;
    type: string;
    cardinality?: number;
    settings?: Record<string, unknown>;
  },
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer content types');
  if (!auth.success) return auth;

  try {
    const def = getEntityTypeDefinition(entityType, bundle);
    if (!def) return { success: false, error: 'Entity type not found' };

    def.fields[field.name] = {
      type: field.type,
      label: field.label,
      cardinality: field.cardinality,
      settings: field.settings,
    };

    registerEntityType(def);
    await Entity.ensureFieldTables(def);

    revalidatePath(`/structure/types/${entityType}/${bundle}/fields`);
    return { success: true, data: def.fields[field.name] };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateContentType(
  entityType: string,
  bundle: string,
  data: { label?: string; description?: string },
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer content types');
  if (!auth.success) return auth;

  try {
    const def = getEntityTypeDefinition(entityType, bundle);
    if (!def) return { success: false, error: 'Entity type not found' };

    if (data.label !== undefined) def.label = data.label;
    if (data.description !== undefined) def.description = data.description;

    registerEntityType(def);

    revalidatePath('/structure/types');
    revalidatePath(`/structure/types/${entityType}/${bundle}`);
    return { success: true, data: def };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateField(
  entityType: string,
  bundle: string,
  fieldName: string,
  data: {
    label?: string;
    required?: boolean;
    cardinality?: number;
    settings?: Record<string, unknown>;
  },
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer content types');
  if (!auth.success) return auth;

  try {
    const def = getEntityTypeDefinition(entityType, bundle);
    if (!def) return { success: false, error: 'Entity type not found' };

    const field = def.fields[fieldName];
    if (!field) return { success: false, error: 'Field not found' };

    if (data.label !== undefined) field.label = data.label;
    if (data.required !== undefined) field.required = data.required;
    if (data.cardinality !== undefined) field.cardinality = data.cardinality;
    if (data.settings !== undefined) field.settings = data.settings;

    registerEntityType(def);

    revalidatePath(`/structure/types/${entityType}/${bundle}/fields`);
    revalidatePath(`/structure/types/${entityType}/${bundle}/fields/${fieldName}/edit`);
    return { success: true, data: { name: fieldName, ...field } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteField(
  entityType: string,
  bundle: string,
  fieldName: string,
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer content types');
  if (!auth.success) return auth;

  try {
    const def = getEntityTypeDefinition(entityType, bundle);
    if (!def) return { success: false, error: 'Entity type not found' };

    delete def.fields[fieldName];
    registerEntityType(def);

    revalidatePath(`/structure/types/${entityType}/${bundle}/fields`);
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function loadEntityTypeDefinitionsAction(): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('access content');
  if (!auth.success) return auth;

  try {
    const types = getAllEntityTypes();
    return { success: true, data: types };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function loadEntityAction(
  entityType: string,
  id: number,
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('access content');
  if (!auth.success) return auth;

  try {
    const entity = await Entity.load(entityType, id);
    if (!entity) return { success: false, error: 'Entity not found' };
    return { success: true, data: entity.toJSON() };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function createPreviewAction(
  entityType: string,
  bundle: string,
  data: Record<string, unknown>,
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('access content');
  if (!auth.success) return auth;

  try {
    const { createPreview } = await import('../../../core/preview');
    const id = await createPreview(entityType, bundle, data, auth.user.uid ?? 0);
    return { success: true, data: { id } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function searchEntitiesAction(
  entityType: string,
  bundle: string,
  search: string,
  limit = 10,
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('access content');
  if (!auth.success) return auth;

  try {
    const query = Entity.query(entityType);
    query.condition('type', bundle);
    if (search) {
      query.condition('title', `%${search}%`, 'LIKE');
    }
    query.range(0, limit);
    const ids = await query.execute();
    const entities = await Promise.all(
      ids.map((id) => Entity.load(entityType, id)),
    );
    const data = entities
      .filter((e): e is NonNullable<typeof e> => e !== null)
      .map((e) => e.toJSON());
    return { success: true, data };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function restoreRevision(
  nid: number,
  vid: number,
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('edit any content');
  if (!auth.success) return auth;

  try {
    const entity = await Entity.revertToRevision('node', nid, vid);
    revalidatePath('/content');
    revalidatePath(`/node/${nid}/edit`);
    revalidatePath(`/node/${nid}/revisions`);
    return { success: true, data: entity.toJSON() };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function cancelSchedule(
  entityType: string,
  entityId: number,
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('edit any content');
  if (!auth.success) return auth;

  try {
    const { cancelScheduledTransition } = await import('../../../core/scheduler');
    const cancelled = await cancelScheduledTransition(entityType, entityId);
    if (!cancelled) return { success: false, error: 'No schedule found for this entity' };
    revalidatePath('/content/scheduled');
    revalidatePath(`/node/${entityId}/edit`);
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function setSchedule(
  entityType: string,
  entityId: number,
  transition: 'publish' | 'unpublish',
  scheduledDate: string,
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('edit any content');
  if (!auth.success) return auth;

  try {
    const { scheduleTransition } = await import('../../../core/scheduler');
    const entry = await scheduleTransition(entityType, entityId, transition, scheduledDate, auth.user.uid);
    revalidatePath('/content/scheduled');
    revalidatePath(`/node/${entityId}/edit`);
    return { success: true, data: entry };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function reorderFields(
  entityType: string,
  bundle: string,
  order: { name: string; weight: number }[],
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer content types');
  if (!auth.success) return auth;

  try {
    const def = getEntityTypeDefinition(entityType, bundle);
    if (!def) return { success: false, error: 'Entity type not found' };

    for (const item of order) {
      if (def.fields[item.name]) {
        def.fields[item.name].weight = item.weight;
      }
    }
    registerEntityType(def);

    revalidatePath(`/structure/types/${entityType}/${bundle}/fields`);
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── Manage Display ──────────────────────────────────────────────────

export async function saveViewDisplayAction(
  entityType: string,
  bundle: string,
  mode: string,
  fields: Record<string, { label: string; formatter: string; weight: number; visible: boolean; formatter_settings?: Record<string, unknown> }>,
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer content types');
  if (!auth.success) return auth;

  try {
    const { saveViewDisplay, getOrCreateViewDisplay } = await import('../../../core/display-modes');
    const existing = await getOrCreateViewDisplay(entityType, bundle, mode);

    for (const [name, update] of Object.entries(fields)) {
      existing.fields[name] = {
        field: name,
        label: update.label as 'above' | 'inline' | 'hidden' | 'visually_hidden',
        formatter: update.formatter,
        formatter_settings: update.formatter_settings ?? {},
        weight: update.weight,
        visible: update.visible,
      };
    }

    await saveViewDisplay(existing);
    revalidatePath(`/structure/types/${entityType}/${bundle}/display`);
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── Content Export ──────────────────────────────────────────────────

export async function exportContentAction(
  bundle: string,
): Promise<ActionResult<string>> {
  await ensureInitialized();
  const auth = await requirePerm('administer nodes');
  if (!auth.success) return auth;

  try {
    const { EntityQuery } = await import('../../../core/entity-query');
    const query = new EntityQuery('node');
    query.condition('type', bundle);
    query.sort('nid', 'ASC');
    const ids = await query.execute();

    const entities: Record<string, unknown>[] = [];
    for (const id of ids) {
      const entity = await Entity.load('node', id);
      if (entity) {
        const data = entity.toJSON();
        // Remove internal-only fields
        delete data.uuid;
        delete data.default_langcode;
        delete data.revision_translation_affected;
        entities.push(data);
      }
    }

    return { success: true, data: JSON.stringify(entities, null, 2) };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── Content Import ──────────────────────────────────────────────────

export async function importContentAction(
  jsonStr: string,
): Promise<ActionResult<{ created: number; errors: string[] }>> {
  await ensureInitialized();
  const auth = await requirePerm('administer nodes');
  if (!auth.success) return auth;

  try {
    const items = JSON.parse(jsonStr);
    if (!Array.isArray(items)) {
      return { success: false, error: 'JSON must be an array of entities' };
    }

    let created = 0;
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const bundle = item.type;
        if (!bundle) {
          errors.push(`Item ${i}: missing "type" field`);
          continue;
        }

        const def = getEntityTypeDefinition('node', bundle);
        if (!def) {
          errors.push(`Item ${i}: unknown content type "${bundle}"`);
          continue;
        }

        const title = item.title;
        if (!title) {
          errors.push(`Item ${i}: missing "title" field`);
          continue;
        }

        // Collect field values (skip base fields)
        const baseFields = new Set(['nid', 'vid', 'type', 'title', 'status', 'uid', 'created', 'changed', 'promote', 'sticky', 'langcode']);
        const fieldData: Record<string, unknown> = { title };

        if (item.status !== undefined) fieldData.status = item.status;
        if (item.promote !== undefined) fieldData.promote = item.promote;
        if (item.sticky !== undefined) fieldData.sticky = item.sticky;

        for (const [key, val] of Object.entries(item)) {
          if (!baseFields.has(key) && key.startsWith('field_')) {
            fieldData[key] = val;
          }
        }

        await Entity.create('node', bundle, {
          ...fieldData,
          uid: auth.user?.uid ?? 1,
        });
        created++;
      } catch (err) {
        errors.push(`Item ${i}: ${(err as Error).message}`);
      }
    }

    revalidatePath('/content');
    return { success: true, data: { created, errors } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
