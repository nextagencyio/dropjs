'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchViews,
  createView,
  deleteView,
  type ViewData,
} from '@/lib/api-system';

export default function ViewsListPage() {
  const [views, setViews] = useState<ViewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newId, setNewId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newEntityType, setNewEntityType] = useState('node');

  useEffect(() => {
    loadViews();
  }, []);

  async function loadViews() {
    try {
      const data = await fetchViews();
      setViews(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load views');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createView({
        id: newId,
        label: newLabel,
        entity_type: newEntityType,
      });
      setNewId('');
      setNewLabel('');
      setShowCreate(false);
      await loadViews();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create view');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(`Delete view "${id}"?`)) return;
    try {
      await deleteView(id);
      await loadViews();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete view');
    }
  }

  if (loading) {
    return (
      <div>
        <div className="h-8 w-32 animate-pulse bg-gin-bg-layer2 rounded-gin-s mb-5" />
        <div className="bg-white border border-gin-border rounded-gin overflow-hidden">
          <div className="bg-gin-bg-layer2 px-4 py-3">
            <div className="h-4 w-full animate-pulse bg-gin-bg-app rounded-gin-s" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-4 py-3 border-t border-gin-border">
              <div className="h-4 w-3/4 animate-pulse bg-gin-bg-layer2 rounded-gin-s" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <nav className="mb-5 flex items-center gap-0">
        <Link href="/structure" className="text-gin-primary hover:underline text-sm">Structure</Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">Views</span>
      </nav>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title">Views</h1>
          <p className="text-sm text-gin-text-light mt-1">Configurable entity list builders</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors"
        >
          + Add view
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-gin-danger rounded-gin-s px-4 py-3 text-sm">{error}</div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 bg-white border border-gin-border rounded-gin p-6">
          <h2 className="text-base font-semibold text-gin-title mb-4">Create new view</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-gin-text-light mb-1.5">View name</label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => {
                  setNewLabel(e.target.value);
                  setNewId(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
                }}
                required
                className="w-full"
                placeholder="My view"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gin-text-light mb-1.5">Machine name</label>
              <input
                type="text"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                required
                pattern="[a-z][a-z0-9_]*"
                className="w-full font-mono"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gin-text-light mb-1.5">Show</label>
              <select
                value={newEntityType}
                onChange={(e) => setNewEntityType(e.target.value)}
                className="w-full"
              >
                <option value="node">Content</option>
                <option value="taxonomy_term">Taxonomy terms</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button type="submit" className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors">
              Save
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="border border-gin-border text-gin-text rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-bg-layer2 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gin-border rounded-gin overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gin-bg-layer2 border-b border-gin-border-table">
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">View name</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Machine name</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Entity type</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Operations</th>
            </tr>
          </thead>
          <tbody>
            {views.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gin-text-light">
                  No views configured. Click &quot;Add view&quot; to create one.
                </td>
              </tr>
            ) : (
              views.map((view) => (
                <tr key={view.id} className="hover:bg-gin-bg-layer2/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gin-text border-t border-gin-border">
                    <Link href={`/structure/views/${view.id}`} className="text-gin-primary hover:underline font-medium">
                      {view.label}
                    </Link>
                    {view.description && (
                      <p className="text-[12px] text-gin-text-light mt-0.5">{view.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm border-t border-gin-border">
                    <code className="text-xs bg-gin-bg-layer2 px-1.5 py-0.5 rounded-gin-s text-gin-text">{view.id}</code>
                  </td>
                  <td className="px-4 py-3 text-sm text-gin-text-light border-t border-gin-border">{view.entity_type}</td>
                  <td className="px-4 py-3 text-sm border-t border-gin-border">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      view.status ? 'bg-emerald-50 text-gin-green' : 'bg-gray-100 text-gin-text-light'
                    }`}>
                      {view.status ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm border-t border-gin-border">
                    <div className="flex gap-3">
                      <Link href={`/structure/views/${view.id}`} className="text-sm text-gin-primary hover:underline">
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(view.id)}
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
