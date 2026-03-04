import type { Metadata } from 'next';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-server';

interface TaxonomyTerm {
  tid: number;
  vid: string;
  name: string;
  status: number;
  weight: number;
}

interface NodeTeaser {
  nid: number;
  type: string;
  title: string;
  created: number;
  status: number;
  field_body?: { value: string; summary?: string };
}

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
  const res = await apiFetch<{ data: TaxonomyTerm }>(`/api/entity/taxonomy_term/${tid}`);
  const term = res?.data;
  if (!term) return { title: 'Term not found' };
  return { title: term.name };
}

export default async function TaxonomyTermPage({ params }: { params: Promise<{ tid: string }> }) {
  const { tid } = await params;
  const termRes = await apiFetch<{ data: TaxonomyTerm }>(`/api/entity/taxonomy_term/${tid}`);
  const term = termRes?.data;

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

  // Load content tagged with this term
  const [articles, pages] = await Promise.all([
    apiFetch<{ data: NodeTeaser[] }>('/api/node/article?filter[status]=1&sort=-created&page[limit]=50'),
    apiFetch<{ data: NodeTeaser[] }>('/api/node/page?filter[status]=1&sort=-created&page[limit]=50'),
  ]);

  const all = [...(articles?.data || []), ...(pages?.data || [])];
  const nodes = all
    .filter((n: any) => {
      const tags = n.field_tags;
      if (!Array.isArray(tags)) return false;
      return tags.some((t: any) => String(t.target_id) === String(tid) || String(t) === String(tid));
    })
    .sort((a, b) => b.created - a.created);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{term.name}</h1>

      {nodes.length === 0 ? (
        <p className="text-gray-500">No content tagged with &ldquo;{term.name}&rdquo;.</p>
      ) : (
        <div>
          {nodes.map((node) => (
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
        </div>
      )}
    </div>
  );
}
