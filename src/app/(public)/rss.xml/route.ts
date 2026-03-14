import { getSiteConfig, getPublishedNodes } from '@/lib/server/data';

export const revalidate = 300;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  const config = await getSiteConfig();
  const siteName = config?.name || 'drop.js';
  const siteDescription = config?.slogan || '';

  const result = await getPublishedNodes({ bundles: ['article', 'page'], limit: 25 });
  const items = [...result.data].sort((a, b) => b.created - a.created).slice(0, 25);

  const rssItems = items.map((node) => {
    const link = `${origin}/node/${node.nid}`;
    const pubDate = new Date(node.created * 1000).toUTCString();
    const description = node.field_body
      ? escapeXml(stripHtml(node.field_body.summary || node.field_body.value).slice(0, 500))
      : '';

    return `    <item>
      <title>${escapeXml(node.title)}</title>
      <link>${link}</link>
      <guid>${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${origin}/front</link>
    <description>${escapeXml(siteDescription)}</description>
    <language>en</language>
    <atom:link href="${origin}/rss.xml" rel="self" type="application/rss+xml"/>
${rssItems}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
