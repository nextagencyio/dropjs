'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

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

export default function TaxonomyTermPage() {
  const params = useParams();
  const tid = params.tid as string;
  const [term, setTerm] = useState<TaxonomyTerm | null>(null);
  const [nodes, setNodes] = useState<NodeTeaser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tid) return;

    async function loadTerm() {
      try {
        // Load the term
        const termRes = await fetch(`/api/entity/taxonomy_term/${tid}`);
        if (!termRes.ok) {
          setError('Term not found.');
          setLoading(false);
          return;
        }
        const termData = await termRes.json();
        const termObj = termData.data || termData;
        setTerm(termObj);

        // Load content tagged with this term
        // Search across article and page types for entities referencing this term
        const [articles, pages] = await Promise.all([
          fetch(`/api/node/article?filter[status]=1&sort=-created&page[limit]=50`).then(r => r.json()),
          fetch(`/api/node/page?filter[status]=1&sort=-created&page[limit]=50`).then(r => r.json()),
        ]);
        const all = [...(articles.data || []), ...(pages.data || [])];
        // Filter by tag reference
        const tagged = all.filter((n: any) => {
          const tags = n.field_tags;
          if (!Array.isArray(tags)) return false;
          return tags.some((t: any) => String(t.target_id) === String(tid) || String(t) === String(tid));
        });
        tagged.sort((a: NodeTeaser, b: NodeTeaser) => b.created - a.created);
        setNodes(tagged);
      } catch {
        setError('An error occurred while loading this page.');
      } finally {
        setLoading(false);
      }
    }
    loadTerm();
  }, [tid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-gin-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !term) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-semibold text-gray-700 mb-2">Term not found</h1>
        <p className="text-gray-500">{error}</p>
        <Link href="/front" className="text-gin-primary hover:underline mt-4 inline-block">
          &larr; Back to home
        </Link>
      </div>
    );
  }

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
