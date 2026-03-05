import Link from 'next/link';

interface PagerProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  basePath: string;
}

function pageHref(basePath: string, page: number): string {
  if (page <= 1) return basePath;
  const separator = basePath.includes('?') ? '&' : '?';
  return `${basePath}${separator}page=${page}`;
}

export default function Pager({ currentPage, totalItems, itemsPerPage, basePath }: PagerProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;

  const pages: (number | 'ellipsis')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== 'ellipsis') {
      pages.push('ellipsis');
    }
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  const linkClass = 'px-3 py-2 text-sm rounded hover:bg-gray-100 text-gin-primary no-underline';
  const disabledClass = 'px-3 py-2 text-sm rounded text-gray-400 cursor-default';
  const activeClass = 'px-3 py-2 text-sm rounded bg-gin-primary text-white font-medium no-underline';

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 mt-8 mb-4">
      {hasPrev ? (
        <Link href={pageHref(basePath, 1)} className={linkClass} aria-label="First page">
          &laquo;
        </Link>
      ) : (
        <span className={disabledClass} aria-hidden="true">&laquo;</span>
      )}

      {hasPrev ? (
        <Link href={pageHref(basePath, currentPage - 1)} className={linkClass} aria-label="Previous page">
          &lsaquo; Prev
        </Link>
      ) : (
        <span className={disabledClass} aria-hidden="true">&lsaquo; Prev</span>
      )}

      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`ellipsis-${i}`} className="px-2 py-2 text-sm text-gray-400">...</span>
        ) : p === currentPage ? (
          <span key={p} className={activeClass} aria-current="page">{p}</span>
        ) : (
          <Link key={p} href={pageHref(basePath, p)} className={linkClass}>
            {p}
          </Link>
        )
      )}

      {hasNext ? (
        <Link href={pageHref(basePath, currentPage + 1)} className={linkClass} aria-label="Next page">
          Next &rsaquo;
        </Link>
      ) : (
        <span className={disabledClass} aria-hidden="true">Next &rsaquo;</span>
      )}

      {hasNext ? (
        <Link href={pageHref(basePath, totalPages)} className={linkClass} aria-label="Last page">
          &raquo;
        </Link>
      ) : (
        <span className={disabledClass} aria-hidden="true">&raquo;</span>
      )}

      <span className="ml-4 text-sm text-gray-500">
        Page {currentPage} of {totalPages}
      </span>
    </nav>
  );
}
