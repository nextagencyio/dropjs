'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchMenus,
  createMenu,
  deleteMenu,
  type MenuSummary,
} from '@/lib/api-system';

export default function MenuListPage() {
  const [menus, setMenus] = useState<MenuSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newId, setNewId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const loadMenus = () => {
    setLoading(true);
    fetchMenus()
      .then((data) => {
        setMenus(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load menus');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadMenus();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await createMenu({ id: newId, label: newLabel, description: newDescription });
      setShowAdd(false);
      setNewId('');
      setNewLabel('');
      setNewDescription('');
      setSuccess('Menu created.');
      loadMenus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create menu');
    }
  };

  const handleDelete = async (menuId: string) => {
    if (!confirm(`Delete the "${menuId}" menu?`)) return;
    setError('');
    setSuccess('');
    try {
      await deleteMenu(menuId);
      setSuccess('Menu deleted.');
      loadMenus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete menu');
    }
  };

  if (loading) {
    return (
      <div>
        <div className="h-8 w-32 animate-pulse bg-gin-bg-layer2 rounded-gin-s mb-5" />
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

  return (
    <div>
      <nav className="mb-5 flex items-center gap-0">
        <Link href="/structure" className="text-gin-primary hover:underline text-sm">
          Structure
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">Menus</span>
      </nav>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title">Menus</h1>
          <p className="text-gin-text-light text-sm mt-1">
            Manage navigation menus and their links.
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(!showAdd); setError(''); setSuccess(''); }}
          className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors"
        >
          Add menu
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

      <div className="bg-white border border-gin-border rounded-gin overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gin-bg-layer2 border-b border-gin-border-table">
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Title</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Description</th>
              <th className="text-center px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Links</th>
              <th className="text-right px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Operations</th>
            </tr>
          </thead>
          <tbody>
            {menus.map((menu) => (
              <tr key={menu.id} className="hover:bg-gin-bg-layer2/50 transition-colors">
                <td className="px-4 py-3 text-sm text-gin-text border-t border-gin-border">
                  <Link
                    href={`/structure/menus/${menu.id}`}
                    className="font-medium text-gin-primary hover:underline"
                  >
                    {menu.label}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gin-text-light border-t border-gin-border">{menu.description || '\u2014'}</td>
                <td className="px-4 py-3 text-sm text-center text-gin-text-light border-t border-gin-border">{menu.item_count}</td>
                <td className="px-4 py-3 text-sm text-right border-t border-gin-border space-x-3">
                  <Link
                    href={`/structure/menus/${menu.id}`}
                    className="text-sm text-gin-primary hover:underline"
                  >
                    Edit links
                  </Link>
                  {menu.id !== 'main' && (
                    <button
                      onClick={() => handleDelete(menu.id)}
                      className="text-sm text-gin-danger hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {menus.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gin-text-light">
                  No menus configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
