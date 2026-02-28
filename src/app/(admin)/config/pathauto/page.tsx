'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';

interface PathautoPattern {
  id: string;
  entity_type: string;
  bundle: string | null;
  pattern: string;
  weight: number;
  enabled: boolean;
}

const TOKEN_HELP = [
  { token: '[entity:title]', description: 'Entity title (slugified)' },
  { token: '[entity:nid]', description: 'Entity numeric ID' },
  { token: '[entity:bundle]', description: 'Bundle machine name' },
  { token: '[entity:type]', description: 'Entity type (e.g. node)' },
  { token: '[entity:langcode]', description: 'Language code' },
  { token: '[date:year]', description: 'Current year (YYYY)' },
  { token: '[date:month]', description: 'Current month (01-12)' },
  { token: '[date:day]', description: 'Current day (01-31)' },
];

export default function PathautoPage() {
  const [patterns, setPatterns] = useState<PathautoPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [newId, setNewId] = useState('');
  const [newEntityType, setNewEntityType] = useState('node');
  const [newBundle, setNewBundle] = useState('');
  const [newPattern, setNewPattern] = useState('[entity:bundle]/[entity:title]');
  const [newWeight, setNewWeight] = useState(0);

  const [bulkEntityType, setBulkEntityType] = useState('node');
  const [bulkBundle, setBulkBundle] = useState('');
  const [showBulk, setShowBulk] = useState(false);

  const loadPatterns = () => {
    setLoading(true);
    apiFetch<{ data: PathautoPattern[] }>('/pathauto/patterns')
      .then((res) => {
        setPatterns(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load patterns');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadPatterns();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await apiFetch('/pathauto/patterns', {
        method: 'POST',
        body: JSON.stringify({
          id: newId,
          entity_type: newEntityType,
          bundle: newBundle || null,
          pattern: newPattern,
          weight: newWeight,
          enabled: true,
        }),
      });
      setShowAdd(false);
      setNewId('');
      setNewBundle('');
      setNewPattern('[entity:bundle]/[entity:title]');
      setNewWeight(0);
      setSuccess('Pattern created.');
      loadPatterns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pattern');
    }
  };

  const handleToggleEnabled = async (p: PathautoPattern) => {
    setError('');
    try {
      await apiFetch(`/pathauto/patterns/${p.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !p.enabled }),
      });
      loadPatterns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle pattern');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this pattern?')) return;
    setError('');
    setSuccess('');
    try {
      await apiFetch(`/pathauto/patterns/${id}`, { method: 'DELETE' });
      setSuccess('Pattern deleted.');
      loadPatterns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete pattern');
    }
  };

  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await apiFetch<{ data: { generated: number } }>(
        '/pathauto/generate',
        {
          method: 'POST',
          body: JSON.stringify({
            entity_type: bulkEntityType,
            bundle: bulkBundle || undefined,
          }),
        },
      );
      setSuccess(`Generated ${res.data.generated} aliases.`);
      setShowBulk(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate aliases',
      );
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-gin border border-gin-border p-8 text-center text-gin-text-light">
        Loading...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <Link
          href="/config"
          className="text-sm text-gin-primary hover:underline"
        >
          Configuration
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text">URL alias patterns</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title">
            URL Alias Patterns
          </h1>
          <p className="text-gin-text-light text-sm mt-1">
            Configure automatic URL alias generation per content type using
            token-based patterns.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowBulk(!showBulk);
              setShowAdd(false);
              setError('');
              setSuccess('');
            }}
            className="px-5 py-2.5 bg-white border border-gin-border text-gin-text text-sm font-semibold rounded-gin hover:bg-gin-bg-layer2 transition-colors"
          >
            Bulk generate
          </button>
          <button
            onClick={() => {
              setShowAdd(!showAdd);
              setShowBulk(false);
              setError('');
              setSuccess('');
            }}
            className="px-5 py-2.5 bg-gin-primary hover:bg-gin-primary-hover text-white text-sm font-semibold rounded-gin transition-colors"
          >
            Add pattern
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-gin-danger rounded-gin-s text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 text-gin-green rounded-gin-s text-sm">
          {success}
        </div>
      )}

      {showBulk && (
        <form
          onSubmit={handleBulkGenerate}
          className="bg-white rounded-gin-l border border-gin-border p-6 mb-5 max-w-xl"
        >
          <h2 className="text-lg font-semibold text-gin-title mb-4">
            Bulk generate aliases
          </h2>
          <p className="text-sm text-gin-text-light mb-4">
            Regenerate URL aliases for all existing entities using current
            patterns.
          </p>
          <div className="mb-5">
            <label
              htmlFor="bulk-entity-type"
              className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
            >
              Entity type
            </label>
            <input
              id="bulk-entity-type"
              type="text"
              value={bulkEntityType}
              onChange={(e) => setBulkEntityType(e.target.value)}
              className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
              required
            />
          </div>
          <div className="mb-5">
            <label
              htmlFor="bulk-bundle"
              className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
            >
              Bundle (optional)
            </label>
            <input
              id="bulk-bundle"
              type="text"
              value={bulkBundle}
              onChange={(e) => setBulkBundle(e.target.value)}
              className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
              placeholder="Leave blank for all bundles"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="px-5 py-2.5 bg-gin-primary hover:bg-gin-primary-hover text-white text-sm font-semibold rounded-gin transition-colors"
            >
              Generate
            </button>
            <button
              type="button"
              onClick={() => setShowBulk(false)}
              className="px-5 py-2.5 bg-white border border-gin-border text-gin-text text-sm font-semibold rounded-gin hover:bg-gin-bg-layer2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {showAdd && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-gin-l border border-gin-border p-6 mb-5 max-w-xl"
        >
          <h2 className="text-lg font-semibold text-gin-title mb-4">
            Add pattern
          </h2>
          <div className="mb-5">
            <label
              htmlFor="pattern-id"
              className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
            >
              Machine name
            </label>
            <input
              id="pattern-id"
              type="text"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
              placeholder="e.g. node_article"
              pattern="^[a-z0-9_]+$"
              required
            />
          </div>
          <div className="mb-5">
            <label
              htmlFor="pattern-entity-type"
              className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
            >
              Entity type
            </label>
            <input
              id="pattern-entity-type"
              type="text"
              value={newEntityType}
              onChange={(e) => setNewEntityType(e.target.value)}
              className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
              required
            />
          </div>
          <div className="mb-5">
            <label
              htmlFor="pattern-bundle"
              className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
            >
              Bundle (optional)
            </label>
            <input
              id="pattern-bundle"
              type="text"
              value={newBundle}
              onChange={(e) => setNewBundle(e.target.value)}
              className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
              placeholder="Leave blank for all bundles"
            />
          </div>
          <div className="mb-5">
            <label
              htmlFor="pattern-pattern"
              className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
            >
              URL pattern
            </label>
            <input
              id="pattern-pattern"
              type="text"
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text font-mono border border-gin-border-form bg-white focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
              required
            />
            <div className="mt-2 bg-gin-bg-layer2 rounded-gin-s p-3">
              <p className="text-xs font-semibold text-gin-text mb-1">
                Available tokens:
              </p>
              <div className="grid grid-cols-2 gap-1">
                {TOKEN_HELP.map((t) => (
                  <div key={t.token} className="text-xs text-gin-text-light">
                    <code className="bg-gin-bg-app px-1 py-0.5 rounded-gin-s text-gin-text">
                      {t.token}
                    </code>{' '}
                    {t.description}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mb-5">
            <label
              htmlFor="pattern-weight"
              className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
            >
              Weight
            </label>
            <input
              id="pattern-weight"
              type="number"
              value={newWeight}
              onChange={(e) => setNewWeight(parseInt(e.target.value, 10) || 0)}
              className="w-32 rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="px-5 py-2.5 bg-gin-primary hover:bg-gin-primary-hover text-white text-sm font-semibold rounded-gin transition-colors"
            >
              Create pattern
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-5 py-2.5 bg-white border border-gin-border text-gin-text text-sm font-semibold rounded-gin hover:bg-gin-bg-layer2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-gin-l border border-gin-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gin-bg-layer2 border-b border-gin-border-table">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">
                Pattern
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">
                Entity type
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">
                Bundle
              </th>
              <th className="text-center px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">
                Status
              </th>
              <th className="text-right px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">
                Operations
              </th>
            </tr>
          </thead>
          <tbody>
            {patterns.map((p) => (
              <tr
                key={p.id}
                className="border-b border-gin-border-table last:border-0"
              >
                <td className="px-4 py-3">
                  <code className="text-xs bg-gin-bg-layer2 text-gin-text px-1.5 py-0.5 rounded-gin-s">
                    {p.pattern}
                  </code>
                  <div className="text-xs text-gin-text-light mt-0.5">{p.id}</div>
                </td>
                <td className="px-4 py-3 text-gin-text">{p.entity_type}</td>
                <td className="px-4 py-3 text-gin-text">
                  {p.bundle || (
                    <span className="text-gin-text-light italic">All</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggleEnabled(p)}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      p.enabled
                        ? 'bg-emerald-50 text-gin-green'
                        : 'bg-gin-bg-layer2 text-gin-text-light'
                    }`}
                  >
                    {p.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-sm text-gin-danger hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {patterns.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-gin-text-light"
                >
                  No URL alias patterns configured. The default pattern
                  [entity:bundle]/[entity:title] will be used.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
