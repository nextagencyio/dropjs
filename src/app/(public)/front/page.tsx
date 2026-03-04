import type { Metadata } from 'next';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-server';

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
  field_image?: { url?: string; alt?: string; medium_url?: string; thumbnail_url?: string } | null;
  field_tags?: Array<{ target_id: number; name?: string }>;
}

interface ApiResponse {
  data: NodeTeaser[];
  meta?: { total: number };
}

interface SiteConfig {
  name: string;
  slogan: string;
}

export async function generateMetadata(): Promise<Metadata> {
  const configRes = await apiFetch<{ data: SiteConfig }>('/api/config/site');
  const siteName = configRes?.data?.name || 'drop.js';
  const slogan = configRes?.data?.slogan || '';

  return {
    title: slogan ? `${siteName} — ${slogan}` : siteName,
    description: slogan || `Welcome to ${siteName}`,
  };
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
  const hasImage = node.field_image?.url || node.field_image?.medium_url;

  return (
    <article className="border-b border-gray-200 pb-6 mb-6 last:border-0">
      <div className={hasImage ? 'flex gap-6' : ''}>
        {hasImage && (
          <Link href={`/node/${node.nid}`} className="flex-shrink-0">
            <img
              src={node.field_image!.medium_url || node.field_image!.url}
              alt={node.field_image!.alt || node.title}
              className="w-48 h-32 object-cover rounded"
              loading="lazy"
            />
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold mb-1">
            <Link href={`/node/${node.nid}`} className="text-gin-primary hover:underline no-underline">
              {node.title}
            </Link>
          </h2>
          <div className="text-sm text-gray-500 mb-2 flex items-center gap-2 flex-wrap">
            <time>{formatDate(node.created)}</time>
            {node.type && (
              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600 capitalize">
                {node.type}
              </span>
            )}
          </div>
          {getTeaser(node) && (
            <p className="text-gray-700 leading-relaxed">{getTeaser(node)}</p>
          )}
          {node.field_tags && node.field_tags.length > 0 && (
            <div className="mt-2 flex gap-1 flex-wrap">
              {node.field_tags.map((tag, i) => (
                <Link
                  key={tag.target_id || i}
                  href={`/taxonomy/term/${tag.target_id}`}
                  className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600 hover:bg-gray-200 no-underline"
                >
                  {tag.name || `Tag ${tag.target_id}`}
                </Link>
              ))}
            </div>
          )}
          <Link href={`/node/${node.nid}`} className="text-sm text-gin-primary hover:underline mt-2 inline-block">
            Read more &rarr;
          </Link>
        </div>
      </div>
    </article>
  );
}

export default async function FrontPage() {
  const [articles, pages] = await Promise.all([
    apiFetch<ApiResponse>('/api/node/article?filter[status]=1&filter[promote]=1&sort=-sticky,-created&page[limit]=10'),
    apiFetch<ApiResponse>('/api/node/page?filter[status]=1&filter[promote]=1&sort=-sticky,-created&page[limit]=10'),
  ]);

  const nodes = [...(articles?.data || []), ...(pages?.data || [])];
  nodes.sort((a, b) => {
    if (a.sticky !== b.sticky) return b.sticky - a.sticky;
    return b.created - a.created;
  });

  if (nodes.length === 0) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-semibold text-gray-700 mb-2">Welcome to drop.js</h1>
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
