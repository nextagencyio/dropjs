const API_BASE = `http://localhost:${process.env.PORT || 3000}`;

interface SiteConfig {
  name: string;
  slogan: string;
  mail: string;
}

interface NodeItem {
  nid: number;
  type: string;
  title: string;
  created: number;
  changed: number;
  field_body?: { value: string; summary?: string };
}

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

  let siteName = 'drop.js';
  let siteDescription = '';
  try {
    const configRes = await fetch(`${API_BASE}/api/config/site`, { cache: 'no-store' });
    if (configRes.ok) {
      const data = await configRes.json();
      siteName = data.data?.name || siteName;
      siteDescription = data.data?.slogan || '';
    }
  } catch { /* use defaults */ }

  let items: NodeItem[] = [];
  try {
    const [articles, pages] = await Promise.all([
      fetch(`${API_BASE}/api/node/article?filter[status]=1&sort=-created&page[limit]=25`, { cache: 'no-store' }).then(r => r.json()),
      fetch(`${API_BASE}/api/node/page?filter[status]=1&sort=-created&page[limit]=25`, { cache: 'no-store' }).then(r => r.json()),
    ]);
    items = [...(articles.data || []), ...(pages.data || [])];
    items.sort((a, b) => b.created - a.created);
    items = items.slice(0, 25);
  } catch { /* empty feed */ }

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
