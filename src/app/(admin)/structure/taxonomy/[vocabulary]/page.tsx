import Link from 'next/link';
import { getVocabularies, getTermTree, getTermContentCounts } from '@/lib/server/data';
import { requirePermission } from '@/lib/server/auth';
import { TermTreeClient } from './_components/term-tree-client';

export default async function TaxonomyTermList({
  params,
}: {
  params: Promise<{ vocabulary: string }>;
}) {
  await requirePermission('administer taxonomy');
  const { vocabulary } = await params;

  const [vocabs, tree, contentCounts] = await Promise.all([
    getVocabularies(),
    getTermTree(vocabulary),
    getTermContentCounts(vocabulary),
  ]);

  const vocabDef = vocabs.find((v) => v.bundle === vocabulary);

  return (
    <div>
      <div className="mb-5">
        <Link
          href="/structure/taxonomy"
          className="text-sm text-gin-primary hover:underline"
        >
          Taxonomy
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">
          {vocabDef?.label ?? vocabulary}
        </span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[28px] font-normal tracking-tight text-gin-title">
          {vocabDef?.label ?? vocabulary} &mdash; Terms
        </h1>
        <Link
          href={`/structure/taxonomy/${vocabulary}/add`}
          className="px-4 py-2 bg-gin-primary text-white text-sm font-medium rounded-gin-s hover:bg-gin-primary-hover transition-colors"
        >
          + Add term
        </Link>
      </div>

      <TermTreeClient
        vocabulary={vocabulary}
        vocabLabel={vocabDef?.label ?? vocabulary}
        initialTree={tree}
        initialContentCounts={contentCounts}
      />
    </div>
  );
}
