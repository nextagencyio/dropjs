'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createView, deleteView } from '@/app/(admin)/_actions/system';
import { useToast } from '@/components/toast';

export function DeleteViewButton({ viewId }: { viewId: string }) {
  const router = useRouter();
  const { error: showError } = useToast();

  const handleDelete = async () => {
    if (!confirm(`Delete view "${viewId}"?`)) return;
    const result = await deleteView(viewId);
    if (result.success) {
      router.refresh();
    } else {
      showError(result.error ?? 'Failed to delete view');
    }
  };

  return (
    <button
      onClick={handleDelete}
      className="text-sm text-gin-danger hover:underline"
    >
      Delete
    </button>
  );
}

export function CreateViewForm() {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [newId, setNewId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newEntityType, setNewEntityType] = useState('node');
  const [error, setError] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const result = await createView({
      id: newId,
      label: newLabel,
      entity_type: newEntityType,
    });
    if (result.success) {
      setNewId('');
      setNewLabel('');
      setShowCreate(false);
      router.refresh();
    } else {
      setError(result.error ?? 'Failed to create view');
    }
  }

  return (
    <>
      <button
        onClick={() => setShowCreate(!showCreate)}
        className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors"
      >
        + Add view
      </button>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-gin-danger rounded-gin-s px-4 py-3 text-sm">{error}</div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="mt-4 mb-6 bg-white border border-gin-border rounded-gin p-6">
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
    </>
  );
}
