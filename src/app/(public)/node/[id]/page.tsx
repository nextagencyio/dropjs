import type { Metadata } from 'next';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-server';
import { CommentsSection } from './comments-client';
import { EditLink } from './edit-link';

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
  field_image?: { url?: string; alt?: string; large_url?: string; medium_url?: string } | null;
  field_tags?: Array<{ target_id: number; name?: string }>;
  [key: string]: unknown;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const res = await apiFetch<{ data: NodeFull }>(`/api/entity/node/${id}`);
  const node = res?.data;

  if (!node) {
    return { title: 'Page not found' };
  }

  const description = node.field_body
    ? stripHtml(node.field_body.summary || node.field_body.value).slice(0, 160)
    : '';

  return {
    title: node.title,
    description,
    openGraph: {
      title: node.title,
      description,
      type: 'article',
      ...(node.field_image?.large_url || node.field_image?.url
        ? { images: [{ url: node.field_image.large_url || node.field_image.url! }] }
        : {}),
    },
  };
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

export default async function NodeViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await apiFetch<{ data: NodeFull }>(`/api/entity/node/${id}`);
  const node = res?.data;

  if (!node) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-semibold text-gray-700 mb-2">Page not found</h1>
        <p className="text-gray-500">The requested page could not be found.</p>
        <Link href="/front" className="text-gin-primary hover:underline mt-4 inline-block">
          &larr; Back to home
        </Link>
      </div>
    );
  }

  const imageUrl = node.field_image?.large_url || node.field_image?.url;

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
          <EditLink nid={node.nid} />
        </div>
      </header>

      {imageUrl && (
        <figure className="mb-6">
          <img
            src={imageUrl}
            alt={node.field_image?.alt || node.title}
            className="w-full max-h-[500px] object-cover rounded"
          />
          {node.field_image?.alt && (
            <figcaption className="text-sm text-gray-500 mt-2">{node.field_image.alt}</figcaption>
          )}
        </figure>
      )}

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

      <CommentsSection nodeId={node.nid} />
    </article>
  );
}
