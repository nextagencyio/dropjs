'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateViewAction, executeViewAction } from '@/app/(admin)/_actions/system';
import { Plus, Trash2, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';

interface ViewFilter {
  field: string;
  operator: string;
  value?: unknown;
  exposed?: boolean;
  expose_identifier?: string;
  expose_label?: string;
}

interface ViewSort {
  field: string;
  direction: string;
  exposed?: boolean;
}

interface ViewField {
  field: string;
  label?: string;
  formatter?: string;
}

export interface ViewEditData {
  id: string;
  label: string;
  description?: string;
  entity_type: string;
  bundle?: string | null;
  display_fields: ViewField[];
  filters: ViewFilter[];
  sorts: ViewSort[];
  pager: number;
  status: boolean;
}

interface AvailableField {
  name: string;
  label: string;
  type: string;
}

interface ViewExecuteResult {
  data: Record<string, unknown>[];
  meta: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

const OPERATORS = [
  { value: '=', label: '=' },
  { value: '!=', label: '!=' },
  { value: '<', label: '<' },
  { value: '<=', label: '<=' },
  { value: '>', label: '>' },
  { value: '>=', label: '>=' },
  { value: 'LIKE', label: 'Contains' },
  { value: 'IN', label: 'In' },
  { value: 'NOT IN', label: 'Not in' },
  { value: 'BETWEEN', label: 'Between' },
];

export default function ViewEditClient({
  view,
  availableFields,
}: {
  view: ViewEditData;
  availableFields: AvailableField[];
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<ViewExecuteResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editable state
  const [label, setLabel] = useState(view.label);
  const [description, setDescription] = useState(view.description ?? '');
  const [pager, setPager] = useState(String(view.pager));
  const [status, setStatus] = useState(view.status);
  const [displayFields, setDisplayFields] = useState<ViewField[]>(view.display_fields);
  const [filters, setFilters] = useState<ViewFilter[]>(view.filters);
  const [sorts, setSorts] = useState<ViewSort[]>(view.sorts);

  // ── Save ───────────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await updateViewAction(view.id, {
        label,
        description,
        pager: parseInt(pager, 10) || 25,
        status,
        display_fields: displayFields,
        filters,
        sorts,
      });
      if (!result.success) throw new Error(result.error);
      setSuccess('View saved successfully.');
      setTimeout(() => setSuccess(''), 3000);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save view');
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    try {
      const result = await executeViewAction(view.id);
      if (!result.success) throw new Error(result.error);
      setPreview(result.data as ViewExecuteResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute view');
    }
  }

  // ── Display Fields helpers ─────────────────────────────────────────
  function addField() {
    const unused = availableFields.find(
      (af) => !displayFields.some((df) => df.field === af.name),
    );
    if (unused) {
      setDisplayFields([...displayFields, { field: unused.name, label: unused.label }]);
    }
  }

  function removeField(idx: number) {
    setDisplayFields(displayFields.filter((_, i) => i !== idx));
  }

  function moveFieldUp(idx: number) {
    if (idx === 0) return;
    const arr = [...displayFields];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    setDisplayFields(arr);
  }

  function moveFieldDown(idx: number) {
    if (idx === displayFields.length - 1) return;
    const arr = [...displayFields];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    setDisplayFields(arr);
  }

  function updateDisplayField(idx: number, update: Partial<ViewField>) {
    setDisplayFields(displayFields.map((f, i) => (i === idx ? { ...f, ...update } : f)));
  }

  // ── Filter helpers ─────────────────────────────────────────────────
  function addFilter() {
    const field = availableFields[0]?.name ?? 'status';
    setFilters([...filters, { field, operator: '=', value: '' }]);
  }

  function removeFilter(idx: number) {
    setFilters(filters.filter((_, i) => i !== idx));
  }

  function updateFilter(idx: number, update: Partial<ViewFilter>) {
    setFilters(filters.map((f, i) => (i === idx ? { ...f, ...update } : f)));
  }

  // ── Sort helpers ───────────────────────────────────────────────────
  function addSort() {
    const field = availableFields[0]?.name ?? 'created';
    setSorts([...sorts, { field, direction: 'DESC' }]);
  }

  function removeSort(idx: number) {
    setSorts(sorts.filter((_, i) => i !== idx));
  }

  function updateSort(idx: number, update: Partial<ViewSort>) {
    setSorts(sorts.map((s, i) => (i === idx ? { ...s, ...update } : s)));
  }

  // ── Field select options (shared dropdown) ─────────────────────────
  const fieldOptions = availableFields.map((f) => (
    <option key={f.name} value={f.name}>
      {f.label} ({f.name})
    </option>
  ));

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
          <form onSubmit={handleSave}>
            {/* View settings */}
            <div className="bg-white border border-gin-border rounded-gin p-6 mb-6">
              <h2 className="text-base font-semibold text-gin-title mb-4">View settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-semibold text-gin-text-light mb-1.5">Label</label>
                  <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} required className="w-full" />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-gin-text-light mb-1.5">Description</label>
                  <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-gin-text-light mb-1.5">Items per page</label>
                    <input type="number" value={pager} onChange={(e) => setPager(e.target.value)} min="0" className="w-full" />
                    <p className="text-[12px] text-gin-text-light mt-1">0 = no pagination (show all)</p>
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-gin-text-light mb-1.5">Status</label>
                    <label className="inline-flex items-center gap-2 mt-1 cursor-pointer">
                      <input type="checkbox" checked={status} onChange={(e) => setStatus(e.target.checked)} className="rounded border-gin-border-form text-gin-primary focus:ring-gin-primary" />
                      <span className="text-sm text-gin-text-light">Enabled</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Display fields */}
            <div className="bg-white border border-gin-border rounded-gin p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gin-title">Display fields</h2>
                <button type="button" onClick={addField} className="inline-flex items-center gap-1 text-sm text-gin-primary hover:underline">
                  <Plus className="w-3.5 h-3.5" /> Add field
                </button>
              </div>
              {displayFields.length === 0 ? (
                <p className="text-sm text-gin-text-light">No fields selected — all fields will be shown.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gin-bg-layer2">
                      <th className="w-8"></th>
                      <th className="text-left px-3 py-2 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Field</th>
                      <th className="text-left px-3 py-2 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Label</th>
                      <th className="text-left px-3 py-2 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Formatter</th>
                      <th className="w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayFields.map((df, idx) => (
                      <tr key={idx} className="border-t border-gin-border hover:bg-gin-bg-layer2/50">
                        <td className="px-1 py-2 text-center">
                          <div className="flex flex-col items-center gap-0">
                            <button type="button" onClick={() => moveFieldUp(idx)} disabled={idx === 0} className="p-0.5 text-gin-text-light hover:text-gin-text disabled:opacity-20"><ArrowUp className="w-3 h-3" /></button>
                            <GripVertical className="w-3 h-3 text-gin-text-light/50" />
                            <button type="button" onClick={() => moveFieldDown(idx)} disabled={idx === displayFields.length - 1} className="p-0.5 text-gin-text-light hover:text-gin-text disabled:opacity-20"><ArrowDown className="w-3 h-3" /></button>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <select value={df.field} onChange={(e) => updateDisplayField(idx, { field: e.target.value })} className="border border-gin-border-form rounded-gin-s px-2 py-1 text-xs w-full">
                            {fieldOptions}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input type="text" value={df.label ?? ''} onChange={(e) => updateDisplayField(idx, { label: e.target.value })} placeholder="Auto" className="border border-gin-border-form rounded-gin-s px-2 py-1 text-xs w-full" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="text" value={df.formatter ?? ''} onChange={(e) => updateDisplayField(idx, { formatter: e.target.value })} placeholder="default" className="border border-gin-border-form rounded-gin-s px-2 py-1 text-xs w-full" />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button type="button" onClick={() => removeField(idx)} className="p-1 text-gin-danger hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Filters */}
            <div className="bg-white border border-gin-border rounded-gin p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gin-title">Filters</h2>
                <button type="button" onClick={addFilter} className="inline-flex items-center gap-1 text-sm text-gin-primary hover:underline">
                  <Plus className="w-3.5 h-3.5" /> Add filter
                </button>
              </div>
              {filters.length === 0 ? (
                <p className="text-sm text-gin-text-light">No filters configured.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gin-bg-layer2">
                      <th className="text-left px-3 py-2 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Field</th>
                      <th className="text-left px-3 py-2 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-32">Operator</th>
                      <th className="text-left px-3 py-2 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Value</th>
                      <th className="text-center px-3 py-2 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-20">Exposed</th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filters.map((f, idx) => (
                      <tr key={idx} className="border-t border-gin-border hover:bg-gin-bg-layer2/50">
                        <td className="px-3 py-2">
                          <select value={f.field} onChange={(e) => updateFilter(idx, { field: e.target.value })} className="border border-gin-border-form rounded-gin-s px-2 py-1 text-xs w-full">
                            {fieldOptions}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select value={f.operator} onChange={(e) => updateFilter(idx, { operator: e.target.value })} className="border border-gin-border-form rounded-gin-s px-2 py-1 text-xs w-full">
                            {OPERATORS.map((op) => (
                              <option key={op.value} value={op.value}>{op.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input type="text" value={String(f.value ?? '')} onChange={(e) => updateFilter(idx, { value: e.target.value })} placeholder="value" className="border border-gin-border-form rounded-gin-s px-2 py-1 text-xs w-full" />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <label className="inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={!!f.exposed} onChange={(e) => updateFilter(idx, { exposed: e.target.checked, expose_identifier: e.target.checked ? f.field : undefined })} className="rounded border-gin-border-form text-gin-primary focus:ring-gin-primary" />
                          </label>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button type="button" onClick={() => removeFilter(idx)} className="p-1 text-gin-danger hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Sorts */}
            <div className="bg-white border border-gin-border rounded-gin p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gin-title">Sort criteria</h2>
                <button type="button" onClick={addSort} className="inline-flex items-center gap-1 text-sm text-gin-primary hover:underline">
                  <Plus className="w-3.5 h-3.5" /> Add sort
                </button>
              </div>
              {sorts.length === 0 ? (
                <p className="text-sm text-gin-text-light">No sorts configured.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gin-bg-layer2">
                      <th className="text-left px-3 py-2 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Field</th>
                      <th className="text-left px-3 py-2 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-36">Direction</th>
                      <th className="text-center px-3 py-2 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-20">Exposed</th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorts.map((s, idx) => (
                      <tr key={idx} className="border-t border-gin-border hover:bg-gin-bg-layer2/50">
                        <td className="px-3 py-2">
                          <select value={s.field} onChange={(e) => updateSort(idx, { field: e.target.value })} className="border border-gin-border-form rounded-gin-s px-2 py-1 text-xs w-full">
                            {fieldOptions}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select value={s.direction} onChange={(e) => updateSort(idx, { direction: e.target.value })} className="border border-gin-border-form rounded-gin-s px-2 py-1 text-xs w-full">
                            <option value="ASC">Ascending</option>
                            <option value="DESC">Descending</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <label className="inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={!!s.exposed} onChange={(e) => updateSort(idx, { exposed: e.target.checked })} className="rounded border-gin-border-form text-gin-primary focus:ring-gin-primary" />
                          </label>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button type="button" onClick={() => removeSort(idx)} className="p-1 text-gin-danger hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mb-6">
              <button type="submit" disabled={saving} className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={handlePreview} className="border border-gin-border text-gin-text rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-bg-layer2 transition-colors">
                Preview
              </button>
            </div>
          </form>
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
            </dl>
          </div>

          <div className="bg-white border border-gin-border rounded-gin p-6 mt-4">
            <h3 className="text-[13px] font-semibold text-gin-text-light uppercase tracking-wider mb-3">Available fields</h3>
            <div className="max-h-64 overflow-y-auto">
              <ul className="space-y-1 text-xs">
                {availableFields.map((f) => (
                  <li key={f.name} className="flex items-center justify-between py-1 px-2 rounded hover:bg-gin-bg-layer2">
                    <span className="text-gin-text">{f.label}</span>
                    <code className="text-gin-text-light">{f.name}</code>
                  </li>
                ))}
              </ul>
            </div>
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
