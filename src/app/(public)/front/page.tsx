'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface NodeTeaser {
  nid: number;
  type: string;
  title: string;
  status: number;
  uid: number;
  created: number;
  promote: number;
  sticky: number;
  field_body?: { value: string; format?: string; summary?: string };
  field_image?: { url?: string; alt?: string } | null;
}

interface ApiResponse {
  data: NodeTeaser[];
  meta?: { total: number };
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

function getTeaser(node: NodeTeaser): string {
  const body = node.field_body;
  if (!body) return '';
  if (body.summary) return stripHtml(body.summary);
  const plain = stripHtml(body.value);
  return plain.length > 300 ? plain.slice(0, 300) + '...' : plain;
}

function NodeCard({ node }: { node: NodeTeaser }) {
  return (
    <article className="border-b border-gray-200 pb-6 mb-6 last:border-0">
      <h2 className="text-xl font-semibold mb-1">
        <Link href={`/node/${node.nid}`} className="text-gin-primary hover:underline no-underline">
          {node.title}
        </Link>
      </h2>
      <div className="text-sm text-gray-500 mb-2">
        {formatDate(node.created)}
        {node.type && (
          <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600 capitalize">
            {node.type}
          </span>
        )}
      </div>
      {getTeaser(node) && (
        <p className="text-gray-700 leading-relaxed">{getTeaser(node)}</p>
      )}
      <Link href={`/node/${node.nid}`} className="text-sm text-gin-primary hover:underline mt-2 inline-block">
        Read more &rarr;
      </Link>
    </article>
  );
}

export default function FrontPage() {
  const [nodes, setNodes] = useState<NodeTeaser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContent() {
      try {
        // Load promoted articles and pages
        const [articles, pages] = await Promise.all([
          fetch('/api/node/article?filter[status]=1&filter[promote]=1&sort=-sticky,-created&page[limit]=10').then(r => r.json()) as Promise<ApiResponse>,
          fetch('/api/node/page?filter[status]=1&filter[promote]=1&sort=-sticky,-created&page[limit]=10').then(r => r.json()) as Promise<ApiResponse>,
        ]);
        const all = [...(articles.data || []), ...(pages.data || [])];
        all.sort((a, b) => {
          if (a.sticky !== b.sticky) return b.sticky - a.sticky;
          return b.created - a.created;
        });
        setNodes(all);
      } catch {
        // Silently handle fetch errors
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-gin-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-semibold text-gray-700 mb-2">Welcome to DropJS</h1>
        <p className="text-gray-500">No published content yet. <Link href="/login" className="text-gin-primary hover:underline">Log in</Link> to create your first content.</p>
      </div>
    );
  }

  return (
    <div>
      {nodes.map((node) => (
        <NodeCard key={`${node.type}-${node.nid}`} node={node} />
      ))}
    </div>
  );
}
