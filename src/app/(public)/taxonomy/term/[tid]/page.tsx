import type { Metadata } from 'next';
import Link from 'next/link';
import { loadEntity, getNodesByTag, type EntityData } from '@/lib/server/data';
import Pager from '@/components/pager';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function generateMetadata({ params }: { params: Promise<{ tid: string }> }): Promise<Metadata> {
  const { tid } = await params;
  const term = await loadEntity('taxonomy_term', parseInt(tid, 10));
  if (!term) return { title: 'Term not found' };
  return { title: (term as any).name ?? (term as any).title ?? 'Term' };
}

const ITEMS_PER_PAGE = 20;

export default async function TaxonomyTermPage({ params, searchParams }: { params: Promise<{ tid: string }>; searchParams: Promise<{ page?: string }> }) {
  const { tid } = await params;
  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam || '1', 10) || 1);

  const term = await loadEntity('taxonomy_term', parseInt(tid, 10));

  if (!term) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-semibold text-gray-700 mb-2">Term not found</h1>
        <p className="text-gray-500">The requested term could not be found.</p>
        <Link href="/front" className="text-gin-primary hover:underline mt-4 inline-block">
          &larr; Back to home
        </Link>
      </div>
    );
  }

  const termName = (term as any).name ?? (term as any).title ?? 'Term';

  const allNodes = await getNodesByTag(parseInt(tid, 10));
  allNodes.sort((a: any, b: any) => (b.created ?? 0) - (a.created ?? 0));

  const totalItems = allNodes.length;
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const nodes = allNodes.slice(offset, offset + ITEMS_PER_PAGE);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{termName}</h1>

      {nodes.length === 0 && currentPage === 1 ? (
        <p className="text-gray-500">No content tagged with &ldquo;{termName}&rdquo;.</p>
      ) : (
        <div>
          {nodes.map((node: any) => (
            <article key={node.nid} className="border-b border-gray-200 pb-6 mb-6 last:border-0">
              <h2 className="text-xl font-semibold mb-1">
                <Link href={`/node/${node.nid}`} className="text-gin-primary hover:underline no-underline">
                  {node.title}
                </Link>
              </h2>
              <div className="text-sm text-gray-500 mb-2">
                {formatDate(node.created)}
                <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600 capitalize">
                  {node.type}
                </span>
              </div>
              {node.field_body?.value && (
                <p className="text-gray-700">
                  {stripHtml(node.field_body.summary || node.field_body.value).slice(0, 300)}
                  {stripHtml(node.field_body.value).length > 300 ? '...' : ''}
                </p>
              )}
            </article>
          ))}
          <Pager
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            basePath={`/taxonomy/term/${tid}`}
          />
        </div>
      )}
    </div>
  );
}
