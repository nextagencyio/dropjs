import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Public-facing breadcrumbs with JSON-LD structured data for SEO.
 */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: item.href } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-gray-500">
        <ol className="flex items-center gap-1 flex-wrap">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-gray-300">/</span>}
              {item.href && i < items.length - 1 ? (
                <Link href={item.href} className="hover:text-gin-primary transition-colors no-underline">
                  {item.label}
                </Link>
              ) : (
                <span className={i === items.length - 1 ? 'text-gray-700 font-medium' : ''}>
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
