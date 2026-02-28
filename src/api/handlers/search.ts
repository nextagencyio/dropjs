import type { Request, Response } from '../types.js';
import { Entity, getAllEntityTypes, searchIndex, isFtsAvailable } from '../../core/index.js';
import { BadRequestError } from '../errors.js';

export async function handleSearch(
  req: Request,
  res: Response
): Promise<void> {
  const q = (req.query.q as string ?? '').trim();
  if (!q || q.length < 2) {
    throw new BadRequestError('Search query "q" must be at least 2 characters');
  }

  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  const typeFilter = req.query.type as string | undefined;
  const bundleFilter = req.query.bundle as string | undefined;

  // Try FTS5 first, fall back to LIKE
  if (isFtsAvailable()) {
    const ftsResults = await searchIndex(q, {
      entityType: typeFilter,
      bundle: bundleFilter,
      limit,
    });

    if (ftsResults.length > 0) {
      res.json({
        data: ftsResults.map((r) => ({
          entity_type: r.entity_type,
          bundle: r.bundle,
          id: r.entity_id,
          title: r.title,
          status: true,
          changed: 0,
        })),
        meta: {
          query: q,
          total: ftsResults.length,
          engine: 'fts5',
        },
      });
      return;
    }
    // If FTS5 returned nothing, fall through to LIKE search
  }

  // LIKE-based search fallback
  const allTypes = getAllEntityTypes();
  const results: Array<{
    entity_type: string;
    bundle: string;
    id: number;
    title: string;
    status: boolean;
    changed: number;
  }> = [];

  // Search nodes
  const nodeTypes = allTypes.filter((t) => t.entity_type === 'node');
  if (!typeFilter || typeFilter === 'node') {
    for (const typeDef of nodeTypes) {
      if (bundleFilter && typeDef.bundle !== bundleFilter) continue;

      const query = Entity.query('node')
        .condition('type', typeDef.bundle)
        .condition('title', `%${q}%`, 'LIKE')
        .range(0, limit);

      // Anonymous users only see published content
      const user = (req as any).user;
      if (!user) {
        query.condition('status', 1);
      }

      const ids = await query.execute();
      const entities = await Entity.loadMultiple('node', ids);

      for (const entity of entities) {
        const json = entity.toJSON();
        results.push({
          entity_type: 'node',
          bundle: typeDef.bundle,
          id: json.nid as number,
          title: json.title as string,
          status: Boolean(json.status),
          changed: json.changed as number,
        });
      }
    }
  }

  // Search taxonomy terms
  const taxTypes = allTypes.filter((t) => t.entity_type === 'taxonomy_term');
  if (!typeFilter || typeFilter === 'taxonomy_term') {
    for (const typeDef of taxTypes) {
      if (bundleFilter && typeDef.bundle !== bundleFilter) continue;

      const query = Entity.query('taxonomy_term')
        .condition('type', typeDef.bundle)
        .condition('title', `%${q}%`, 'LIKE')
        .range(0, limit);

      const ids = await query.execute();
      const entities = await Entity.loadMultiple('taxonomy_term', ids);

      for (const entity of entities) {
        const json = entity.toJSON();
        results.push({
          entity_type: 'taxonomy_term',
          bundle: typeDef.bundle,
          id: json.tid as number,
          title: (json.name as string) ?? (json.title as string),
          status: true,
          changed: json.changed as number,
        });
      }
    }
  }

  // Sort by changed desc
  results.sort((a, b) => (b.changed ?? 0) - (a.changed ?? 0));
  const trimmed = results.slice(0, limit);

  res.json({
    data: trimmed,
    meta: {
      query: q,
      total: trimmed.length,
      engine: 'like',
    },
  });
}
