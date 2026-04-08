'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, ExternalLink, Search } from 'lucide-react';
import { AdminToolbar } from './admin-toolbar';
import { ToastProvider } from './toast';
import { CommandPalette } from './command-palette';

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
    <ToastProvider>
    <div className="min-h-dvh bg-gin-bg-app">
      <AdminToolbar user={toolbarUser} logout={handleLogout} />
      <CommandPalette />

      <div className="ml-16 min-h-dvh flex flex-col">
        {/* Secondary top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between h-[52px] bg-white/95 backdrop-blur-sm border-b border-gin-border px-3 sm:px-6 shadow-sm">
          <nav className="flex items-center gap-1 sm:gap-1.5 text-sm min-w-0 overflow-hidden">
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

          <div className="flex items-center gap-4 text-sm shrink-0">
            <button
              onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gin-text-light bg-gin-bg-layer2 border border-gin-border rounded-gin-s hover:border-gin-text-light/30 transition-colors"
              aria-label="Search commands"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="text-[13px]">Search...</span>
              <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-white border border-gin-border rounded">
                ⌘K
              </kbd>
            </button>
            <a
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-gin-primary hover:text-gin-primary-hover font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Back to site</span>
            </a>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-6">
          {children}
        </main>
      </div>
    </div>
    </ToastProvider>
  );
}
