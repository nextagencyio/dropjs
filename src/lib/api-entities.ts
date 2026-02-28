import { apiFetch } from './api-client';

export interface FieldDefinition {
  type: string;
  label: string;
  required?: boolean;
  cardinality?: number;
  weight?: number;
  settings?: Record<string, unknown>;
}

export interface EntityTypeDefinition {
  entity_type: string;
  bundle: string;
  label: string;
  description?: string;
  fields: Record<string, FieldDefinition>;
}

export interface EntityData {
  nid?: number;
  uuid?: string;
  type?: string;
  title?: string;
  status?: boolean;
  uid?: number;
  created?: string;
  changed?: string;
  [key: string]: unknown;
}

export interface ListResponse<T> {
  data: T[];
  meta: { count: number; total: number; offset: number; limit: number };
  links: { self: string; next: string | null; prev: string | null };
}

export interface SingleResponse<T> {
  data: T;
}

export async function fetchEntityTypes(): Promise<EntityTypeDefinition[]> {
  const res = await apiFetch<{ data: EntityTypeDefinition[] }>('/entity-types');
  return res.data;
}

export async function fetchEntityList(
  entityType: string,
  bundle: string,
  params?: {
    offset?: number;
    limit?: number;
    sort?: string;
    filters?: Record<string, string>;
    search?: string;
  },
): Promise<ListResponse<EntityData>> {
  const searchParams = new URLSearchParams();

  if (params?.offset != null) searchParams.set('page[offset]', String(params.offset));
  if (params?.limit != null) searchParams.set('page[limit]', String(params.limit));
  if (params?.sort) searchParams.set('sort', params.sort);

  if (params?.filters) {
    for (const [key, value] of Object.entries(params.filters)) {
      if (value) searchParams.set(`filter[${key}]`, value);
    }
  }

  if (params?.search) {
    searchParams.set('filter[title][operator]', 'LIKE');
    searchParams.set('filter[title][value]', `%${params.search}%`);
  }

  const qs = searchParams.toString();
  return apiFetch<ListResponse<EntityData>>(
    `/${entityType}/${bundle}${qs ? `?${qs}` : ''}`,
  );
}

export async function fetchEntity(
  entityType: string,
  bundle: string,
  id: number,
): Promise<EntityData> {
  const res = await apiFetch<SingleResponse<EntityData>>(
    `/${entityType}/${bundle}/${id}`,
  );
  return res.data;
}

export async function createEntity(
  entityType: string,
  bundle: string,
  data: Record<string, unknown>,
): Promise<EntityData> {
  const res = await apiFetch<SingleResponse<EntityData>>(
    `/${entityType}/${bundle}`,
    { method: 'POST', body: JSON.stringify(data) },
  );
  return res.data;
}

export async function updateEntity(
  entityType: string,
  bundle: string,
  id: number,
  data: Record<string, unknown>,
): Promise<EntityData> {
  const res = await apiFetch<SingleResponse<EntityData>>(
    `/${entityType}/${bundle}/${id}`,
    { method: 'PATCH', body: JSON.stringify(data) },
  );
  return res.data;
}

export async function deleteEntity(
  entityType: string,
  bundle: string,
  id: number,
): Promise<void> {
  await apiFetch(`/${entityType}/${bundle}/${id}`, { method: 'DELETE' });
}

export async function createContentType(data: {
  entity_type?: string;
  bundle: string;
  label: string;
  description?: string;
}): Promise<EntityTypeDefinition> {
  const res = await apiFetch<{ data: EntityTypeDefinition }>('/entity-types', {
    method: 'POST',
    body: JSON.stringify({ entity_type: 'node', ...data }),
  });
  return res.data;
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
): Promise<unknown> {
  const res = await apiFetch<{ data: unknown }>(
    `/entity-types/${entityType}/${bundle}/fields`,
    { method: 'POST', body: JSON.stringify(field) },
  );
  return res.data;
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
): Promise<FieldDefinition & { name: string }> {
  const res = await apiFetch<{ data: FieldDefinition & { name: string } }>(
    `/entity-types/${entityType}/${bundle}/fields/${fieldName}`,
    { method: 'PATCH', body: JSON.stringify(data) },
  );
  return res.data;
}

export async function deleteField(
  entityType: string,
  bundle: string,
  fieldName: string,
): Promise<void> {
  await apiFetch(`/entity-types/${entityType}/${bundle}/fields/${fieldName}`, {
    method: 'DELETE',
  });
}

export async function reorderFields(
  entityType: string,
  bundle: string,
  order: { name: string; weight: number }[],
): Promise<void> {
  await apiFetch(`/entity-types/${entityType}/${bundle}/fields/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ order }),
  });
}

export async function fetchVocabularies(): Promise<EntityTypeDefinition[]> {
  const res = await apiFetch<{ data: EntityTypeDefinition[] }>(
    '/taxonomy/vocabularies',
  );
  return res.data;
}

export async function createVocabulary(data: {
  vid: string;
  name: string;
  description?: string;
}): Promise<EntityTypeDefinition> {
  const res = await apiFetch<{ data: EntityTypeDefinition }>(
    '/taxonomy/vocabularies',
    { method: 'POST', body: JSON.stringify(data) },
  );
  return res.data;
}

export async function deleteVocabulary(vid: string): Promise<void> {
  await apiFetch(`/taxonomy/vocabularies/${vid}`, { method: 'DELETE' });
}

export async function fetchContentType(
  entityType: string,
  bundle: string,
): Promise<EntityTypeDefinition> {
  const res = await apiFetch<{ data: EntityTypeDefinition }>(
    `/entity-types/${entityType}/${bundle}`,
  );
  return res.data;
}

export async function updateContentType(
  entityType: string,
  bundle: string,
  data: { label?: string; description?: string },
): Promise<EntityTypeDefinition> {
  const res = await apiFetch<{ data: EntityTypeDefinition }>(
    `/entity-types/${entityType}/${bundle}`,
    { method: 'PATCH', body: JSON.stringify(data) },
  );
  return res.data;
}

export async function deleteContentType(
  entityType: string,
  bundle: string,
): Promise<void> {
  await apiFetch(`/entity-types/${entityType}/${bundle}`, { method: 'DELETE' });
}

export async function fetchVocabulary(vid: string): Promise<EntityTypeDefinition> {
  const res = await apiFetch<{ data: EntityTypeDefinition }>(
    `/taxonomy/vocabularies/${vid}`,
  );
  return res.data;
}

export async function updateVocabulary(
  vid: string,
  data: { name?: string; description?: string },
): Promise<EntityTypeDefinition> {
  const res = await apiFetch<{ data: EntityTypeDefinition }>(
    `/taxonomy/vocabularies/${vid}`,
    { method: 'PATCH', body: JSON.stringify(data) },
  );
  return res.data;
}

// --- Taxonomy hierarchy API ---

export interface TermTreeNode {
  tid: number;
  title: string;
  weight: number;
  parent: number;
  status: number;
  children: TermTreeNode[];
}

export async function fetchTermTree(vid: string): Promise<TermTreeNode[]> {
  const res = await apiFetch<{ data: TermTreeNode[] }>(
    `/taxonomy/${vid}/tree`,
  );
  return res.data;
}

export async function reorderTerms(
  vid: string,
  updates: Array<{ tid: number; parent: number; weight: number }>,
): Promise<void> {
  await apiFetch(`/taxonomy/${vid}/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ updates }),
  });
}

export async function fetchTermContentCounts(
  vid: string,
): Promise<Record<number, number>> {
  const res = await apiFetch<{ data: Record<number, number> }>(
    `/taxonomy/${vid}/content-counts`,
  );
  return res.data;
}

export interface TermAncestor {
  tid: number;
  title: string;
  parent: number;
}

export async function fetchTermAncestors(
  vid: string,
  tid: number,
): Promise<TermAncestor[]> {
  const res = await apiFetch<{ data: TermAncestor[] }>(
    `/taxonomy/${vid}/term-ancestors/${tid}`,
  );
  return res.data;
}
