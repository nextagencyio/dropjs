import Link from 'next/link';
import { getSiteConfig, getMainMenu, type MenuItemData } from '@/lib/server/data';
import { PublicNav, UserLinks } from './nav-client';

export const revalidate = 3600;

function buildNavLinks(menuItems: MenuItemData[]): { href: string; label: string }[] {
  const links: { href: string; label: string }[] = [
    { href: '/front', label: 'Home' },
  ];

  for (const item of menuItems) {
    if (!item.enabled) continue;
    if (item.url === '/' && item.title.toLowerCase() === 'home') continue;
    links.push({ href: item.url, label: item.title });
  }

  if (!links.some((l) => l.href === '/search')) {
    links.push({ href: '/search', label: 'Search' });
  }

  return links;
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [config, menuData] = await Promise.all([
    getSiteConfig(),
    getMainMenu(),
  ]);

  const menuItems = menuData?.tree || menuData?.items || [];
  const navLinks = buildNavLinks(menuItems);
  const siteName = config?.name || 'drop.js';

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Link href="/front" className="text-2xl font-bold text-gray-900 no-underline hover:text-gin-primary">
              {siteName}
            </Link>
            {config?.slogan && (
              <p className="text-sm text-gray-500 mt-0.5">{config.slogan}</p>
            )}
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <UserLinks />
          </nav>
        </div>
      </header>

      <PublicNav links={navLinks} />

      <main className="flex-1 max-w-5xl mx-auto px-6 py-8 w-full">
        {children}
      </main>

      <footer className="border-t border-gray-200 bg-gray-50 mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} {siteName}. Powered by drop.js</p>
        </div>
      </footer>
    </div>
  );
}
