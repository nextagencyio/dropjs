import type { MetadataRoute } from 'next';
import { getPublishedNodes, getTaxonomyTerms } from '@/lib/server/data';

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.SITE_URL || `http://localhost:${process.env.PORT || 3000}`;

  const entries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/front`, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/search`, changeFrequency: 'weekly', priority: 0.5 },
  ];

  // Add all published nodes
  try {
    const result = await getPublishedNodes({ bundles: ['article', 'page'], limit: 1000 });
    for (const node of result.data) {
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
    const terms = await getTaxonomyTerms('tags');
    for (const term of terms) {
      entries.push({
        url: `${baseUrl}/taxonomy/term/${term.tid}`,
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  } catch { /* skip terms */ }

  return entries;
}
