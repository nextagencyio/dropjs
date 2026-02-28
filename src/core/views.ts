/**
 * Views — Configurable list builder for DropJS.
 *
 * Inspired by Drupal's Views module. A View defines a query against entity
 * storage with configurable filters, sorts, fields to display, and pagination.
 * Views are stored in config as `views.view.<id>`.
 */

import { Entity, EntityQuery, getEntityTypeDefinition, getAllEntityTypes } from './index.js';
import { loadConfig, saveConfig, loadAllConfig, deleteConfig } from './config-storage.js';
import { fieldTableName } from '../field/index.js';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ViewFilter {
  field: string;
  operator: '=' | '!=' | '<' | '<=' | '>' | '>=' | 'IN' | 'NOT IN' | 'LIKE' | 'BETWEEN';
  value: unknown;
  /** If true, the value comes from a query parameter at runtime */
  exposed?: boolean;
  /** Query parameter name when exposed */
  expose_identifier?: string;
  /** Label shown in the exposed filter form */
  expose_label?: string;
}

export interface ViewSort {
  field: string;
  direction: 'ASC' | 'DESC';
  /** If true, the user can change sort direction at runtime */
  exposed?: boolean;
}

export interface ViewField {
  field: string;
  label?: string;
  /** Formatter hint for the admin UI (e.g. 'default', 'date', 'link') */
  formatter?: string;
}

export interface ViewDefinition {
  id: string;
  label: string;
  description?: string;
  /** Entity type to query (e.g. 'node', 'taxonomy_term') */
  entity_type: string;
  /** Limit to a specific bundle, or null for all bundles */
  bundle?: string | null;
  /** Fields to include in the result. Empty = full entity */
  display_fields: ViewField[];
  filters: ViewFilter[];
  sorts: ViewSort[];
  /** Items per page. 0 = unlimited */
  pager: number;
  /** Whether the view is enabled */
  status: boolean;
}

export interface ViewResult {
  data: Record<string, unknown>[];
  meta: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

// ── CRUD for View definitions ─────────────────────────────────────────────

const VIEW_CONFIG_PREFIX = 'views.view.';

export async function saveView(view: ViewDefinition): Promise<void> {
  await saveConfig(`${VIEW_CONFIG_PREFIX}${view.id}`, view as unknown as Record<string, unknown>);
}

export async function loadView(id: string): Promise<ViewDefinition | null> {
  const data = await loadConfig(`${VIEW_CONFIG_PREFIX}${id}`);
  return data as ViewDefinition | null;
}

export async function listViews(): Promise<ViewDefinition[]> {
  const all = await loadAllConfig(VIEW_CONFIG_PREFIX);
  return Object.values(all) as unknown as ViewDefinition[];
}

export async function deleteView(id: string): Promise<boolean> {
  const configName = `${VIEW_CONFIG_PREFIX}${id}`;
  const existing = await loadConfig(configName);
  if (!existing) return false;
  await deleteConfig(configName);
  return true;
}

// ── View Executor ─────────────────────────────────────────────────────────

function getBaseTable(entityType: string): { table: string; idField: string } {
  if (entityType === 'node') return { table: 'node_field_data', idField: 'nid' };
  if (entityType === 'taxonomy_term') return { table: 'taxonomy_term_field_data', idField: 'tid' };
  return { table: entityType, idField: 'nid' };
}

function getBaseFields(entityType: string): string[] {
  if (entityType === 'node') {
    return ['nid', 'vid', 'uuid', 'type', 'title', 'status', 'uid', 'created', 'changed', 'langcode', 'promote', 'sticky'];
  }
  if (entityType === 'taxonomy_term') {
    return ['tid', 'vid', 'type', 'langcode', 'name', 'title', 'status', 'changed', 'weight'];
  }
  return ['nid', 'uuid', 'type', 'title', 'status', 'uid', 'created', 'changed'];
}

function mapColumnName(entityType: string, field: string): string {
  if (entityType === 'taxonomy_term' && field === 'title') return 'name';
  return field;
}

/**
 * Execute a View definition with optional runtime parameters.
 *
 * @param view The view definition
 * @param params Runtime parameters — exposed filter values, page number, sort overrides
 */
export async function executeView(
  view: ViewDefinition,
  params: {
    page?: number;
    exposed?: Record<string, unknown>;
    sort_field?: string;
    sort_direction?: 'ASC' | 'DESC';
  } = {}
): Promise<ViewResult> {
  const { table, idField } = getBaseTable(view.entity_type);
  const baseFieldNames = getBaseFields(view.entity_type);
  const page = Math.max(0, (params.page ?? 1) - 1);
  const pageSize = view.pager > 0 ? view.pager : 1000;

  // Build query using EntityQuery for counting
  let query = Entity.query(view.entity_type);

  // Bundle filter
  if (view.bundle) {
    query = query.condition('type', view.bundle);
  }

  // Apply filters
  for (const filter of view.filters) {
    let value = filter.value;

    if (filter.exposed && filter.expose_identifier && params.exposed) {
      const exposedVal = params.exposed[filter.expose_identifier];
      if (exposedVal === undefined || exposedVal === '' || exposedVal === null) {
        // Skip this filter if exposed value is not provided
        continue;
      }
      value = exposedVal;
    }

    query = query.condition(filter.field, value, filter.operator as any);
  }

  // Get total count
  const allIds = await query.execute();
  const total = allIds.length;

  // Rebuild query with sorts and pagination
  let listQuery = Entity.query(view.entity_type);
  if (view.bundle) {
    listQuery = listQuery.condition('type', view.bundle);
  }
  for (const filter of view.filters) {
    let value = filter.value;
    if (filter.exposed && filter.expose_identifier && params.exposed) {
      const exposedVal = params.exposed[filter.expose_identifier];
      if (exposedVal === undefined || exposedVal === '' || exposedVal === null) continue;
      value = exposedVal;
    }
    listQuery = listQuery.condition(filter.field, value, filter.operator as any);
  }

  // Apply sorts — check for exposed sort override first
  if (params.sort_field) {
    listQuery = listQuery.sort(params.sort_field, params.sort_direction ?? 'ASC');
  } else {
    for (const sort of view.sorts) {
      listQuery = listQuery.sort(sort.field, sort.direction);
    }
  }

  // Pagination
  listQuery = listQuery.range(page * pageSize, pageSize);

  const ids = await listQuery.execute();
  const entities = await Entity.loadMultiple(view.entity_type, ids);

  // Apply field selection if display_fields are specified
  let data: Record<string, unknown>[];
  if (view.display_fields.length > 0) {
    const wantedFields = view.display_fields.map((f) => f.field);
    data = entities.map((e) => {
      const json = e.toJSON();
      const filtered: Record<string, unknown> = {
        [idField]: json[idField],
        type: json.type,
      };
      for (const f of wantedFields) {
        if (f in json) filtered[f] = json[f];
      }
      return filtered;
    });
  } else {
    data = entities.map((e) => e.toJSON());
  }

  const totalPages = view.pager > 0 ? Math.ceil(total / pageSize) : 1;

  return {
    data,
    meta: {
      total,
      page: page + 1,
      page_size: pageSize,
      total_pages: totalPages,
    },
  };
}

// ── Default views ─────────────────────────────────────────────────────────

export function getDefaultViews(): ViewDefinition[] {
  return [
    {
      id: 'content',
      label: 'Content',
      description: 'All published content',
      entity_type: 'node',
      bundle: null,
      display_fields: [
        { field: 'title', label: 'Title' },
        { field: 'type', label: 'Content type' },
        { field: 'status', label: 'Status' },
        { field: 'uid', label: 'Author' },
        { field: 'changed', label: 'Updated' },
      ],
      filters: [
        {
          field: 'status',
          operator: '=',
          value: 1,
          exposed: true,
          expose_identifier: 'status',
          expose_label: 'Published',
        },
        {
          field: 'type',
          operator: '=',
          value: '',
          exposed: true,
          expose_identifier: 'type',
          expose_label: 'Content type',
        },
        {
          field: 'title',
          operator: 'LIKE',
          value: '',
          exposed: true,
          expose_identifier: 'title',
          expose_label: 'Title contains',
        },
      ],
      sorts: [{ field: 'changed', direction: 'DESC' }],
      pager: 25,
      status: true,
    },
    {
      id: 'taxonomy_terms',
      label: 'Taxonomy terms',
      description: 'All taxonomy terms',
      entity_type: 'taxonomy_term',
      bundle: null,
      display_fields: [
        { field: 'title', label: 'Name' },
        { field: 'type', label: 'Vocabulary' },
        { field: 'weight', label: 'Weight' },
      ],
      filters: [
        {
          field: 'type',
          operator: '=',
          value: '',
          exposed: true,
          expose_identifier: 'vocabulary',
          expose_label: 'Vocabulary',
        },
      ],
      sorts: [{ field: 'weight', direction: 'ASC' }, { field: 'title', direction: 'ASC' }],
      pager: 50,
      status: true,
    },
    {
      id: 'recent_content',
      label: 'Recent content',
      description: 'Most recently changed content',
      entity_type: 'node',
      bundle: null,
      display_fields: [
        { field: 'title', label: 'Title' },
        { field: 'type', label: 'Type' },
        { field: 'changed', label: 'Updated' },
      ],
      filters: [
        { field: 'status', operator: '=', value: 1 },
      ],
      sorts: [{ field: 'changed', direction: 'DESC' }],
      pager: 10,
      status: true,
    },
  ];
}
