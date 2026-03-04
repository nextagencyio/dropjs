import type { MetadataRoute } from 'next';

const API_BASE = `http://localhost:${process.env.PORT || 3000}`;

interface NodeItem {
  nid: number;
  type: string;
  changed: number;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.SITE_URL || `http://localhost:${process.env.PORT || 3000}`;

  const entries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/front`, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/search`, changeFrequency: 'weekly', priority: 0.5 },
  ];

  // Add all published nodes
  try {
    const [articles, pages] = await Promise.all([
      fetch(`${API_BASE}/api/node/article?filter[status]=1&sort=-changed&page[limit]=1000`, { cache: 'no-store' }).then(r => r.json()),
      fetch(`${API_BASE}/api/node/page?filter[status]=1&sort=-changed&page[limit]=1000`, { cache: 'no-store' }).then(r => r.json()),
    ]);
    const nodes: NodeItem[] = [...(articles.data || []), ...(pages.data || [])];
    for (const node of nodes) {
      entries.push({
        url: `${baseUrl}/node/${node.nid}`,
        lastModified: new Date(node.changed * 1000),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  } catch { /* skip nodes */ }

  // Add taxonomy terms
  try {
    const termsRes = await fetch(`${API_BASE}/api/taxonomy_term/tags?page[limit]=500`, { cache: 'no-store' });
    if (termsRes.ok) {
      const terms = await termsRes.json();
      for (const term of (terms.data || [])) {
        entries.push({
          url: `${baseUrl}/taxonomy/term/${term.tid}`,
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      }
    }
  } catch { /* skip terms */ }

  return entries;
}
