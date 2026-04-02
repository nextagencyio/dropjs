'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Building2, Puzzle, Palette, Settings, Users, BarChart3, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react';
interface User {
  uid: number;
  name: string;
  email: string;
  roles?: string[];
}

interface AdminToolbarProps {
  user: User | null;
  logout: () => Promise<void>;
}

interface DropdownItem {
  href: string;
  label: string;
}

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  href?: string;
  dropdown?: DropdownItem[];
}

const icons = {
  home: <Home className="w-5 h-5" />,
  content: <FileText className="w-5 h-5" />,
  structure: <Building2 className="w-5 h-5" />,
  extend: <Puzzle className="w-5 h-5" />,
  appearance: <Palette className="w-5 h-5" />,
  config: <Settings className="w-5 h-5" />,
  people: <Users className="w-5 h-5" />,
  reports: <BarChart3 className="w-5 h-5" />,
  help: <HelpCircle className="w-5 h-5" />,
};

const menuItems: MenuItem[] = [
  {
    label: 'Content',
    icon: icons.content,
    dropdown: [
      { href: '/content', label: 'Content' },
      { href: '/content/scheduled', label: 'Scheduled' },
      { href: '/media', label: 'Media' },
    ],
  },
  {
    label: 'Structure',
    icon: icons.structure,
    dropdown: [
      { href: '/structure/blocks', label: 'Block layout' },
      { href: '/structure/types', label: 'Content types' },
      { href: '/structure/menus', label: 'Menus' },
      { href: '/structure/taxonomy', label: 'Taxonomy' },
      { href: '/structure/views', label: 'Views' },
    ],
  },
  { label: 'Extend', icon: icons.extend, href: '/extend' },
  { label: 'Appearance', icon: icons.appearance, href: '/appearance' },
  {
    label: 'Configuration',
    icon: icons.config,
    dropdown: [
      { href: '/config', label: 'Configuration' },
      { href: '/config/site', label: 'Site settings' },
      { href: '/config/url-aliases', label: 'URL aliases' },
      { href: '/config/redirects', label: 'URL redirects' },
      { href: '/config/languages', label: 'Languages' },
      { href: '/config/sync', label: 'Config sync' },
    ],
  },
  {
    label: 'People',
    icon: icons.people,
    dropdown: [
      { href: '/people', label: 'Users' },
      { href: '/people/roles', label: 'Roles' },
    ],
  },
  {
    label: 'Reports',
    icon: icons.reports,
    dropdown: [
      { href: '/reports', label: 'Reports' },
      { href: '/reports/audit-log', label: 'Audit log' },
      { href: '/reports/logs', label: 'Recent log messages' },
      { href: '/reports/status', label: 'Status report' },
    ],
  },
  { label: 'Help', icon: icons.help, href: '/help' },
];

export function AdminToolbar({ user, logout }: AdminToolbarProps) {
  const [expanded, setExpanded] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pathname = usePathname();

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  function isItemActive(item: MenuItem): boolean {
    if (item.href) return pathname.startsWith(item.href);
    if (item.dropdown) return item.dropdown.some((d) => pathname.startsWith(d.href));
    return false;
  }

  function handleItemMouseEnter(label: string) {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredItem(label);
  }

  function handleItemMouseLeave() {
    hoverTimeoutRef.current = setTimeout(() => setHoveredItem(null), 150);
  }

  return (
    <nav
      className={`fixed top-0 left-0 h-dvh flex flex-col z-50 overflow-hidden bg-white border-r border-gin-border transition-all duration-250 ease-in-out ${
        expanded ? 'w-[264px]' : 'w-16'
      }`}
    >
      {/* Logo / Home */}
      <Link
        href="/"
        className="flex items-center shrink-0 h-[60px] pl-[14px] gap-3 border-b border-gin-border hover:bg-gin-bg-layer2/50 transition-colors"
      >
        <img src="/logo-small.png" alt="drop.js" width={28} height={39} className="shrink-0" />
        <span
          className={`font-semibold text-sm whitespace-nowrap text-gin-title transition-all duration-200 ${
            expanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
          }`}
        >
          drop.js
        </span>
      </Link>

      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5">
        {menuItems.map((item) => {
          const active = isItemActive(item);
          const hovered = hoveredItem === item.label;
          const defaultHref = item.href || item.dropdown?.[0]?.href || '/';

          return (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => handleItemMouseEnter(item.label)}
              onMouseLeave={handleItemMouseLeave}
            >
              <Link
                href={defaultHref}
                className={`flex items-center rounded-gin-s h-11 pl-2.5 gap-3 text-sm transition-all duration-150 ${
                  active
                    ? 'text-gin-primary bg-gin-primary-light font-semibold shadow-sm'
                    : hovered
                      ? 'text-gin-title bg-gin-bg-layer2'
                      : 'text-gin-text hover:text-gin-title'
                }`}
              >
                <span className={`flex items-center justify-center w-7 h-7 shrink-0 transition-colors duration-150 ${active ? 'text-gin-primary' : ''}`}>
                  {item.icon}
                </span>
                <span
                  className={`whitespace-nowrap transition-all duration-200 ${
                    expanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                  }`}
                >
                  {item.label}
                </span>
                {item.dropdown && expanded && (
                  <ChevronDown className="w-3.5 h-3.5 ml-auto mr-2 text-gin-text-light" />
                )}
              </Link>

              {/* Flyout sub-menu (collapsed mode) */}
              {item.dropdown && hovered && !expanded && (
                <FlyoutMenu
                  label={item.label}
                  items={item.dropdown}
                  pathname={pathname}
                  onClose={() => setHoveredItem(null)}
                />
              )}

              {/* Inline sub-menu (expanded mode) */}
              {item.dropdown && expanded && (
                <div className="ml-[42px] mt-0.5 mb-1 space-y-0.5">
                  {item.dropdown.map((sub) => {
                    const subActive = pathname.startsWith(sub.href);
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={`block rounded-gin-s py-1.5 px-3 text-[13px] transition-all duration-150 ${
                          subActive
                            ? 'text-gin-primary bg-gin-primary-light font-semibold'
                            : 'text-gin-text-light hover:text-gin-text hover:bg-gin-bg-layer2'
                        }`}
                      >
                        {sub.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom area: user + expand toggle */}
      <div className="shrink-0 border-t border-gin-border p-2 space-y-1.5">
        {user && (
          <div className={`flex items-center gap-2.5 rounded-gin-s px-2.5 py-2 transition-colors ${expanded ? 'hover:bg-gin-bg-layer2' : ''}`}>
            <div className="flex items-center justify-center rounded-full shrink-0 w-8 h-8 bg-gin-primary text-white text-xs font-bold shadow-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div
              className={`flex-1 min-w-0 transition-all duration-200 ${
                expanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 w-0 overflow-hidden'
              }`}
            >
              <div className="text-sm font-medium truncate text-gin-title leading-tight">{user.name}</div>
              <button
                onClick={logout}
                className="text-xs text-gin-text-light hover:text-gin-danger transition-colors"
              >
                Log out
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-center w-full h-9 rounded-gin-s text-gin-text-light hover:text-gin-title hover:bg-gin-bg-layer2 transition-all duration-150"
          title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <ChevronRight className={`w-4 h-4 transition-transform duration-250 ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </nav>
  );
}

function FlyoutMenu({
  label,
  items,
  pathname,
  onClose,
}: {
  label: string;
  items: DropdownItem[];
  pathname: string;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (menuRef.current) {
      const parent = menuRef.current.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        menuRef.current.style.top = `${rect.top}px`;
      }
    }
  });

  return (
    <div ref={menuRef} className="fixed left-16 z-[60]">
      <div className="py-2 min-w-[200px] bg-white rounded-r-gin shadow-lg border-l border-gin-border">
        <div className="px-4 pb-2 mb-1 font-semibold text-sm text-gin-title border-b border-gin-border pt-2">
          {label}
        </div>
        {items.map((sub) => {
          const subActive = pathname.startsWith(sub.href);
          return (
            <Link
              key={sub.href}
              href={sub.href}
              onClick={onClose}
              className={`block mx-2 my-0.5 px-3 py-2 rounded-gin-s text-sm transition-all duration-150 ${
                subActive
                  ? 'text-gin-primary bg-gin-primary-light font-semibold'
                  : 'text-gin-text hover:text-gin-title hover:bg-gin-bg-layer2'
              }`}
            >
              {sub.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
