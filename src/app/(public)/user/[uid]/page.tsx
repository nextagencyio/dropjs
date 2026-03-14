import type { Metadata } from 'next';
import Link from 'next/link';
import { getUserProfile, listEntities } from '@/lib/server/data';

interface NodeTeaser {
  nid: number;
  type: string;
  title: string;
  status: number;
  uid: number;
  created: number;
  field_body?: { value: string; format?: string; summary?: string };
  field_image?: { url?: string; alt?: string; medium_url?: string; thumbnail_url?: string } | null;
  field_tags?: Array<{ target_id: number; name?: string }>;
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

function formatIsoDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
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

export async function generateMetadata({ params }: { params: Promise<{ uid: string }> }): Promise<Metadata> {
  const { uid } = await params;
  const user = await getUserProfile(parseInt(uid, 10));

  if (!user) {
    return { title: 'User not found' };
  }

  return {
    title: `${user.name} | User profile`,
    description: `Profile page for ${user.name}`,
  };
}

function NodeCard({ node }: { node: NodeTeaser }) {
  const hasImage = node.field_image?.url || node.field_image?.medium_url;

  return (
    <article className="border-b border-gray-200 pb-6 mb-6 last:border-0">
      <div className={hasImage ? 'flex flex-col sm:flex-row gap-4 sm:gap-6' : ''}>
        {hasImage && (
          <Link href={`/node/${node.nid}`} className="flex-shrink-0">
            <img
              src={node.field_image!.medium_url || node.field_image!.url}
              alt={node.field_image!.alt || node.title}
              className="w-full sm:w-48 h-48 sm:h-32 object-cover rounded"
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

export default async function UserProfilePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const user = await getUserProfile(parseInt(uid, 10));

  if (!user) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-semibold text-gray-700 mb-2">User not found</h1>
        <p className="text-gray-500">The requested user profile could not be found.</p>
        <Link href="/front" className="text-gin-primary hover:underline mt-4 inline-block">
          &larr; Back to home
        </Link>
      </div>
    );
  }

  const result = await listEntities('node', 'article', {
    filters: { uid: String(user.uid), status: '1' },
    sort: '-created',
    limit: 10,
  });
  const nodes = result.data as unknown as NodeTeaser[];

  return (
    <div>
      <header className="mb-8 pb-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gin-primary/10 flex items-center justify-center text-xl sm:text-2xl font-bold text-gin-primary">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Member since {formatIsoDate(user.created)}
            </p>
          </div>
        </div>
      </header>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Published content
        </h2>
        {nodes.length > 0 ? (
          nodes.map((node) => (
            <NodeCard key={`${node.type}-${node.nid}`} node={node} />
          ))
        ) : (
          <p className="text-gray-500">This user has not published any content yet.</p>
        )}
      </section>
    </div>
  );
}
