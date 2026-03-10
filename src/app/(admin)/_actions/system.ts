'use server';

import { revalidatePath } from 'next/cache';
import { ensureInitialized } from '../../../api/init';
import { getSessionUser } from '../../../lib/server/auth';
import { userHasPermission } from '../../../auth/access';
import { saveConfig, loadConfig } from '../../../core/config-storage';
import {
  createAlias as coreCreateAlias,
  deleteAlias as coreDeleteAlias,
} from '../../../core/url-alias';
import {
  createWebhook as coreCreateWebhook,
  updateWebhook as coreUpdateWebhook,
  deleteWebhook as coreDeleteWebhook,
} from '../../../core/webhooks';
import {
  saveView as coreSaveView,
  deleteView as coreDeleteView,
  type ViewDefinition,
} from '../../../core/views';
import {
  saveBlockPlacement as coreSaveBlockPlacement,
  deleteBlockPlacement as coreDeleteBlockPlacement,
} from '../../../core/blocks';
import {
  installModule,
  uninstallModule,
  getModule,
} from '../../../core/module-loader';
import { db } from '../../../db/index';

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

// ── Site Config ─────────────────────────────────────────────────────

export async function updateSiteConfig(data: {
  name?: string;
  slogan?: string;
  mail?: string;
  front_page?: string;
}): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer site configuration');
  if (!auth.success) return auth;

  try {
    const existing = await loadConfig('system.site') ?? {};
    const current = typeof existing === 'string' ? JSON.parse(existing) : existing;
    const updated = { ...current, ...data };
    await saveConfig('system.site', updated);
    revalidatePath('/config/site');
    return { success: true, data: updated };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── Text Formats ────────────────────────────────────────────────────

export async function createTextFormat(data: {
  id: string;
  label: string;
  allowed_tags?: string;
}): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer filters');
  if (!auth.success) return auth;

  try {
    await saveConfig(`filter.format.${data.id}`, {
      label: data.label,
      weight: 0,
      allowed_tags: data.allowed_tags ?? '',
    });
    revalidatePath('/config/text-formats');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteTextFormat(id: string): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer filters');
  if (!auth.success) return auth;

  try {
    const { deleteConfig } = await import('../../../core/config-storage');
    await deleteConfig(`filter.format.${id}`);
    revalidatePath('/config/text-formats');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── Image Styles ────────────────────────────────────────────────────

export async function createImageStyle(data: {
  id: string;
  label: string;
  effects?: unknown[];
}): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer image styles');
  if (!auth.success) return auth;

  try {
    await saveConfig(`image.style.${data.id}`, {
      label: data.label,
      effects: data.effects ?? [],
    });
    revalidatePath('/config/image-styles');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteImageStyle(id: string): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer image styles');
  if (!auth.success) return auth;

  try {
    const { deleteConfig } = await import('../../../core/config-storage');
    await deleteConfig(`image.style.${id}`);
    revalidatePath('/config/image-styles');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── URL Aliases ─────────────────────────────────────────────────────

export async function createAlias(data: {
  path: string;
  alias: string;
  langcode?: string;
}): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer url aliases');
  if (!auth.success) return auth;

  try {
    const alias = await coreCreateAlias(data.path, data.alias, data.langcode);
    revalidatePath('/config/url-aliases');
    return { success: true, data: alias };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteAlias(id: number): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer url aliases');
  if (!auth.success) return auth;

  try {
    await coreDeleteAlias(id);
    revalidatePath('/config/url-aliases');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── Webhooks ────────────────────────────────────────────────────────

export async function createWebhook(data: {
  url: string;
  events: string[];
  secret?: string;
  active?: boolean;
}): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer site configuration');
  if (!auth.success) return auth;

  try {
    const webhook = await coreCreateWebhook(data);
    revalidatePath('/config/webhooks');
    return { success: true, data: webhook };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteWebhook(id: number): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer site configuration');
  if (!auth.success) return auth;

  try {
    await coreDeleteWebhook(id);
    revalidatePath('/config/webhooks');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── Views ───────────────────────────────────────────────────────────

export async function saveView(data: ViewDefinition): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer views');
  if (!auth.success) return auth;

  try {
    await coreSaveView(data);
    revalidatePath('/structure/views');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteView(id: string): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer views');
  if (!auth.success) return auth;

  try {
    await coreDeleteView(id);
    revalidatePath('/structure/views');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── Block Placements ────────────────────────────────────────────────

export async function saveBlockPlacement(data: any): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer blocks');
  if (!auth.success) return auth;

  try {
    await coreSaveBlockPlacement(data);
    revalidatePath('/structure/blocks');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteBlockPlacement(id: string): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer blocks');
  if (!auth.success) return auth;

  try {
    await coreDeleteBlockPlacement(id);
    revalidatePath('/structure/blocks');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── Modules ─────────────────────────────────────────────────────────

export async function enableModule(name: string): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer modules');
  if (!auth.success) return auth;

  try {
    const mod = getModule(name);
    if (mod) {
      await installModule(mod);
    }
    revalidatePath('/extend');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function disableModule(name: string): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer modules');
  if (!auth.success) return auth;

  try {
    await uninstallModule(name);
    revalidatePath('/extend');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}


// ── Logs ────────────────────────────────────────────────────────────

export async function clearLogs(): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('access site reports');
  if (!auth.success) return auth;

  try {
    const { getConnection } = await import('../../../db/index');
    const conn = getConnection();
    await conn('watchdog').del();
    revalidatePath('/reports/logs');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── Menus ───────────────────────────────────────────────────────────

export async function createMenu(data: {
  id: string;
  label: string;
  description?: string;
}): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer menu');
  if (!auth.success) return auth;

  try {
    await saveConfig(`system.menu.${data.id}`, {
      id: data.id,
      label: data.label,
      description: data.description ?? '',
    });
    revalidatePath('/structure/menus');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteMenu(menuId: string): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer menu');
  if (!auth.success) return auth;

  try {
    const { deleteConfig } = await import('../../../core/config-storage');
    await deleteConfig(`system.menu.${menuId}`);
    // Also delete menu items
    const { getConnection } = await import('../../../db/index');
    const conn = getConnection();
    await conn('menu_link_content').where('menu_name', menuId).del();
    revalidatePath('/structure/menus');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── Menu Items ──────────────────────────────────────────────────────

export async function addMenuItemAction(menuId: string, data: {
  title: string;
  url: string;
  weight?: number;
  parent?: string | null;
  enabled?: boolean;
  description?: string;
}): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer menu');
  if (!auth.success) return auth;

  try {
    const config = await loadConfig('system.menus');
    let menus: any[] = [];
    if (config && typeof config === 'object' && Array.isArray((config as any).menus)) {
      menus = (config as any).menus;
    }
    const menu = menus.find((m: any) => m.id === menuId);
    if (!menu) return { success: false, error: `Menu "${menuId}" not found` };

    const id = `${menuId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const item = {
      id,
      title: data.title,
      url: data.url,
      weight: data.weight ?? 0,
      parent: data.parent ?? null,
      enabled: data.enabled ?? true,
      expanded: false,
      description: data.description,
    };
    menu.items.push(item);
    await saveConfig('system.menus', { menus });
    revalidatePath(`/structure/menus/${menuId}`);
    return { success: true, data: item };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateMenuItemAction(menuId: string, itemId: string, data: {
  title?: string;
  url?: string;
  weight?: number;
  enabled?: boolean;
}): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer menu');
  if (!auth.success) return auth;

  try {
    const config = await loadConfig('system.menus');
    let menus: any[] = [];
    if (config && typeof config === 'object' && Array.isArray((config as any).menus)) {
      menus = (config as any).menus;
    }
    const menu = menus.find((m: any) => m.id === menuId);
    if (!menu) return { success: false, error: `Menu "${menuId}" not found` };

    const item = menu.items.find((i: any) => i.id === itemId);
    if (!item) return { success: false, error: `Menu item "${itemId}" not found` };

    if (data.title !== undefined) item.title = data.title;
    if (data.url !== undefined) item.url = data.url;
    if (data.weight !== undefined) item.weight = data.weight;
    if (data.enabled !== undefined) item.enabled = data.enabled;

    await saveConfig('system.menus', { menus });
    revalidatePath(`/structure/menus/${menuId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteMenuItemAction(menuId: string, itemId: string): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer menu');
  if (!auth.success) return auth;

  try {
    const config = await loadConfig('system.menus');
    let menus: any[] = [];
    if (config && typeof config === 'object' && Array.isArray((config as any).menus)) {
      menus = (config as any).menus;
    }
    const menu = menus.find((m: any) => m.id === menuId);
    if (!menu) return { success: false, error: `Menu "${menuId}" not found` };

    const idx = menu.items.findIndex((i: any) => i.id === itemId);
    if (idx === -1) return { success: false, error: `Menu item "${itemId}" not found` };

    menu.items.splice(idx, 1);
    await saveConfig('system.menus', { menus });
    revalidatePath(`/structure/menus/${menuId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── View Update ─────────────────────────────────────────────────────

export async function updateViewAction(id: string, data: {
  label?: string;
  description?: string;
  pager?: number;
  status?: boolean;
}): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer views');
  if (!auth.success) return auth;

  try {
    const { loadView, saveView: coreSave } = await import('../../../core/views');
    const view = await loadView(id);
    if (!view) return { success: false, error: `View "${id}" not found` };

    if (data.label !== undefined) view.label = data.label;
    if (data.description !== undefined) view.description = data.description;
    if (data.pager !== undefined) view.pager = data.pager;
    if (data.status !== undefined) view.status = data.status;

    await coreSave(view);
    revalidatePath(`/structure/views/${id}`);
    revalidatePath('/structure/views');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── View Execute (preview) ──────────────────────────────────────────

export async function executeViewAction(id: string): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer views');
  if (!auth.success) return auth;

  try {
    const { loadView, executeView } = await import('../../../core/views');
    const view = await loadView(id);
    if (!view) return { success: false, error: `View "${id}" not found` };

    const result = await executeView(view);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── Taxonomy Vocabulary ─────────────────────────────────────────────

export async function createVocabulary(data: {
  vid: string;
  name: string;
  description?: string;
}): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer taxonomy');
  if (!auth.success) return auth;

  try {
    const { registerEntityType } = await import('../../../core/entity-type');
    const { Entity } = await import('../../../core/entity');
    const { saveTaxonomyVocabularyConfig } = await import('../../../core/config-storage');

    registerEntityType({
      entity_type: 'taxonomy_term',
      bundle: data.vid,
      label: data.name,
      description: data.description,
      fields: {},
    });
    await Entity.ensureBaseTable('taxonomy_term');
    await saveTaxonomyVocabularyConfig(data.vid, data.name, data.description);

    revalidatePath('/structure/taxonomy');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateVocabulary(
  vid: string,
  data: { name?: string; description?: string },
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer taxonomy');
  if (!auth.success) return auth;

  try {
    const { getEntityTypeDefinition, registerEntityType } = await import('../../../core/entity-type');
    const { saveTaxonomyVocabularyConfig } = await import('../../../core/config-storage');

    const def = getEntityTypeDefinition('taxonomy_term', vid);
    if (!def) return { success: false, error: 'Vocabulary not found' };

    if (data.name !== undefined) def.label = data.name;
    if (data.description !== undefined) def.description = data.description;

    registerEntityType(def);
    await saveTaxonomyVocabularyConfig(vid, def.label, def.description);

    revalidatePath('/structure/taxonomy');
    revalidatePath(`/structure/taxonomy/${vid}`);
    return { success: true, data: def };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteVocabulary(vid: string): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer taxonomy');
  if (!auth.success) return auth;

  try {
    const { unregisterEntityType } = await import('../../../core/entity-type');
    unregisterEntityType('taxonomy_term', vid);
    revalidatePath('/structure/taxonomy');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── Taxonomy Terms ─────────────────────────────────────────────────

export async function reorderTerms(
  vid: string,
  updates: Array<{ tid: number; parent: number; weight: number }>,
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer taxonomy');
  if (!auth.success) return auth;

  try {
    const { getConnection } = await import('../../../db/index');
    const conn = getConnection();
    for (const u of updates) {
      await conn('taxonomy_term_field_data')
        .where('tid', u.tid)
        .update({ weight: u.weight });
      // Update parent
      const existing = await conn('taxonomy_term__parent')
        .where('entity_id', u.tid)
        .first();
      if (existing) {
        await conn('taxonomy_term__parent')
          .where('entity_id', u.tid)
          .update({ parent_target_id: u.parent });
      } else {
        await conn('taxonomy_term__parent').insert({
          entity_id: u.tid,
          parent_target_id: u.parent,
        });
      }
    }
    revalidatePath(`/structure/taxonomy/${vid}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteTerm(
  vid: string,
  tid: number,
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer taxonomy');
  if (!auth.success) return auth;

  try {
    const { Entity } = await import('../../../core/entity');
    await Entity.delete('taxonomy_term', tid);
    revalidatePath(`/structure/taxonomy/${vid}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── Views (create) ─────────────────────────────────────────────────

export async function createView(data: {
  id: string;
  label: string;
  entity_type: string;
}): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer views');
  if (!auth.success) return auth;

  try {
    await coreSaveView({
      id: data.id,
      label: data.label,
      entity_type: data.entity_type,
      status: true,
      display_fields: [],
      filters: [],
      sorts: [],
      pager: 25,
    } as ViewDefinition);
    revalidatePath('/structure/views');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── Block Placement (toggle status) ────────────────────────────────

export async function toggleBlockPlacementStatus(
  id: string,
): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer blocks');
  if (!auth.success) return auth;

  try {
    const { loadBlockPlacement: loadBP, saveBlockPlacement: saveBP } = await import('../../../core/blocks');
    const placement = await loadBP(id);
    if (!placement) return { success: false, error: 'Block placement not found' };
    await saveBP({ ...placement, status: !placement.status });
    revalidatePath('/structure/blocks');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── Field Groups ───────────────────────────────────────────────────

export async function createFieldGroup(data: {
  entityType: string;
  bundle: string;
  viewMode: string;
  name: string;
  label: string;
  format: string;
  parent?: string;
  description?: string;
  open?: boolean;
}): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer content types');
  if (!auth.success) return auth;

  try {
    const { saveFieldGroup } = await import('../../../core/field-group');
    await saveFieldGroup({
      entity_type: data.entityType,
      bundle: data.bundle,
      view_mode: data.viewMode,
      name: data.name,
      label: data.label,
      format: data.format as any,
      parent: data.parent || undefined,
      weight: 0,
      fields: [],
      settings: { description: data.description ?? '', open: data.open ?? false } as any,
    });
    revalidatePath('/structure/field-groups');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteFieldGroup(data: {
  entityType: string;
  bundle: string;
  viewMode: string;
  groupId: string;
}): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer content types');
  if (!auth.success) return auth;

  try {
    const { deleteFieldGroup: coreDeleteFG } = await import('../../../core/field-group');
    await coreDeleteFG(data.entityType, data.bundle, data.viewMode, data.groupId);
    revalidatePath('/structure/field-groups');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── Paragraph Types ────────────────────────────────────────────────

export async function createParagraphType(data: {
  id: string;
  label: string;
  fields?: Array<{ name: string; type: string; label: string; required: boolean }>;
}): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer content types');
  if (!auth.success) return auth;

  try {
    const { registerParagraphType } = await import('../../../core/paragraphs');
    await registerParagraphType({
      id: data.id,
      label: data.label,
      description: '',
      fields: data.fields ?? {},
    } as any);
    revalidatePath('/structure/paragraphs');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteParagraphType(id: string): Promise<ActionResult> {
  await ensureInitialized();
  const auth = await requirePerm('administer content types');
  if (!auth.success) return auth;

  try {
    const { deleteParagraphType: coreDeletePT } = await import('../../../core/paragraphs');
    await coreDeletePT(id);
    revalidatePath('/structure/paragraphs');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
