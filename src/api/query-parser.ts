export interface ParsedQuery {
  fields?: string[];
  filters: ParsedFilter[];
  sorts: ParsedSort[];
  page: { offset: number; limit: number };
  include?: string[];
}

export interface ParsedFilter {
  field: string;
  value: unknown;
  operator: string;
}

export interface ParsedSort {
  field: string;
  direction: 'ASC' | 'DESC';
}

const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 200;

export function parseQueryParams(
  query: Record<string, unknown>
): ParsedQuery {
  const result: ParsedQuery = {
    filters: [],
    sorts: [],
    page: { offset: 0, limit: DEFAULT_PAGE_LIMIT },
  };

  // ?fields=title,body
  if (typeof query.fields === 'string') {
    result.fields = query.fields
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);
  }

  // ?filter[status]=1
  // ?filter[field][operator]=IN&filter[field][value]=1,5
  if (query.filter && typeof query.filter === 'object') {
    for (const [key, val] of Object.entries(
      query.filter as Record<string, unknown>
    )) {
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        const obj = val as Record<string, string>;
        const operator = obj.operator ?? '=';
        let value: unknown = obj.value;
        if (
          (operator === 'IN' || operator === 'NOT IN') &&
          typeof value === 'string'
        ) {
          value = value.split(',').map((v) => v.trim());
        }
        result.filters.push({ field: key, value, operator });
      } else {
        // Simple: ?filter[status]=1
        result.filters.push({ field: key, value: val, operator: '=' });
      }
    }
  }

  // ?sort=-created,title
  if (typeof query.sort === 'string') {
    result.sorts = query.sort
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        if (s.startsWith('-')) {
          return { field: s.slice(1), direction: 'DESC' as const };
        }
        return { field: s, direction: 'ASC' as const };
      });
  }

  // ?page[offset]=0&page[limit]=10
  if (query.page && typeof query.page === 'object') {
    const pg = query.page as Record<string, string>;
    if (pg.offset !== undefined) {
      result.page.offset = Math.max(0, parseInt(pg.offset, 10) || 0);
    }
    if (pg.limit !== undefined) {
      result.page.limit = Math.min(
        MAX_PAGE_LIMIT,
        Math.max(1, parseInt(pg.limit, 10) || DEFAULT_PAGE_LIMIT)
      );
    }
  }

  // ?include=field_tags,field_category
  if (typeof query.include === 'string') {
    result.include = query.include
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);
  }

  return result;
}
