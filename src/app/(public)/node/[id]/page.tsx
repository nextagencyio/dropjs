'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

interface NodeFull {
  nid: number;
  type: string;
  title: string;
  status: number;
  uid: number;
  created: number;
  changed: number;
  langcode: string;
  field_body?: { value: string; format?: string; summary?: string };
  field_image?: { url?: string; alt?: string } | null;
  field_tags?: Array<{ target_id: number; name?: string }>;
  [key: string]: unknown;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NodeViewPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const [node, setNode] = useState<NodeFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function loadNode() {
      try {
        const res = await fetch(`/api/entity/node/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('The requested page could not be found.');
          } else if (res.status === 403) {
            setError('You are not authorized to view this content.');
          } else {
            setError('An error occurred while loading this page.');
          }
          return;
        }
        const data = await res.json();
        setNode(data.data || data);
      } catch {
        setError('An error occurred while loading this page.');
      } finally {
        setLoading(false);
      }
    }
    loadNode();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-gin-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !node) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-semibold text-gray-700 mb-2">Page not found</h1>
        <p className="text-gray-500">{error || 'The requested page could not be found.'}</p>
        <Link href="/front" className="text-gin-primary hover:underline mt-4 inline-block">
          &larr; Back to home
        </Link>
      </div>
    );
  }

  return (
    <article>
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{node.title}</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <time>{formatDate(node.created)}</time>
          {node.type && (
            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600 capitalize">
              {node.type}
            </span>
          )}
          {user && (
            <Link
              href={`/node/${node.nid}/edit`}
              className="text-gin-primary hover:underline"
            >
              Edit
            </Link>
          )}
        </div>
      </header>

      {node.field_body?.value && (
        <div
          className="prose prose-gray max-w-none"
          dangerouslySetInnerHTML={{ __html: node.field_body.value }}
        />
      )}

      {node.field_tags && node.field_tags.length > 0 && (
        <footer className="mt-8 pt-4 border-t border-gray-200">
          <span className="text-sm text-gray-500 mr-2">Tags:</span>
          {node.field_tags.map((tag, i) => (
            <Link
              key={tag.target_id || i}
              href={`/taxonomy/term/${tag.target_id}`}
              className="inline-block mr-2 mb-1 px-2 py-0.5 bg-gray-100 rounded text-sm text-gray-700 hover:bg-gray-200 no-underline"
            >
              {tag.name || `Term ${tag.target_id}`}
            </Link>
          ))}
        </footer>
      )}
    </article>
  );
}
