'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  fetchView,
  updateView,
  executeView,
  type ViewData,
  type ViewExecuteResult,
} from '@/lib/api-system';

export default function ViewEditPage() {
  const params = useParams<{ viewId: string }>();
  const viewId = params.viewId;
  const [view, setView] = useState<ViewData | null>(null);
  const [preview, setPreview] = useState<ViewExecuteResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editable fields
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [pager, setPager] = useState('25');
  const [status, setStatus] = useState(true);

  useEffect(() => {
    loadView();
  }, [viewId]);

  async function loadView() {
    if (!viewId) return;
    try {
      const data = await fetchView(viewId);
      setView(data);
      setLabel(data.label);
      setDescription(data.description ?? '');
      setPager(String(data.pager));
      setStatus(data.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load view');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!viewId) return;
    setSaving(true);
    setError('');
    try {
      await updateView(viewId, {
        label,
        description,
        pager: parseInt(pager, 10) || 25,
        status,
      });
      setSuccess('View saved successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save view');
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    if (!viewId) return;
    try {
      const result = await executeView(viewId);
      setPreview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute view');
    }
  }

  if (loading) {
    return (
      <div>
        <div className="mb-5">
          <div className="h-4 w-48 animate-pulse bg-gin-bg-layer2 rounded-gin-s" />
        </div>
        <div className="h-8 w-56 animate-pulse bg-gin-bg-layer2 rounded-gin-s mb-6" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <div className="bg-white border border-gin-border rounded-gin p-4">
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i}>
                    <div className="h-4 w-24 animate-pulse bg-gin-bg-layer2 rounded-gin-s mb-2" />
                    <div className="h-9 w-full animate-pulse bg-gin-bg-layer2 rounded-gin-s" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="bg-white border border-gin-border rounded-gin p-4">
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-4 w-full animate-pulse bg-gin-bg-layer2 rounded-gin-s" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="bg-red-50 border border-red-200 text-gin-danger rounded-gin-s px-4 py-3 text-sm">
        View not found
      </div>
    );
  }

  return (
    <div>
      <nav className="mb-5 flex items-center gap-0">
        <Link href="/structure" className="text-gin-primary hover:underline text-sm">Structure</Link>
        <span className="text-gin-text-light mx-2">/</span>
        <Link href="/structure/views" className="text-gin-primary hover:underline text-sm">Views</Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">{view.label}</span>
      </nav>
      <h1 className="text-[28px] font-normal tracking-tight text-gin-title mb-6">{view.label}</h1>

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-gin-danger rounded-gin-s px-4 py-3 text-sm">{error}</div>}
      {success && <div className="mb-4 bg-emerald-50 border border-emerald-200 text-gin-green rounded-gin-s px-4 py-3 text-sm">{success}</div>}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <form onSubmit={handleSave} className="bg-white border border-gin-border rounded-gin p-6 mb-6">
            <h2 className="text-base font-semibold text-gin-title mb-4">View settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-gin-text-light mb-1.5">Label</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  required
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-gin-text-light mb-1.5">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-semibold text-gin-text-light mb-1.5">Items per page</label>
                  <input
                    type="number"
                    value={pager}
                    onChange={(e) => setPager(e.target.value)}
                    min="0"
                    className="w-full"
                  />
                  <p className="text-[12px] text-gin-text-light mt-1">0 = no pagination (show all)</p>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-gin-text-light mb-1.5">Status</label>
                  <label className="inline-flex items-center gap-2 mt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={status}
                      onChange={(e) => setStatus(e.target.checked)}
                      className="rounded border-gin-border-form text-gin-primary focus:ring-gin-primary"
                    />
                    <span className="text-sm text-gin-text-light">Enabled</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button type="submit" disabled={saving} className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={handlePreview} className="border border-gin-border text-gin-text rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-bg-layer2 transition-colors">
                Preview
              </button>
            </div>
          </form>

          {/* Filters */}
          <div className="bg-white border border-gin-border rounded-gin p-6 mb-6">
            <h2 className="text-base font-semibold text-gin-title mb-3">Filters</h2>
            {view.filters.length === 0 ? (
              <p className="text-sm text-gin-text-light">No filters configured.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gin-bg-layer2">
                    <th className="text-left px-3 py-2 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Field</th>
                    <th className="text-left px-3 py-2 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Operator</th>
                    <th className="text-left px-3 py-2 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Value</th>
                    <th className="text-left px-3 py-2 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Exposed</th>
                  </tr>
                </thead>
                <tbody>
                  {view.filters.map((f, i) => (
                    <tr key={i} className="border-t border-gin-border">
                      <td className="px-3 py-2 text-sm text-gin-text font-mono text-xs">{f.field}</td>
                      <td className="px-3 py-2 text-sm text-gin-text">{f.operator}</td>
                      <td className="px-3 py-2 text-sm text-gin-text-light">{String(f.value ?? '-')}</td>
                      <td className="px-3 py-2 text-sm">
                        {f.exposed ? (
                          <span className="text-gin-green text-xs">Yes ({f.expose_identifier})</span>
                        ) : (
                          <span className="text-gin-text-light text-xs">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Sorts */}
          <div className="bg-white border border-gin-border rounded-gin p-6 mb-6">
            <h2 className="text-base font-semibold text-gin-title mb-3">Sort criteria</h2>
            {view.sorts.length === 0 ? (
              <p className="text-sm text-gin-text-light">No sorts configured.</p>
            ) : (
              <ul className="space-y-1">
                {view.sorts.map((s, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <code className="text-xs bg-gin-bg-layer2 px-2 py-0.5 rounded-gin-s text-gin-text">{s.field}</code>
                    <span className="text-gin-text-light">{s.direction}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Sidebar info */}
        <div>
          <div className="bg-white border border-gin-border rounded-gin p-6">
            <h3 className="text-[13px] font-semibold text-gin-text-light uppercase tracking-wider mb-3">View details</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-[13px] text-gin-text-light">Machine name</dt>
                <dd className="font-mono text-gin-text">{view.id}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-gin-text-light">Entity type</dt>
                <dd className="text-gin-text">{view.entity_type}</dd>
              </div>
              {view.bundle && (
                <div>
                  <dt className="text-[13px] text-gin-text-light">Bundle</dt>
                  <dd className="text-gin-text">{view.bundle}</dd>
                </div>
              )}
              <div>
                <dt className="text-[13px] text-gin-text-light">Display fields</dt>
                <dd className="text-gin-text">{view.display_fields.length > 0 ? view.display_fields.map(f => f.label ?? f.field).join(', ') : 'All fields'}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div className="mt-6 bg-white border border-gin-border rounded-gin p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gin-title">Preview</h2>
            <span className="text-[12px] text-gin-text-light">
              {preview.meta.total} results (page {preview.meta.page}/{preview.meta.total_pages})
            </span>
          </div>
          {preview.data.length === 0 ? (
            <p className="text-sm text-gin-text-light">No results.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gin-bg-layer2">
                    {Object.keys(preview.data[0]).map((key) => (
                      <th key={key} className="text-left px-3 py-2 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.data.map((row, i) => (
                    <tr key={i} className="border-t border-gin-border">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-3 py-2 text-sm text-gin-text-light">
                          {typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
