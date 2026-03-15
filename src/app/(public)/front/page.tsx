import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getSiteConfig, getPublishedNodes, type PublishedNode } from '@/lib/server/data';
import Pager from '@/components/pager';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const siteName = config?.name || 'drop.js';
  const slogan = config?.slogan || '';

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

function getTeaser(node: PublishedNode): string {
  const body = node.field_body;
  if (!body) return '';
  if (body.summary) return stripHtml(body.summary);
  const plain = stripHtml(body.value);
  return plain.length > 300 ? plain.slice(0, 300) + '...' : plain;
}

function NodeCard({ node }: { node: PublishedNode }) {
  const hasImage = node.field_image?.url || node.field_image?.medium_url;

  return (
    <article className="border-b border-gray-200 pb-6 mb-6 last:border-0">
      <div className={hasImage ? 'flex flex-col sm:flex-row gap-4 sm:gap-6' : ''}>
        {hasImage && (
          <Link href={`/node/${node.nid}`} className="flex-shrink-0 relative w-full sm:w-48 h-48 sm:h-32">
            <Image
              src={node.field_image!.medium_url || node.field_image!.url!}
              alt={node.field_image!.alt || node.title}
              fill
              sizes="(max-width: 640px) 100vw, 192px"
              className="object-cover rounded"
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

const ITEMS_PER_PAGE = 10;

export default async function FrontPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam || '1', 10) || 1);
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  const [articles, pages] = await Promise.all([
    getPublishedNodes({ bundles: ['article'], promote: true, limit: ITEMS_PER_PAGE, offset }),
    getPublishedNodes({ bundles: ['page'], promote: true, limit: ITEMS_PER_PAGE, offset }),
  ]);

  const totalItems = articles.total + pages.total;

  const nodes = [...articles.data, ...pages.data];
  nodes.sort((a, b) => {
    if (a.sticky !== b.sticky) return b.sticky - a.sticky;
    return b.created - a.created;
  });

  if (nodes.length === 0 && currentPage === 1) {
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
      <Pager
        currentPage={currentPage}
        totalItems={totalItems}
        itemsPerPage={ITEMS_PER_PAGE}
        basePath="/front"
      />
    </div>
  );
}
