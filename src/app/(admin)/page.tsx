'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Inbox, FileText, Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  fetchEntityTypes,
  fetchEntityList,
  type EntityTypeDefinition,
  type EntityData,
} from '@/lib/api-entities';
import { fetchUsers } from '@/lib/api-users';
import type { User } from '@/lib/api-auth';

interface ContentCount {
  label: string;
  entityType: string;
  bundle: string;
  total: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [types, setTypes] = useState<EntityTypeDefinition[]>([]);
  const [contentCounts, setContentCounts] = useState<ContentCount[]>([]);
  const [recentContent, setRecentContent] = useState<EntityData[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const allTypes = await fetchEntityTypes();
        setTypes(allTypes);

        const nodeTypes = allTypes.filter((t) => t.entity_type === 'node');

        const countPromises = nodeTypes.map(async (t) => {
          const res = await fetchEntityList(t.entity_type, t.bundle, { limit: 1 });
          return { label: t.label, entityType: t.entity_type, bundle: t.bundle, total: res.meta.total };
        });

        const recentPromises = nodeTypes.map(async (t) => {
          const res = await fetchEntityList(t.entity_type, t.bundle, { limit: 10, sort: '-changed' });
          return res.data.map((d) => ({ ...d, _entityType: t.entity_type, _bundle: t.bundle, _label: t.label }));
        });

        const [counts, recentResults] = await Promise.all([
          Promise.all(countPromises),
          Promise.all(recentPromises),
        ]);

        setContentCounts(counts);
        const allRecent = recentResults
          .flat()
          .sort((a, b) => {
            const aDate = a.changed ? new Date(a.changed as string).getTime() : 0;
            const bDate = b.changed ? new Date(b.changed as string).getTime() : 0;
            return bDate - aDate;
          })
          .slice(0, 10);
        setRecentContent(allRecent);

        try {
          const usersRes = await fetchUsers();
          const sorted = [...usersRes.data].sort((a, b) => {
            const aDate = a.created ? new Date(a.created).getTime() : 0;
            const bDate = b.created ? new Date(b.created).getTime() : 0;
            return bDate - aDate;
          });
          setRecentUsers(sorted.slice(0, 5));
        } catch {
          // User may not have permission
        }
      } catch {
        // Silently handle errors
      }
      setLoading(false);
    }
    loadDashboard();
  }, []);

  const nodeTypes = types.filter((t) => t.entity_type === 'node');
  const totalContent = contentCounts.reduce((sum, c) => sum + c.total, 0);

  const formatDate = (val: unknown) => {
    if (!val) return '';
    const d = typeof val === 'number' ? new Date(val * 1000) : new Date(val as string);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div>
        <div className="animate-pulse space-y-6">
          <div className="space-y-2">
            <div className="h-8 bg-gin-bg-layer2 rounded-gin-s w-48" />
            <div className="h-4 bg-gin-bg-layer2 rounded-gin-s w-64" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white border border-gin-border rounded-gin p-5">
                <div className="h-7 bg-gin-bg-layer2 rounded-gin-s w-12 mb-2" />
                <div className="h-4 bg-gin-bg-layer2 rounded-gin-s w-24" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-gin-border rounded-gin">
              <div className="px-4 py-3 border-b border-gin-border">
                <div className="h-4 bg-gin-bg-layer2 rounded-gin-s w-32" />
              </div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="px-4 py-3 border-b border-gin-border last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-gin-bg-layer2 rounded-gin-s w-48" />
                    <div className="h-4 bg-gin-bg-layer2 rounded-gin-s w-20" />
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-6">
              <div className="bg-white border border-gin-border rounded-gin">
                <div className="px-4 py-3 border-b border-gin-border">
                  <div className="h-4 bg-gin-bg-layer2 rounded-gin-s w-28" />
                </div>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="px-3 py-2.5">
                    <div className="h-4 bg-gin-bg-layer2 rounded-gin-s w-32" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[28px] font-normal tracking-tight mb-1 text-gin-title">
        Dashboard
      </h1>
      <p className="text-sm mb-6 text-gin-text-light">
        Welcome back, {user?.name}.
      </p>

      {/* Content counts */}
      {contentCounts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-gin-border rounded-gin p-5 transition-shadow hover:shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-gin-s bg-gin-primary-light flex items-center justify-center">
                <Inbox className="w-4.5 h-4.5 text-gin-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gin-title">{totalContent}</div>
            <div className="text-[13px] text-gin-text-light mt-0.5">Total content</div>
          </div>
          {contentCounts.map((c) => (
            <Link
              key={`${c.entityType}-${c.bundle}`}
              href={`/content?type=${c.bundle}`}
              className="bg-white border border-gin-border rounded-gin p-5 hover:border-gin-primary hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-gin-s bg-gin-bg-layer2 group-hover:bg-gin-primary-light flex items-center justify-center transition-colors">
                  <FileText className="w-4.5 h-4.5 text-gin-text-light group-hover:text-gin-primary transition-colors" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gin-title">{c.total}</div>
              <div className="text-[13px] text-gin-text-light mt-0.5">{c.label}</div>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent content */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gin-border rounded-gin overflow-hidden">
            <div className="px-4 py-3 border-b border-gin-border-table-header flex items-center justify-between bg-gin-bg-layer2">
              <h2 className="text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                Recent content
              </h2>
              <Link
                href="/content"
                className="text-[13px] text-gin-primary hover:underline font-medium"
              >
                View all
              </Link>
            </div>
            {recentContent.length === 0 ? (
              <div className="p-10 text-center">
                <FileText className="w-10 h-10 text-gin-border mx-auto mb-3" />
                <p className="text-gin-text-light text-sm mb-2">No content yet.</p>
                <Link
                  href="/node/add"
                  className="text-gin-primary hover:underline text-sm font-medium"
                >
                  Add your first content
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gin-border">
                {recentContent.map((item) => (
                  <Link
                    key={`${item._entityType}-${item._bundle}-${item.nid}`}
                    href={`/node/${item.nid}/edit`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-gin-primary-light transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-medium text-gin-title truncate">
                        {(item.title as string) ?? '(untitled)'}
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-gin-s bg-gin-bg-layer2 text-[11px] text-gin-text-light shrink-0">
                        {item._label as string}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      {item.status ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[12px] font-medium bg-emerald-50 text-gin-green">
                          <span className="w-1.5 h-1.5 rounded-full bg-gin-green" />
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[12px] font-medium bg-gray-100 text-gin-text-light">
                          <span className="w-1.5 h-1.5 rounded-full bg-gin-warning" />
                          Draft
                        </span>
                      )}
                      <span className="text-[12px] text-gin-text-light">
                        {formatDate(item.changed)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick actions */}
          <div className="bg-white border border-gin-border rounded-gin overflow-hidden">
            <div className="px-4 py-3 border-b border-gin-border-table-header bg-gin-bg-layer2">
              <h2 className="text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                Quick actions
              </h2>
            </div>
            <div className="p-2 space-y-0.5">
              {nodeTypes.map((t) => (
                <Link
                  key={t.bundle}
                  href={`/node/add/${t.bundle}`}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gin-primary font-medium hover:bg-gin-primary-light rounded-gin-s transition-colors"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  Add {t.label.toLowerCase()}
                </Link>
              ))}
              <div className="border-t border-gin-border my-1" />
              <Link
                href="/structure/types/add"
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gin-text hover:bg-gin-bg-layer2 rounded-gin-s transition-colors"
              >
                <Plus className="w-4 h-4 shrink-0 text-gin-text-light" />
                Add content type
              </Link>
            </div>
          </div>

          {/* Recent users */}
          {recentUsers.length > 0 && (
            <div className="bg-white border border-gin-border rounded-gin overflow-hidden">
              <div className="px-4 py-3 border-b border-gin-border-table-header bg-gin-bg-layer2 flex items-center justify-between">
                <h2 className="text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                  Users
                </h2>
                <Link
                  href="/people"
                  className="text-[13px] text-gin-primary hover:underline font-medium"
                >
                  Manage
                </Link>
              </div>
              <div className="divide-y divide-gin-border">
                {recentUsers.map((u) => (
                  <div key={u.uid} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gin-primary-light flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-gin-primary uppercase">
                          {(u.name ?? '?').charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gin-title truncate">{u.name}</div>
                        <div className="text-[12px] text-gin-text-light truncate">{u.email}</div>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0 ml-2">
                      {(u.roles ?? []).map((role) => (
                        <span
                          key={role}
                          className="text-[11px] px-1.5 py-0.5 rounded-full bg-gin-bg-layer2 text-gin-text-light font-medium"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
