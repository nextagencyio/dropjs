import { getEntityType, listEntities } from '@/lib/server/data';
import { TermAddForm } from './term-add-form';

interface EntityData {
  nid?: number;
  title?: string;
  parent?: unknown;
  [key: string]: unknown;
}

function buildHierarchy(terms: EntityData[]): Array<{ nid: number; title: string; _depth: number }> {
  const byId = new Map<number, EntityData>();
  for (const term of terms) {
    if (term.nid != null) byId.set(term.nid, term);
  }

  const roots: EntityData[] = [];
  const childrenMap = new Map<number, EntityData[]>();
  for (const term of terms) {
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

export default async function TaxonomyTermAddPage({
  params,
}: {
  params: Promise<{ vocabulary: string }>;
}) {
  const { vocabulary } = await params;

  const [vocabDef, termResult] = await Promise.all([
    getEntityType('taxonomy_term', vocabulary),
    listEntities('taxonomy_term', vocabulary, { limit: 200, sort: 'weight' }),
  ]);
  const vocabLabel = vocabDef?.label ?? vocabulary;
  const availableTerms = buildHierarchy(termResult.data);

  return (
    <TermAddForm
      vocabulary={vocabulary}
      vocabLabel={vocabLabel}
      availableTerms={availableTerms}
    />
  );
}
