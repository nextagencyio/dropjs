'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ChevronRight, ExternalLink } from 'lucide-react';
import { AdminToolbar } from './admin-toolbar';
import { useAuth } from '@/lib/auth-context';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gin-bg-app">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-gin-primary animate-spin" />
          <p className="text-sm text-gin-text-light">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Build breadcrumb from path (usePathname doesn't include basePath)
  const pathParts = pathname.replace(/^\/+/, '').split('/').filter(Boolean);
  const breadcrumbs = [
    { label: 'Administration', href: '/' },
    ...pathParts.map((part, i) => ({
      label: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
      href: '/' + pathParts.slice(0, i + 1).join('/'),
    })),
  ];

  return (
    <div className="min-h-screen bg-gin-bg-app">
      <AdminToolbar user={user} logout={logout} />

      <div className="ml-16 min-h-screen flex flex-col">
        {/* Secondary top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between h-[52px] bg-white/95 backdrop-blur-sm border-b border-gin-border px-6 shadow-sm">
          <nav className="flex items-center gap-1.5 text-sm">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-1.5">
                {i > 0 && (
                  <ChevronRight className="w-3.5 h-3.5 text-gin-text-light/40" />
                )}
                {i === breadcrumbs.length - 1 ? (
                  <span className="text-gin-title font-semibold">{crumb.label}</span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-gin-text-light hover:text-gin-primary transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>

          <div className="flex items-center gap-4 text-sm">
            <a
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-gin-primary hover:text-gin-primary-hover font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Back to site
            </a>
          </div>
        </header>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
