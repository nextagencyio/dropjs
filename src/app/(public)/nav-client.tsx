'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export function UserLinks() {
  const { user } = useAuth();

  if (user) {
    return (
      <Link href="/" className="text-gin-primary hover:underline">
        Admin
      </Link>
    );
  }

  return (
    <Link href="/login" className="text-gin-primary hover:underline">
      Log in
    </Link>
  );
}

export function PublicNav({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <nav className="bg-gray-50 border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 overflow-x-auto">
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
