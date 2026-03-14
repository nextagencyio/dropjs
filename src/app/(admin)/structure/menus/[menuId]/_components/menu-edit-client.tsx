'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  addMenuItemAction,
  updateMenuItemAction,
  deleteMenuItemAction,
} from '@/app/(admin)/_actions/system';

interface MenuItem {
  id: string;
  title: string;
  url: string;
  weight: number;
  parent: string | null;
  enabled: boolean;
  expanded: boolean;
  description?: string;
}

interface MenuTreeItem extends MenuItem {
  children: MenuTreeItem[];
}

export interface MenuDetailData {
  id: string;
  label: string;
  description?: string;
  items: MenuItem[];
  tree: MenuTreeItem[];
}

export default function MenuEditClient({ menu: initialMenu }: { menu: MenuDetailData }) {
  const router = useRouter();
  const menuId = initialMenu.id;
  const [menu, setMenu] = useState(initialMenu);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add item form
  const [showAdd, setShowAdd] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addUrl, setAddUrl] = useState('');
  const [addWeight, setAddWeight] = useState(0);
  const [addDescription, setAddDescription] = useState('');
  const [addParent, setAddParent] = useState('');
  const [addEnabled, setAddEnabled] = useState(true);

  // Edit item
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editWeight, setEditWeight] = useState(0);
  const [editEnabled, setEditEnabled] = useState(true);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const result = await addMenuItemAction(menuId, {
        title: addTitle,
        url: addUrl,
        weight: addWeight,
        parent: addParent || null,
        enabled: addEnabled,
        description: addDescription || undefined,
      });
      if (!result.success) throw new Error(result.error);
      setShowAdd(false);
      setAddTitle('');
      setAddUrl('');
      setAddWeight(0);
      setAddDescription('');
      setAddParent('');
      setAddEnabled(true);
      setSuccess('Menu link added.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add menu link');
    }
  };

  const handleStartEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditUrl(item.url);
    setEditWeight(item.weight);
    setEditEnabled(item.enabled);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setError('');
    setSuccess('');
    try {
      const result = await updateMenuItemAction(menuId, editingId, {
        title: editTitle,
        url: editUrl,
        weight: editWeight,
        enabled: editEnabled,
      });
      if (!result.success) throw new Error(result.error);
      setEditingId(null);
      setSuccess('Menu link updated.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update menu link');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Delete this menu link?')) return;
    setError('');
    setSuccess('');
    try {
      const result = await deleteMenuItemAction(menuId, itemId);
      if (!result.success) throw new Error(result.error);
      setSuccess('Menu link deleted.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete menu link');
    }
  };

  const handleToggleEnabled = async (item: MenuItem) => {
    setError('');
    try {
      const result = await updateMenuItemAction(menuId, item.id, { enabled: !item.enabled });
      if (!result.success) throw new Error(result.error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle link');
    }
  };

  // Flatten tree for display with indentation
  const flatItems: Array<{ item: MenuItem; depth: number }> = [];
  const flatten = (nodes: MenuTreeItem[], depth: number) => {
    for (const node of nodes) {
      flatItems.push({ item: node, depth });
      if (node.children.length > 0) {
        flatten(node.children, depth + 1);
      }
    }
  };
  flatten(menu.tree, 0);

  return (
    <div>
      <nav className="mb-5 flex items-center gap-0">
        <Link href="/structure/menus" className="text-gin-primary hover:underline text-sm">
          Menus
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">{menu.label}</span>
      </nav>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title">{menu.label}</h1>
          {menu.description && (
            <p className="text-gin-text-light text-sm mt-1">{menu.description}</p>
          )}
        </div>
        <button
          onClick={() => { setShowAdd(!showAdd); setError(''); setSuccess(''); }}
          className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors"
        >
          Add link
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
        <form onSubmit={handleAddItem} className="bg-white border border-gin-border rounded-gin p-6 mb-5 max-w-xl">
          <h2 className="text-base font-semibold text-gin-title mb-4">Add menu link</h2>
          <div className="mb-4">
            <label htmlFor="link-title" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Menu link title
            </label>
            <input
              id="link-title"
              type="text"
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              className="w-full"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="link-url" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Link
            </label>
            <input
              id="link-url"
              type="text"
              value={addUrl}
              onChange={(e) => setAddUrl(e.target.value)}
              className="w-full"
              placeholder="https://example.com or /about"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="link-weight" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Weight
            </label>
            <input
              id="link-weight"
              type="number"
              value={addWeight}
              onChange={(e) => setAddWeight(parseInt(e.target.value, 10) || 0)}
              className="w-full"
            />
            <p className="text-[12px] text-gin-text-light mt-1">Lower weight items appear first.</p>
          </div>
          {menu.items.length > 0 && (
            <div className="mb-4">
              <label htmlFor="link-parent" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
                Parent link
              </label>
              <select
                id="link-parent"
                value={addParent}
                onChange={(e) => setAddParent(e.target.value)}
                className="w-full"
              >
                <option value="">-- None (top level) --</option>
                {menu.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="mb-4">
            <label htmlFor="link-desc" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Description
            </label>
            <input
              id="link-desc"
              type="text"
              value={addDescription}
              onChange={(e) => setAddDescription(e.target.value)}
              className="w-full"
              placeholder="Shown as title attribute on the link"
            />
          </div>
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm text-gin-text cursor-pointer">
              <input
                type="checkbox"
                checked={addEnabled}
                onChange={(e) => setAddEnabled(e.target.checked)}
                className="rounded border-gin-border-form text-gin-primary focus:ring-gin-primary"
              />
              Enabled
            </label>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors">
              Add link
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="border border-gin-border text-gin-text rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-bg-layer2 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gin-border rounded-gin overflow-x-auto">
        <table className="w-full min-w-[500px] text-sm">
          <thead>
            <tr className="bg-gin-bg-layer2 border-b border-gin-border-table">
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Menu link</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">URL</th>
              <th className="text-center px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Enabled</th>
              <th className="text-center px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Weight</th>
              <th className="text-right px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Operations</th>
            </tr>
          </thead>
          <tbody>
            {flatItems.map(({ item, depth }) => (
              <tr key={item.id} className="hover:bg-gin-bg-layer2/50 transition-colors">
                {editingId === item.id ? (
                  <>
                    <td className="px-4 py-2 text-sm border-t border-gin-border">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full"
                      />
                    </td>
                    <td className="px-4 py-2 text-sm border-t border-gin-border">
                      <input
                        type="text"
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        className="w-full"
                      />
                    </td>
                    <td className="px-4 py-2 text-sm text-center border-t border-gin-border">
                      <input
                        type="checkbox"
                        checked={editEnabled}
                        onChange={(e) => setEditEnabled(e.target.checked)}
                        className="rounded border-gin-border-form text-gin-primary focus:ring-gin-primary"
                      />
                    </td>
                    <td className="px-4 py-2 text-sm text-center border-t border-gin-border">
                      <input
                        type="number"
                        value={editWeight}
                        onChange={(e) => setEditWeight(parseInt(e.target.value, 10) || 0)}
                        className="w-16 text-center"
                      />
                    </td>
                    <td className="px-4 py-2 text-sm text-right border-t border-gin-border space-x-2">
                      <button
                        onClick={handleSaveEdit}
                        className="text-sm text-gin-green hover:underline"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-sm text-gin-text-light hover:underline"
                      >
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-sm border-t border-gin-border">
                      <span className={`font-medium ${item.enabled ? 'text-gin-title' : 'text-gin-text-light'}`}>
                        {depth > 0 && <span className="text-gin-text-light mr-1">{'\u00A0\u00A0'.repeat(depth)}{'-- '}</span>}
                        {item.title}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text-light font-mono text-xs border-t border-gin-border">{item.url}</td>
                    <td className="px-4 py-3 text-sm text-center border-t border-gin-border">
                      <button
                        onClick={() => handleToggleEnabled(item)}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.enabled
                            ? 'bg-emerald-50 text-gin-green'
                            : 'bg-gray-100 text-gin-text-light'
                        }`}
                      >
                        {item.enabled ? 'Yes' : 'No'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gin-text-light border-t border-gin-border">{item.weight}</td>
                    <td className="px-4 py-3 text-sm text-right border-t border-gin-border space-x-3">
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="text-sm text-gin-primary hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-sm text-gin-danger hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {flatItems.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gin-text-light">
                  No menu links yet. Click &quot;Add link&quot; to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
