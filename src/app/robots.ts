import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.SITE_URL || `http://localhost:${process.env.PORT || 3000}`;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/content/', '/people/', '/config/', '/structure/', '/extend/', '/appearance/', '/media/', '/reports/', '/roles/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
