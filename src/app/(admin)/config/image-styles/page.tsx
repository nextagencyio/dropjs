'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import {
  fetchImageStyles,
  createImageStyle,
  updateImageStyle,
  deleteImageStyle,
  type ImageStyle,
  type ImageStyleEffect,
} from '@/lib/api-system';

function EffectEditor({
  effects,
  onChange,
}: {
  effects: ImageStyleEffect[];
  onChange: (effects: ImageStyleEffect[]) => void;
}) {
  const addEffect = () => {
    onChange([...effects, { type: 'resize', width: 200, height: 200 }]);
  };

  const removeEffect = (idx: number) => {
    onChange(effects.filter((_, i) => i !== idx));
  };

  const updateEffect = (idx: number, patch: Partial<ImageStyleEffect>) => {
    onChange(
      effects.map((e, i) => (i === idx ? { ...e, ...patch } : e))
    );
  };

  return (
    <div className="space-y-2">
      {effects.map((effect, idx) => (
        <div
          key={idx}
          className="flex items-center gap-2 bg-gin-bg-layer2 rounded-gin-s p-2"
        >
          <select
            value={effect.type}
            onChange={(e) =>
              updateEffect(idx, {
                type: e.target.value as ImageStyleEffect['type'],
              })
            }
            className="rounded-gin-s px-2.5 py-1.5 text-sm text-gin-text border border-gin-border-form bg-white focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
          >
            <option value="resize">Resize</option>
            <option value="crop">Crop</option>
            <option value="scale">Scale</option>
          </select>
          <input
            type="number"
            value={effect.width}
            onChange={(e) =>
              updateEffect(idx, { width: parseInt(e.target.value, 10) || 0 })
            }
            className="w-20 rounded-gin-s px-2.5 py-1.5 text-sm text-gin-text border border-gin-border-form bg-white focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
            placeholder="Width"
            min={1}
          />
          <span className="text-gin-text-light text-sm">x</span>
          <input
            type="number"
            value={effect.height}
            onChange={(e) =>
              updateEffect(idx, { height: parseInt(e.target.value, 10) || 0 })
            }
            className="w-20 rounded-gin-s px-2.5 py-1.5 text-sm text-gin-text border border-gin-border-form bg-white focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
            placeholder="Height"
            min={1}
          />
          <span className="text-xs text-gin-text-light">px</span>
          <button
            type="button"
            onClick={() => removeEffect(idx)}
            className="text-gin-danger hover:underline text-sm ml-auto inline-flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addEffect}
        className="text-sm text-gin-primary hover:underline inline-flex items-center gap-1"
      >
        <Plus className="w-3.5 h-3.5" />
        Add effect
      </button>
    </div>
  );
}

export default function ImageStylesPage() {
  const [styles, setStyles] = useState<ImageStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editEffects, setEditEffects] = useState<ImageStyleEffect[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newId, setNewId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newEffects, setNewEffects] = useState<ImageStyleEffect[]>([]);

  useEffect(() => {
    fetchImageStyles()
      .then((data) => {
        setStyles(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : 'Failed to load image styles'
        );
        setLoading(false);
      });
  }, []);

  const startEdit = (style: ImageStyle) => {
    setEditing(style.id);
    setEditLabel(style.label);
    setEditEffects(style.effects.map((e) => ({ ...e })));
    setError('');
    setSuccess('');
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const handleSave = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      const updated = await updateImageStyle(id, {
        label: editLabel,
        effects: editEffects,
      });
      setStyles((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setEditing(null);
      setSuccess('Image style updated.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update image style'
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete image style "${id}"?`)) return;
    setError('');
    setSuccess('');
    try {
      await deleteImageStyle(id);
      setStyles((prev) => prev.filter((s) => s.id !== id));
      setSuccess('Image style deleted.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete image style'
      );
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const created = await createImageStyle({
        id: newId,
        label: newLabel,
        effects: newEffects,
      });
      setStyles((prev) => [...prev, created]);
      setShowAdd(false);
      setNewId('');
      setNewLabel('');
      setNewEffects([]);
      setSuccess('Image style created.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create image style'
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
        <span className="text-sm text-gin-text">Image styles</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[28px] font-normal tracking-tight text-gin-title">Image styles</h1>
        <button
          onClick={() => {
            setShowAdd(!showAdd);
            setError('');
            setSuccess('');
          }}
          className="px-5 py-2.5 bg-gin-primary hover:bg-gin-primary-hover text-white text-sm font-semibold rounded-gin transition-colors"
        >
          Add image style
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
            Add image style
          </h2>
          <div className="mb-5">
            <label
              htmlFor="new-style-id"
              className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
            >
              Machine name
            </label>
            <input
              id="new-style-id"
              type="text"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
              placeholder="custom_style"
              required
              pattern="[a-z][a-z0-9_]*"
              title="Lowercase letters, numbers, and underscores. Must start with a letter."
            />
          </div>
          <div className="mb-5">
            <label
              htmlFor="new-style-label"
              className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
            >
              Label
            </label>
            <input
              id="new-style-label"
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
              placeholder="Custom style"
              required
            />
          </div>
          <div className="mb-5">
            <label className="block text-[13px] font-semibold text-gin-text-light mb-2">
              Effects
            </label>
            <EffectEditor effects={newEffects} onChange={setNewEffects} />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="px-5 py-2.5 bg-gin-primary hover:bg-gin-primary-hover text-white text-sm font-semibold rounded-gin transition-colors"
            >
              Create style
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

      <div className="space-y-4">
        {styles.map((style) => (
          <div key={style.id} className="bg-white rounded-gin-l border border-gin-border p-5">
            {editing === style.id ? (
              <div>
                <div className="mb-4">
                  <label className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
                    Label
                  </label>
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="w-full max-w-sm rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
                  />
                  <span className="text-xs text-gin-text-light ml-2">
                    {style.id}
                  </span>
                </div>
                <div className="mb-5">
                  <label className="block text-[13px] font-semibold text-gin-text-light mb-2">
                    Effects
                  </label>
                  <EffectEditor
                    effects={editEffects}
                    onChange={setEditEffects}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleSave(style.id)}
                    className="px-5 py-2.5 bg-gin-primary hover:bg-gin-primary-hover text-white text-sm font-semibold rounded-gin transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-5 py-2.5 bg-white border border-gin-border text-gin-text text-sm font-semibold rounded-gin hover:bg-gin-bg-layer2 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gin-title">{style.label}</h3>
                  <p className="text-xs text-gin-text-light mb-2">{style.id}</p>
                  {style.effects.length > 0 ? (
                    <div className="space-y-1">
                      {style.effects.map((effect, idx) => (
                        <span
                          key={idx}
                          className="inline-block mr-2 px-2 py-0.5 bg-gin-bg-layer2 text-gin-text text-xs rounded-gin-s"
                        >
                          {effect.type}: {effect.width}x{effect.height}px
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gin-text-light">
                      No effects configured
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => startEdit(style)}
                    className="text-sm text-gin-primary hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(style.id)}
                    className="text-sm text-gin-danger hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {styles.length === 0 && (
          <div className="bg-white rounded-gin-l border border-gin-border p-8 text-center text-gin-text-light">
            No image styles configured.
          </div>
        )}
      </div>
    </div>
  );
}
