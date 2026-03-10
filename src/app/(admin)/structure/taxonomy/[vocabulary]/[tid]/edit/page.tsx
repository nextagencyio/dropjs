import { notFound } from 'next/navigation';
import { getEntityType, loadEntity, listEntities, getTermAncestors } from '@/lib/server/data';
import { TermEditForm } from './term-edit-form';

interface EntityData {
  nid?: number;
  title?: string;
  parent?: unknown;
  [key: string]: unknown;
}

function buildHierarchy(terms: EntityData[], excludeTid: number): Array<{ nid: number; title: string; _depth: number }> {
  const filtered = terms.filter((t) => t.nid !== excludeTid);
  const byId = new Map<number, EntityData>();
  for (const term of filtered) {
    if (term.nid != null) byId.set(term.nid, term);
  }

  const roots: EntityData[] = [];
  const childrenMap = new Map<number, EntityData[]>();
  for (const term of filtered) {
    const parentId = (term.parent as number) ?? 0;
    if (parentId === 0 || !byId.has(parentId)) {
      roots.push(term);
    } else {
      const siblings = childrenMap.get(parentId) ?? [];
      siblings.push(term);
      childrenMap.set(parentId, siblings);
    }
  }

  const result: Array<{ nid: number; title: string; _depth: number }> = [];
  function walk(term: EntityData, depth: number) {
    result.push({ nid: term.nid!, title: (term.title as string) ?? '', _depth: depth });
    for (const child of childrenMap.get(term.nid!) ?? []) {
      walk(child, depth + 1);
    }
  }
  for (const root of roots) walk(root, 0);
  return result;
}

export default async function TaxonomyTermEditPage({
  params,
}: {
  params: Promise<{ vocabulary: string; tid: string }>;
}) {
  const { vocabulary, tid } = await params;
  const termId = parseInt(tid, 10);

  const [vocabDef, entity, termResult, ancestors] = await Promise.all([
    getEntityType('taxonomy_term', vocabulary),
    loadEntity('taxonomy_term', termId),
    listEntities('taxonomy_term', vocabulary, { limit: 200, sort: 'weight' }),
    getTermAncestors(vocabulary, termId),
  ]);

  const vocabLabel = vocabDef?.label ?? vocabulary;

  if (!entity) notFound();

  const initialData = {
    title: (entity.title as string) ?? '',
    description: (entity.description__value as string) ?? '',
    weight: (entity.weight as number) ?? 0,
    parent: (entity.parent as number) ?? 0,
    published: Boolean(entity.status),
  };

  const availableTerms = buildHierarchy(termResult.data, termId);

  return (
    <TermEditForm
      vocabulary={vocabulary}
      vocabLabel={vocabLabel}
      tid={termId}
      initialData={initialData}
      availableTerms={availableTerms}
      ancestors={ancestors}
    />
  );
}
