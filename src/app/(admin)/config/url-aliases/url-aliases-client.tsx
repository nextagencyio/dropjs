'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createAlias,
  deleteAlias,
} from '@/app/(admin)/_actions/system';

interface UrlAlias {
  id: number;
  path: string;
  alias: string;
  langcode: string;
}

interface UrlAliasesClientProps {
  initialAliases: UrlAlias[];
  initialTotal: number;
}

export default function UrlAliasesClient({ initialAliases, initialTotal }: UrlAliasesClientProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newSource, setNewSource] = useState('');
  const [newAlias, setNewAlias] = useState('');
  const [newLangcode, setNewLangcode] = useState('en');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const result = await createAlias({
        path: newSource,
        alias: newAlias,
        langcode: newLangcode,
      });
      if (!result.success) {
        setError(result.error || 'Failed to create URL alias');
        return;
      }
      setShowAdd(false);
      setNewSource('');
      setNewAlias('');
      setNewLangcode('en');
      setSuccess('URL alias created.');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create URL alias'
      );
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this URL alias?')) return;
    setError('');
    setSuccess('');
    try {
      const result = await deleteAlias(id);
      if (!result.success) {
        setError(result.error || 'Failed to delete URL alias');
        return;
      }
      setSuccess('URL alias deleted.');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete URL alias'
      );
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
        <span className="text-sm text-gin-text">URL aliases</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title">URL aliases</h1>
          <p className="text-gin-text-light text-sm mt-1">
            {initialTotal} alias{initialTotal !== 1 ? 'es' : ''} configured
          </p>
        </div>
        <button
          onClick={() => {
            setShowAdd(!showAdd);
            setError('');
            setSuccess('');
          }}
          className="px-5 py-2.5 bg-gin-primary hover:bg-gin-primary-hover text-white text-sm font-semibold rounded-gin transition-colors"
        >
          Add alias
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
            Add URL alias
          </h2>
          <div className="mb-5">
            <label
              htmlFor="source-path"
              className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
            >
              System path
            </label>
            <input
              id="source-path"
              type="text"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
              placeholder="/api/node/article/1"
              required
            />
            <p className="text-xs text-gin-text-light mt-1.5">
              The internal system path (e.g. /api/node/article/1).
            </p>
          </div>
          <div className="mb-5">
            <label
              htmlFor="alias-path"
              className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
            >
              URL alias
            </label>
            <input
              id="alias-path"
              type="text"
              value={newAlias}
              onChange={(e) => setNewAlias(e.target.value)}
              className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
              placeholder="/about-us"
              required
            />
            <p className="text-xs text-gin-text-light mt-1.5">
              The friendly URL path (e.g. /about-us).
            </p>
          </div>
          <div className="mb-5">
            <label
              htmlFor="langcode"
              className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
            >
              Language
            </label>
            <select
              id="langcode"
              value={newLangcode}
              onChange={(e) => setNewLangcode(e.target.value)}
              className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="und">Language neutral</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="px-5 py-2.5 bg-gin-primary hover:bg-gin-primary-hover text-white text-sm font-semibold rounded-gin transition-colors"
            >
              Create alias
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
                URL alias
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">
                System path
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">
                Language
              </th>
              <th className="text-right px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">
                Operations
              </th>
            </tr>
          </thead>
          <tbody>
            {initialAliases.map((alias) => (
              <tr
                key={alias.id}
                className="border-b border-gin-border-table last:border-0"
              >
                <td className="px-4 py-3 font-medium text-gin-title">
                  {alias.alias}
                </td>
                <td className="px-4 py-3 text-gin-text font-mono text-xs">
                  {alias.path}
                </td>
                <td className="px-4 py-3 text-gin-text">{alias.langcode}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(alias.id)}
                    className="text-sm text-gin-danger hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {initialAliases.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-gin-text-light"
                >
                  No URL aliases configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
