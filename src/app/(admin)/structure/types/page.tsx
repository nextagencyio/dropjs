'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchEntityTypes, deleteContentType, type EntityTypeDefinition } from '@/lib/api-entities';

export default function ContentTypesPage() {
  const [types, setTypes] = useState<EntityTypeDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchEntityTypes()
      .then((t) => {
        setTypes(t);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (entityType: string, bundle: string, label: string) => {
    if (!confirm(`Delete content type "${label}"? This cannot be undone.`)) return;
    try {
      await deleteContentType(entityType, bundle);
      load();
    } catch {
      alert('Failed to delete content type');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[28px] font-normal tracking-tight text-gin-title">Content Types</h1>
        <Link
          href="/structure/types/add"
          className="px-4 py-2 bg-gin-primary text-white text-sm font-medium rounded-gin-s hover:bg-gin-primary-hover transition-colors"
        >
          + Add content type
        </Link>
      </div>

      <div className="bg-white border border-gin-border-table rounded-gin overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gin-bg-layer2 border-b border-gin-border-table">
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Label</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Entity Type</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Machine Name</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Description</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Fields</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-t border-gin-border">
                  <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse bg-gin-bg-layer2 rounded-gin-s" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse bg-gin-bg-layer2 rounded-gin-s" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse bg-gin-bg-layer2 rounded-gin-s" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse bg-gin-bg-layer2 rounded-gin-s" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-8 animate-pulse bg-gin-bg-layer2 rounded-gin-s" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-28 animate-pulse bg-gin-bg-layer2 rounded-gin-s" /></td>
                </tr>
              ))
            ) : types.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gin-text-light">
                  No content types registered.{' '}
                  <Link href="/structure/types/add" className="text-gin-primary hover:underline">Add one now</Link>.
                </td>
              </tr>
            ) : (
              types.map((item) => (
                <tr key={`${item.entity_type}-${item.bundle}`} className="hover:bg-gin-bg-layer2/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gin-text border-t border-gin-border">
                    <Link
                      href={`/structure/types/${item.entity_type}/${item.bundle}/fields`}
                      className="text-gin-primary hover:underline font-medium"
                    >
                      {item.label}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gin-text-light border-t border-gin-border">{item.entity_type}</td>
                  <td className="px-4 py-3 text-sm text-gin-text border-t border-gin-border">
                    <code className="text-xs bg-gin-bg-layer2 px-1.5 py-0.5 rounded-gin-s text-gin-text">
                      {item.bundle}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-sm text-gin-text-light border-t border-gin-border max-w-xs truncate">
                    {item.description || '\u2014'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gin-text-light border-t border-gin-border">
                    {Object.keys(item.fields).length}
                  </td>
                  <td className="px-4 py-3 text-sm border-t border-gin-border">
                    <div className="flex gap-3">
                      <Link
                        href={`/structure/types/${item.entity_type}/${item.bundle}/fields`}
                        className="text-sm text-gin-primary hover:underline"
                      >
                        Manage fields
                      </Link>
                      <Link
                        href={`/structure/types/${item.entity_type}/${item.bundle}/edit`}
                        className="text-sm text-gin-primary hover:underline"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(item.entity_type, item.bundle, item.label)}
                        className="text-sm text-gin-danger hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
