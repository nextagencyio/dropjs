'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  FileText,
  Building2,
  Puzzle,
  Palette,
  Settings,
  Users,
  BarChart3,
  HelpCircle,
  Plus,
  Home,
  MessageSquare,
  Calendar,
  Image,
  Globe,
  ArrowRight,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  href: string;
  icon: React.ReactNode;
  keywords?: string[];
  section: string;
}

const COMMANDS: CommandItem[] = [
  // Navigation
  { id: 'dashboard', label: 'Dashboard', href: '/', icon: <Home className="w-4 h-4" />, section: 'Navigation', keywords: ['home', 'overview'] },
  { id: 'content', label: 'Content', href: '/content', icon: <FileText className="w-4 h-4" />, section: 'Navigation', keywords: ['articles', 'nodes', 'pages'] },
  { id: 'media', label: 'Media', href: '/media', icon: <Image className="w-4 h-4" />, section: 'Navigation', keywords: ['files', 'images', 'uploads'] },
  { id: 'comments', label: 'Comments', href: '/content/comments', icon: <MessageSquare className="w-4 h-4" />, section: 'Navigation', keywords: ['moderation'] },
  { id: 'scheduled', label: 'Scheduled content', href: '/content/scheduled', icon: <Calendar className="w-4 h-4" />, section: 'Navigation', keywords: ['publish', 'unpublish'] },
  { id: 'people', label: 'People', href: '/people', icon: <Users className="w-4 h-4" />, section: 'Navigation', keywords: ['users', 'accounts'] },
  { id: 'roles', label: 'Roles', href: '/people/roles', icon: <Users className="w-4 h-4" />, section: 'Navigation', keywords: ['permissions'] },

  // Structure
  { id: 'content-types', label: 'Content types', href: '/structure/types', icon: <Building2 className="w-4 h-4" />, section: 'Structure', keywords: ['entity', 'bundle'] },
  { id: 'taxonomy', label: 'Taxonomy', href: '/structure/taxonomy', icon: <Building2 className="w-4 h-4" />, section: 'Structure', keywords: ['terms', 'vocabulary', 'categories', 'tags'] },
  { id: 'menus', label: 'Menus', href: '/structure/menus', icon: <Building2 className="w-4 h-4" />, section: 'Structure', keywords: ['navigation', 'links'] },
  { id: 'views', label: 'Views', href: '/structure/views', icon: <Building2 className="w-4 h-4" />, section: 'Structure', keywords: ['lists', 'queries', 'displays'] },
  { id: 'blocks', label: 'Block layout', href: '/structure/blocks', icon: <Building2 className="w-4 h-4" />, section: 'Structure', keywords: ['regions', 'sidebar'] },

  // Configuration
  { id: 'config', label: 'Configuration', href: '/config', icon: <Settings className="w-4 h-4" />, section: 'Configuration', keywords: ['settings'] },
  { id: 'site-settings', label: 'Site settings', href: '/config/site', icon: <Settings className="w-4 h-4" />, section: 'Configuration', keywords: ['site name', 'slogan'] },
  { id: 'url-aliases', label: 'URL aliases', href: '/config/url-aliases', icon: <Globe className="w-4 h-4" />, section: 'Configuration', keywords: ['paths', 'pathauto'] },
  { id: 'redirects', label: 'URL redirects', href: '/config/redirects', icon: <Globe className="w-4 h-4" />, section: 'Configuration', keywords: ['301', '302'] },
  { id: 'languages', label: 'Languages', href: '/config/languages', icon: <Globe className="w-4 h-4" />, section: 'Configuration', keywords: ['i18n', 'translations', 'localization'] },
  { id: 'config-sync', label: 'Config sync', href: '/config/sync', icon: <Settings className="w-4 h-4" />, section: 'Configuration', keywords: ['import', 'export'] },
  { id: 'appearance', label: 'Appearance', href: '/appearance', icon: <Palette className="w-4 h-4" />, section: 'Configuration', keywords: ['theme', 'design'] },
  { id: 'extend', label: 'Extend', href: '/extend', icon: <Puzzle className="w-4 h-4" />, section: 'Configuration', keywords: ['modules', 'plugins'] },

  // Create
  { id: 'add-content', label: 'Add content', href: '/node/add', icon: <Plus className="w-4 h-4" />, section: 'Create', keywords: ['new', 'create', 'article', 'page'] },
  { id: 'add-content-type', label: 'Add content type', href: '/structure/types/add', icon: <Plus className="w-4 h-4" />, section: 'Create', keywords: ['new', 'entity type'] },
  { id: 'import-export', label: 'Import / Export content', href: '/content/import-export', icon: <ArrowRight className="w-4 h-4" />, section: 'Create', keywords: ['json', 'bulk', 'migrate'] },

  // Reports
  { id: 'reports', label: 'Reports', href: '/reports', icon: <BarChart3 className="w-4 h-4" />, section: 'Reports', keywords: ['overview'] },
  { id: 'status-report', label: 'Status report', href: '/reports/status', icon: <BarChart3 className="w-4 h-4" />, section: 'Reports', keywords: ['system', 'health'] },
  { id: 'audit-log', label: 'Audit log', href: '/reports/audit-log', icon: <BarChart3 className="w-4 h-4" />, section: 'Reports', keywords: ['activity', 'history'] },
  { id: 'logs', label: 'Recent log messages', href: '/reports/logs', icon: <BarChart3 className="w-4 h-4" />, section: 'Reports', keywords: ['errors', 'warnings', 'watchdog'] },
  { id: 'help', label: 'Help', href: '/help', icon: <HelpCircle className="w-4 h-4" />, section: 'Reports', keywords: ['documentation', 'support'] },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const filtered = query.trim()
    ? COMMANDS.filter((cmd) => {
        const q = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.description?.toLowerCase().includes(q) ||
          cmd.keywords?.some((k) => k.includes(q)) ||
          cmd.section.toLowerCase().includes(q)
        );
      })
    : COMMANDS;

  // Group by section
  const sections: { name: string; items: CommandItem[] }[] = [];
  const sectionMap = new Map<string, CommandItem[]>();
  for (const item of filtered) {
    if (!sectionMap.has(item.section)) {
      sectionMap.set(item.section, []);
    }
    sectionMap.get(item.section)!.push(item);
  }
  for (const [name, items] of sectionMap) {
    sections.push({ name, items });
  }

  // Flat list for arrow key navigation
  const flatItems = sections.flatMap((s) => s.items);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  const handleNavigate = useCallback(
    (href: string) => {
      handleClose();
      router.push(href);
    },
    [handleClose, router],
  );

  // Global keyboard shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) {
          handleClose();
        } else {
          handleOpen();
        }
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        handleClose();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, handleOpen, handleClose]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector('[data-selected="true"]');
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(flatItems.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % Math.max(flatItems.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[selectedIndex]) {
        handleNavigate(flatItems[selectedIndex].href);
      }
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg bg-white rounded-gin shadow-2xl border border-gin-border overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gin-border">
          <Search className="w-5 h-5 text-gin-text-light shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 text-sm text-gin-title placeholder-gin-text-light/60 bg-transparent outline-none"
            aria-label="Search commands"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-medium text-gin-text-light bg-gin-bg-layer2 border border-gin-border rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto py-2">
          {flatItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gin-text-light">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.name}>
                <div className="px-4 py-1.5 text-[11px] font-semibold text-gin-text-light uppercase tracking-wider">
                  {section.name}
                </div>
                {section.items.map((item) => {
                  const globalIndex = flatItems.indexOf(item);
                  const isSelected = globalIndex === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      data-selected={isSelected}
                      onClick={() => handleNavigate(item.href)}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                        isSelected
                          ? 'bg-gin-primary-light text-gin-primary'
                          : 'text-gin-text hover:bg-gin-bg-layer2'
                      }`}
                    >
                      <span className={`shrink-0 ${isSelected ? 'text-gin-primary' : 'text-gin-text-light'}`}>
                        {item.icon}
                      </span>
                      <span className={`font-medium ${isSelected ? 'text-gin-primary' : 'text-gin-title'}`}>
                        {item.label}
                      </span>
                      {isSelected && (
                        <ArrowRight className="w-3.5 h-3.5 ml-auto text-gin-primary/50" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-gin-border bg-gin-bg-layer2 flex items-center gap-4 text-[11px] text-gin-text-light">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-white border border-gin-border rounded text-[10px]">&uarr;</kbd>
            <kbd className="px-1 py-0.5 bg-white border border-gin-border rounded text-[10px]">&darr;</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-white border border-gin-border rounded text-[10px]">&crarr;</kbd>
            open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-white border border-gin-border rounded text-[10px]">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
