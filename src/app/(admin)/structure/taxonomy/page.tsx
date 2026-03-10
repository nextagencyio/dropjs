import Link from 'next/link';
import { getVocabularies } from '@/lib/server/data';
import { requirePermission } from '@/lib/server/auth';
import { DeleteVocabularyButton } from './_components/taxonomy-client';

export default async function TaxonomyList() {
  await requirePermission('administer taxonomy');
  const vocabularies = await getVocabularies();

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[28px] font-normal tracking-tight text-gin-title">Taxonomy</h1>
        <Link
          href="/structure/taxonomy/add"
          className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors"
        >
          + Add vocabulary
        </Link>
      </div>

      <div className="bg-white border border-gin-border rounded-gin overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gin-bg-layer2 border-b border-gin-border-table">
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Machine name</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Description</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vocabularies.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gin-text-light">
                  No vocabularies defined.{' '}
                  <Link href="/structure/taxonomy/add" className="text-gin-primary hover:underline">Add one now</Link>.
                </td>
              </tr>
            ) : (
              vocabularies.map((vocab) => (
                <tr key={vocab.bundle} className="hover:bg-gin-bg-layer2/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gin-text border-t border-gin-border">
                    <Link
                      href={`/structure/taxonomy/${vocab.bundle}`}
                      className="text-gin-primary hover:underline font-medium"
                    >
                      {vocab.label}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gin-text border-t border-gin-border">
                    <code className="text-xs bg-gin-bg-layer2 px-1.5 py-0.5 rounded-gin-s text-gin-text">
                      {vocab.bundle}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-sm text-gin-text-light border-t border-gin-border">
                    {vocab.description || '\u2014'}
                  </td>
                  <td className="px-4 py-3 text-sm border-t border-gin-border">
                    <div className="flex gap-3">
                      <Link
                        href={`/structure/taxonomy/${vocab.bundle}`}
                        className="text-sm text-gin-primary hover:underline"
                      >
                        List terms
                      </Link>
                      <Link
                        href={`/structure/taxonomy/${vocab.bundle}/edit`}
                        className="text-sm text-gin-primary hover:underline"
                      >
                        Edit
                      </Link>
                      <DeleteVocabularyButton
                        vid={vocab.bundle}
                        label={vocab.label}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
