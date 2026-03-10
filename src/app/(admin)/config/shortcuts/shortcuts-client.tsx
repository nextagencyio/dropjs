'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

interface Shortcut {
  id: number;
  uid?: number;
  title: string;
  path: string;
  weight: number;
}

interface ShortcutsClientProps {
  initialShortcuts: Shortcut[];
}

export default function ShortcutsClient({ initialShortcuts }: ShortcutsClientProps) {
  const router = useRouter();
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(initialShortcuts);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPath, setNewPath] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPath, setEditPath] = useState('');

  const loadShortcuts = () => {
    apiFetch<{ data: Shortcut[] }>('/shortcuts')
      .then((res) => {
        const sorted = [...res.data].sort((a, b) => a.weight - b.weight);
        setShortcuts(sorted);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load shortcuts');
      });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await apiFetch('/shortcuts', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle,
          path: newPath,
          weight: shortcuts.length,
        }),
      });
      setShowAdd(false);
      setNewTitle('');
      setNewPath('');
      setSuccess('Shortcut added.');
      loadShortcuts();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shortcut');
    }
  };

  const handleStartEdit = (shortcut: Shortcut) => {
    setEditingId(shortcut.id);
    setEditTitle(shortcut.title);
    setEditPath(shortcut.path);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setError('');
    setSuccess('');
    try {
      await apiFetch(`/shortcuts/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editTitle,
          path: editPath,
        }),
      });
      setEditingId(null);
      setSuccess('Shortcut updated.');
      loadShortcuts();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update shortcut');
    }
  };

  const handleDelete = async (shortcutId: number, title: string) => {
    if (!confirm(`Delete the "${title}" shortcut?`)) return;
    setError('');
    setSuccess('');
    try {
      await apiFetch(`/shortcuts/${shortcutId}`, { method: 'DELETE' });
      setSuccess('Shortcut deleted.');
      loadShortcuts();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete shortcut');
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    setError('');
    const items = [...shortcuts];
    const current = items[index];
    const above = items[index - 1];
    try {
      await Promise.all([
        apiFetch(`/shortcuts/${current.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ weight: above.weight }),
        }),
        apiFetch(`/shortcuts/${above.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ weight: current.weight }),
        }),
      ]);
      loadShortcuts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder shortcuts');
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === shortcuts.length - 1) return;
    setError('');
    const items = [...shortcuts];
    const current = items[index];
    const below = items[index + 1];
    try {
      await Promise.all([
        apiFetch(`/shortcuts/${current.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ weight: below.weight }),
        }),
        apiFetch(`/shortcuts/${below.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ weight: current.weight }),
        }),
      ]);
      loadShortcuts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder shortcuts');
    }
  };

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
        <span className="text-sm text-gin-text">Shortcuts</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title">Shortcuts</h1>
          <p className="text-gin-text-light text-sm mt-1">
            Manage your personal shortcut links for quick navigation.
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(!showAdd); setError(''); setSuccess(''); }}
          className="px-5 py-2.5 bg-gin-primary hover:bg-gin-primary-hover text-white text-sm font-semibold rounded-gin transition-colors"
        >
          Add shortcut
        </button>
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

      {showAdd && (
        <form onSubmit={handleCreate} className="bg-white rounded-gin-l border border-gin-border p-6 mb-5 max-w-xl">
          <h2 className="text-lg font-semibold text-gin-title mb-4">Add shortcut</h2>
          <div className="mb-5">
            <label htmlFor="shortcut-title" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Title
            </label>
            <input
              id="shortcut-title"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
              placeholder="Add content"
              required
            />
          </div>
          <div className="mb-5">
            <label htmlFor="shortcut-path" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Path
            </label>
            <input
              id="shortcut-path"
              type="text"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
              placeholder="/admin/content/add"
              required
            />
            <p className="text-xs text-gin-text-light mt-1.5">Internal path or URL for the shortcut.</p>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="px-5 py-2.5 bg-gin-primary hover:bg-gin-primary-hover text-white text-sm font-semibold rounded-gin transition-colors">
              Add shortcut
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-2.5 bg-white border border-gin-border text-gin-text text-sm font-semibold rounded-gin hover:bg-gin-bg-layer2 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {shortcuts.map((shortcut, index) => (
          <div
            key={shortcut.id}
            className="bg-white rounded-gin-l border border-gin-border p-4 flex items-center justify-between"
          >
            {editingId === shortcut.id ? (
              <div className="flex-1 flex items-center gap-3">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="rounded-gin-s px-3 py-1.5 text-sm text-gin-text border border-gin-border-form bg-white focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
                  placeholder="Title"
                />
                <input
                  type="text"
                  value={editPath}
                  onChange={(e) => setEditPath(e.target.value)}
                  className="flex-1 rounded-gin-s px-3 py-1.5 text-sm text-gin-text border border-gin-border-form bg-white focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
                  placeholder="/path"
                />
                <button
                  onClick={handleSaveEdit}
                  className="text-sm text-gin-green hover:underline"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-sm text-gin-text-light hover:text-gin-text"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="text-gin-text-light hover:text-gin-text disabled:opacity-30 disabled:cursor-not-allowed text-xs leading-none"
                      title="Move up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === shortcuts.length - 1}
                      className="text-gin-text-light hover:text-gin-text disabled:opacity-30 disabled:cursor-not-allowed text-xs leading-none"
                      title="Move down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <div className="font-medium text-gin-title text-sm">{shortcut.title}</div>
                    <div className="text-xs text-gin-text-light font-mono">{shortcut.path}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleStartEdit(shortcut)}
                    className="text-sm text-gin-primary hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(shortcut.id, shortcut.title)}
                    className="text-sm text-gin-danger hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {shortcuts.length === 0 && (
          <div className="bg-white rounded-gin-l border border-gin-border p-8 text-center text-gin-text-light">
            No shortcuts configured. Click &quot;Add shortcut&quot; to create one.
          </div>
        )}
      </div>
    </div>
  );
}
