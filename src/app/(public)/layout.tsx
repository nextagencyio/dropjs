'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';

interface SiteConfig {
  name: string;
  slogan: string;
  mail: string;
  front_page: string;
}

function SiteHeader({ config }: { config: SiteConfig | null }) {
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <div>
          <Link href="/front" className="text-2xl font-bold text-gray-900 no-underline hover:text-gin-primary">
            {config?.name || 'DropJS'}
          </Link>
          {config?.slogan && (
            <p className="text-sm text-gray-500 mt-0.5">{config.slogan}</p>
          )}
        </div>
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <Link href="/" className="text-gin-primary hover:underline">
              Admin
            </Link>
          ) : (
            <Link href="/login" className="text-gin-primary hover:underline">
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function SiteNav() {
  const pathname = usePathname();
  const links = [
    { href: '/front', label: 'Home' },
  ];

  return (
    <nav className="bg-gray-50 border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-6">
        <ul className="flex gap-0 list-none m-0 p-0">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`inline-block px-4 py-2.5 text-sm no-underline border-b-2 ${
                    active
                      ? 'border-gin-primary text-gin-primary font-medium'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

function SiteFooter({ config }: { config: SiteConfig | null }) {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 mt-auto">
      <div className="max-w-5xl mx-auto px-6 py-6 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} {config?.name || 'DropJS'}. Powered by <a href="https://github.com" className="text-gin-primary hover:underline">drop.js</a></p>
      </div>
    </footer>
  );
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SiteConfig | null>(null);

  useEffect(() => {
    fetch('/api/site-config')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.data) setConfig(data.data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
      <SiteHeader config={config} />
      <SiteNav />
      <main className="flex-1 max-w-5xl mx-auto px-6 py-8 w-full">
        {children}
      </main>
      <SiteFooter config={config} />
    </div>
  );
}
