'use server';

import { searchContent, type SearchResultItem } from '../../../lib/server/data';

export async function searchAction(
  query: string,
  limit: number = 50
): Promise<{ data: SearchResultItem[]; meta: { query: string; total: number; engine: string } }> {
  if (!query || query.trim().length < 2) {
    return { data: [], meta: { query, total: 0, engine: '' } };
  }
  return searchContent(query.trim(), limit);
}
