export interface ApiResponse {
  data: unknown;
  meta?: {
    count: number;
    total: number;
    offset: number;
    limit: number;
  };
  links?: {
    self: string;
    next?: string;
    prev?: string;
  };
}

export function formatListResponse(
  data: unknown[],
  total: number,
  offset: number,
  limit: number,
  baseUrl: string
): ApiResponse {
  const response: ApiResponse = {
    data,
    meta: { count: data.length, total, offset, limit },
    links: {
      self: `${baseUrl}?page[offset]=${offset}&page[limit]=${limit}`,
    },
  };

  if (offset + limit < total) {
    response.links!.next = `${baseUrl}?page[offset]=${offset + limit}&page[limit]=${limit}`;
  }
  if (offset > 0) {
    response.links!.prev = `${baseUrl}?page[offset]=${Math.max(0, offset - limit)}&page[limit]=${limit}`;
  }

  return response;
}

export function formatSingleResponse(data: unknown): ApiResponse {
  return { data };
}
