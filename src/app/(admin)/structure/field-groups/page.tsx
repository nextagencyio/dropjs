'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';

interface FieldGroup {
  id: string;
  name: string;
  label: string;
  format: string;
  fields: string[];
  parent: string | null;
  description: string;
  open: boolean;
}

interface FieldLayoutItem {
  field_name: string;
  label: string;
  type: string;
  group: string | null;
  weight: number;
}

const FORMAT_OPTIONS = [
  { value: 'fieldset', label: 'Fieldset' },
  { value: 'tabs', label: 'Tabs' },
  { value: 'tab', label: 'Tab' },
  { value: 'details', label: 'Details' },
  { value: 'accordion', label: 'Accordion' },
  { value: 'accordion_item', label: 'Accordion item' },
  { value: 'html_element', label: 'HTML element' },
];

export default function FieldGroupsPage() {
  return (
    <Suspense fallback={<div className="text-gin-text-light">Loading...</div>}>
      <FieldGroupsInner />
    </Suspense>
  );
}

function FieldGroupsInner() {
  const searchParams = useSearchParams();
  const entityType = searchParams.get('entityType') ?? '';
  const bundle = searchParams.get('bundle') ?? '';
  const viewMode = searchParams.get('viewMode') ?? 'default';

  const [groups, setGroups] = useState<FieldGroup[]>([]);
  const [layout, setLayout] = useState<FieldLayoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newFormat, setNewFormat] = useState('fieldset');
  const [newParent, setNewParent] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newOpen, setNewOpen] = useState(false);

  const loadData = async () => {
    if (!entityType || !bundle || !viewMode) return;
    setLoading(true);
    try {
      const [groupsRes, layoutRes] = await Promise.all([
        apiFetch<{ data: FieldGroup[] }>(`/field-groups/${entityType}/${bundle}/${viewMode}`),
        apiFetch<{ data: FieldLayoutItem[] }>(`/field-layout/${entityType}/${bundle}/${viewMode}`).catch(() => ({ data: [] as FieldLayoutItem[] })),
      ]);
      setGroups(groupsRes.data);
      setLayout(layoutRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load field groups');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [entityType, bundle, viewMode]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityType || !bundle || !viewMode) return;
    setError('');
    setSuccess('');
    try {
      await apiFetch(`/field-groups/${entityType}/${bundle}/${viewMode}`, {
        method: 'POST',
        body: JSON.stringify({
          name: newName,
          label: newLabel,
          format: newFormat,
          parent: newParent || null,
          description: newDescription,
          open: newOpen,
        }),
      });
      setShowAdd(false);
      setNewName('');
      setNewLabel('');
      setNewFormat('fieldset');
      setNewParent('');
      setNewDescription('');
      setNewOpen(false);
      setSuccess('Field group created.');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create field group');
    }
  };

  const handleDelete = async (groupId: string, label: string) => {
    if (!confirm(`Delete the "${label}" field group?`)) return;
    if (!entityType || !bundle || !viewMode) return;
    setError('');
    setSuccess('');
    try {
      await apiFetch(`/field-groups/${entityType}/${bundle}/${viewMode}/${groupId}`, {
        method: 'DELETE',
      });
      setSuccess('Field group deleted.');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete field group');
    }
  };

  if (loading) {
    return (
      <div>
        <div className="h-8 w-48 animate-pulse bg-gin-bg-layer2 rounded-gin-s mb-5" />
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

  // Build parent group lookup
  const groupLookup: Record<string, string> = {};
  for (const group of groups) {
    groupLookup[group.id] = group.label;
  }

  return (
    <div>
      <nav className="mb-5 flex items-center gap-0">
        <Link
          href="/structure"
          className="text-gin-primary hover:underline text-sm"
        >
          Structure
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">
          Field groups: {entityType} / {bundle} / {viewMode}
        </span>
      </nav>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title">Field Groups</h1>
          <p className="text-gin-text-light text-sm mt-1">
            Manage field groups for <strong>{entityType}</strong> &mdash;{' '}
            <strong>{bundle}</strong> ({viewMode} mode).
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(!showAdd); setError(''); setSuccess(''); }}
          className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors"
        >
          Add field group
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-gin-danger rounded-gin-s px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-gin-green rounded-gin-s px-4 py-3 text-sm">
          {success}
        </div>
      )}

      {showAdd && (
        <form onSubmit={handleCreate} className="bg-white border border-gin-border rounded-gin p-6 mb-5 max-w-xl">
          <h2 className="text-base font-semibold text-gin-title mb-4">Add field group</h2>
          <div className="mb-4">
            <label htmlFor="fg-name" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Machine name
            </label>
            <input
              id="fg-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full"
              placeholder="group_content"
              pattern="^[a-z][a-z0-9_]*$"
              required
            />
            <p className="text-[12px] text-gin-text-light mt-1">Lowercase letters, numbers, and underscores only.</p>
          </div>
          <div className="mb-4">
            <label htmlFor="fg-label" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Label
            </label>
            <input
              id="fg-label"
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full"
              placeholder="Content"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="fg-format" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Format
            </label>
            <select
              id="fg-format"
              value={newFormat}
              onChange={(e) => setNewFormat(e.target.value)}
              className="w-full"
              required
            >
              {FORMAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {groups.length > 0 && (
            <div className="mb-4">
              <label htmlFor="fg-parent" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
                Parent group
              </label>
              <select
                id="fg-parent"
                value={newParent}
                onChange={(e) => setNewParent(e.target.value)}
                className="w-full"
              >
                <option value="">-- None (top level) --</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="mb-4">
            <label htmlFor="fg-description" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Description
            </label>
            <input
              id="fg-description"
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full"
              placeholder="Optional description"
            />
          </div>
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm text-gin-text cursor-pointer">
              <input
                type="checkbox"
                checked={newOpen}
                onChange={(e) => setNewOpen(e.target.checked)}
                className="rounded border-gin-border-form text-gin-primary focus:ring-gin-primary"
              />
              Open by default
            </label>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors"
            >
              Create field group
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="border border-gin-border text-gin-text rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-bg-layer2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Field groups table */}
      <div className="bg-white border border-gin-border rounded-gin overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gin-bg-layer2 border-b border-gin-border-table">
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Label</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Format</th>
              <th className="text-center px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Fields</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Parent</th>
              <th className="text-right px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Operations</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.id} className="hover:bg-gin-bg-layer2/50 transition-colors">
                <td className="px-4 py-3 text-sm text-gin-text border-t border-gin-border">
                  <div className="font-medium text-gin-title">{group.label}</div>
                  <div className="text-[12px] text-gin-text-light font-mono">{group.name}</div>
                </td>
                <td className="px-4 py-3 text-sm border-t border-gin-border">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gin-bg-layer2 text-gin-text-light">
                    {group.format}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-center text-gin-text-light border-t border-gin-border">
                  {group.fields ? group.fields.length : 0}
                </td>
                <td className="px-4 py-3 text-sm text-gin-text-light border-t border-gin-border">
                  {group.parent ? (groupLookup[group.parent] || group.parent) : '\u2014'}
                </td>
                <td className="px-4 py-3 text-sm text-right border-t border-gin-border">
                  <button
                    onClick={() => handleDelete(group.id, group.label)}
                    className="text-sm text-gin-danger hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {groups.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gin-text-light">
                  No field groups configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Field layout preview */}
      {layout.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gin-title mb-3">Field Layout</h2>
          <p className="text-gin-text-light text-sm mb-3">
            Current field arrangement showing group assignments.
          </p>
          <div className="bg-white border border-gin-border rounded-gin overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gin-bg-layer2 border-b border-gin-border-table">
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Field</th>
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Label</th>
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Group</th>
                  <th className="text-center px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Weight</th>
                </tr>
              </thead>
              <tbody>
                {layout.map((item) => (
                  <tr key={item.field_name} className="hover:bg-gin-bg-layer2/50 transition-colors">
                    <td className="px-4 py-3 text-sm border-t border-gin-border">
                      <code className="text-xs bg-gin-bg-layer2 px-1.5 py-0.5 rounded-gin-s text-gin-text">{item.field_name}</code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text font-medium border-t border-gin-border">{item.label}</td>
                    <td className="px-4 py-3 text-sm text-gin-text-light border-t border-gin-border">{item.type}</td>
                    <td className="px-4 py-3 text-sm text-gin-text-light border-t border-gin-border">
                      {item.group ? (groupLookup[item.group] || item.group) : '\u2014'}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gin-text-light border-t border-gin-border">{item.weight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
