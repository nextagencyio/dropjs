'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createMenu, deleteMenu } from '@/app/(admin)/_actions/system';

export function DeleteMenuButton({ menuId }: { menuId: string }) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Delete the "${menuId}" menu?`)) return;
    const result = await deleteMenu(menuId);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error ?? 'Failed to delete menu');
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

export function CreateMenuForm() {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [newId, setNewId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const result = await createMenu({ id: newId, label: newLabel, description: newDescription });
    if (result.success) {
      setShowAdd(false);
      setNewId('');
      setNewLabel('');
      setNewDescription('');
      setSuccess('Menu created.');
      router.refresh();
    } else {
      setError(result.error ?? 'Failed to create menu');
    }
  };

  return (
    <>
      <button
        onClick={() => { setShowAdd(!showAdd); setError(''); setSuccess(''); }}
        className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors"
      >
        Add menu
      </button>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-gin-danger rounded-gin-s px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 bg-emerald-50 border border-emerald-200 text-gin-green rounded-gin-s px-4 py-3 text-sm">
          {success}
        </div>
      )}

      {showAdd && (
        <form onSubmit={handleCreate} className="mt-4 bg-white border border-gin-border rounded-gin p-6 mb-5 max-w-xl">
          <h2 className="text-base font-semibold text-gin-title mb-4">Add menu</h2>
          <div className="mb-4">
            <label htmlFor="menu-id" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Machine name
            </label>
            <input
              id="menu-id"
              type="text"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              className="w-full"
              placeholder="sidebar"
              pattern="^[a-z][a-z0-9_]*$"
              required
            />
            <p className="text-[12px] text-gin-text-light mt-1">Lowercase letters, numbers, and underscores only.</p>
          </div>
          <div className="mb-4">
            <label htmlFor="menu-label" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Title
            </label>
            <input
              id="menu-label"
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full"
              placeholder="Sidebar navigation"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="menu-desc" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Description
            </label>
            <input
              id="menu-desc"
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full"
              placeholder="Optional description"
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors">
              Create menu
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="border border-gin-border text-gin-text rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-bg-layer2 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}
    </>
  );
}
