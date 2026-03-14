'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createTextFormat,
  deleteTextFormat,
} from '@/app/(admin)/_actions/system';

interface TextFormat {
  id: string;
  label: string;
  allowed_tags: string;
}

interface TextFormatsClientProps {
  initialFormats: TextFormat[];
}

export default function TextFormatsClient({ initialFormats }: TextFormatsClientProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editTags, setEditTags] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newId, setNewId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newTags, setNewTags] = useState('');

  const startEdit = (format: TextFormat) => {
    setEditing(format.id);
    setEditLabel(format.label);
    setEditTags(format.allowed_tags);
    setError('');
    setSuccess('');
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditLabel('');
    setEditTags('');
  };

  const handleSave = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      // Re-create the format with updated data (config storage is key-value)
      const result = await createTextFormat({
        id,
        label: editLabel,
        allowed_tags: editTags,
      });
      if (!result.success) {
        setError(result.error || 'Failed to update text format');
        return;
      }
      setEditing(null);
      setSuccess('Text format updated.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update text format');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete text format "${id}"?`)) return;
    setError('');
    setSuccess('');
    try {
      const result = await deleteTextFormat(id);
      if (!result.success) {
        setError(result.error || 'Failed to delete text format');
        return;
      }
      setSuccess('Text format deleted.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete text format');
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const result = await createTextFormat({
        id: newId,
        label: newLabel,
        allowed_tags: newTags,
      });
      if (!result.success) {
        setError(result.error || 'Failed to create text format');
        return;
      }
      setShowAdd(false);
      setNewId('');
      setNewLabel('');
      setNewTags('');
      setSuccess('Text format created.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create text format');
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
        <span className="text-sm text-gin-text">Text formats and editors</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[28px] font-normal tracking-tight text-gin-title">
          Text formats and editors
        </h1>
        <button
          onClick={() => {
            setShowAdd(!showAdd);
            setError('');
            setSuccess('');
          }}
          className="px-5 py-2.5 bg-gin-primary hover:bg-gin-primary-hover text-white text-sm font-semibold rounded-gin transition-colors"
        >
          Add text format
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
        <form
          onSubmit={handleAdd}
          className="bg-white rounded-gin-l border border-gin-border p-6 mb-5 max-w-xl"
        >
          <h2 className="text-lg font-semibold text-gin-title mb-4">
            Add text format
          </h2>
          <div className="mb-5">
            <label
              htmlFor="new-id"
              className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
            >
              Machine name
            </label>
            <input
              id="new-id"
              type="text"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
              placeholder="custom_format"
              required
              pattern="[a-z][a-z0-9_]*"
              title="Lowercase letters, numbers, and underscores. Must start with a letter."
            />
          </div>
          <div className="mb-5">
            <label
              htmlFor="new-label"
              className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
            >
              Label
            </label>
            <input
              id="new-label"
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
              placeholder="Custom format"
              required
            />
          </div>
          <div className="mb-5">
            <label
              htmlFor="new-tags"
              className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
            >
              Allowed HTML tags
            </label>
            <textarea
              id="new-tags"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              rows={3}
              className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
              placeholder="<p> <br> <strong> <em>"
            />
            <p className="text-xs text-gin-text-light mt-1.5">
              Space-separated list of allowed HTML tags. Leave empty for plain text.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="px-5 py-2.5 bg-gin-primary hover:bg-gin-primary-hover text-white text-sm font-semibold rounded-gin transition-colors"
            >
              Create format
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

      <div className="bg-white rounded-gin-l border border-gin-border overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead className="bg-gin-bg-layer2 border-b border-gin-border-table">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">
                Name
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">
                Allowed tags
              </th>
              <th className="text-right px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">
                Operations
              </th>
            </tr>
          </thead>
          <tbody>
            {initialFormats.map((format) => (
              <tr
                key={format.id}
                className="border-b border-gin-border-table last:border-0"
              >
                {editing === format.id ? (
                  <>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="w-full rounded-gin-s px-2.5 py-1.5 text-sm text-gin-text border border-gin-border-form bg-white focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
                      />
                      <span className="text-xs text-gin-text-light">
                        {format.id}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <textarea
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        rows={2}
                        className="w-full rounded-gin-s px-2.5 py-1.5 text-sm text-gin-text border border-gin-border-form bg-white focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleSave(format.id)}
                        className="text-sm text-gin-primary hover:underline mr-3"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-sm text-gin-text-light hover:text-gin-text"
                      >
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gin-title">
                        {format.label}
                      </span>
                      <br />
                      <span className="text-xs text-gin-text-light">
                        {format.id}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gin-text text-xs font-mono">
                        {format.allowed_tags || '(no HTML allowed)'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => startEdit(format)}
                        className="text-sm text-gin-primary hover:underline mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(format.id)}
                        className="text-sm text-gin-danger hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {initialFormats.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-8 text-center text-gin-text-light"
                >
                  No text formats configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
