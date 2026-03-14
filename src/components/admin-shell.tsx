'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { AdminToolbar } from './admin-toolbar';

interface SerializableUser {
  uid: number;
  name: string;
  email: string;
  roles?: string[];
}

export function AdminShell({
  user,
  children,
}: {
  user: SerializableUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const handleLogout = async () => {
    const { signOut } = await import('next-auth/react');
    await signOut({ callbackUrl: '/login' });
  };

  // Build breadcrumb from path
  const pathParts = pathname.replace(/^\/+/, '').split('/').filter(Boolean);
  const breadcrumbs = [
    { label: 'Administration', href: '/' },
    ...pathParts.map((part, i) => ({
      label: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
      href: '/' + pathParts.slice(0, i + 1).join('/'),
    })),
  ];

  // AdminToolbar expects User | null shape
  const toolbarUser = {
    uid: user.uid,
    uuid: '',
    name: user.name,
    email: user.email,
    status: true,
    roles: user.roles,
  };

  return (
    <div className="min-h-screen bg-gin-bg-app">
      <AdminToolbar user={toolbarUser} logout={handleLogout} />

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
