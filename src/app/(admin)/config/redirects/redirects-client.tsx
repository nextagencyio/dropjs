'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createRedirectAction,
  deleteRedirectAction,
  updateRedirectAction,
} from '@/app/(admin)/_actions/system';

interface RedirectEntry {
  id: number;
  uuid: string;
  source_path: string;
  redirect_path: string;
  status_code: number;
  langcode: string;
  enabled: number;
  count: number;
  created: number | null;
  changed: number | null;
}

interface RedirectsClientProps {
  initialRedirects: RedirectEntry[];
  initialTotal: number;
}

const STATUS_CODES = [
  { value: 301, label: '301 Permanent' },
  { value: 302, label: '302 Temporary' },
  { value: 307, label: '307 Temporary (strict)' },
  { value: 308, label: '308 Permanent (strict)' },
];

export default function RedirectsClient({ initialRedirects, initialTotal }: RedirectsClientProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newSource, setNewSource] = useState('');
  const [newDest, setNewDest] = useState('');
  const [newStatus, setNewStatus] = useState(301);
  const [newLangcode, setNewLangcode] = useState('en');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const result = await createRedirectAction({
        source_path: newSource,
        redirect_path: newDest,
        status_code: newStatus,
        langcode: newLangcode,
      });
      if (!result.success) {
        setError(result.error || 'Failed to create redirect');
        return;
      }
      setShowAdd(false);
      setNewSource('');
      setNewDest('');
      setNewStatus(301);
      setNewLangcode('en');
      setSuccess('Redirect created.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create redirect');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this redirect?')) return;
    setError('');
    setSuccess('');
    try {
      const result = await deleteRedirectAction(id);
      if (!result.success) {
        setError(result.error || 'Failed to delete redirect');
        return;
      }
      setSuccess('Redirect deleted.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete redirect');
    }
  };

  const handleToggle = async (redirect: RedirectEntry) => {
    setError('');
    setSuccess('');
    try {
      const result = await updateRedirectAction(redirect.id, {
        enabled: redirect.enabled ? 0 : 1,
      });
      if (!result.success) {
        setError(result.error || 'Failed to update redirect');
        return;
      }
      setSuccess(redirect.enabled ? 'Redirect disabled.' : 'Redirect enabled.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update redirect');
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
        <span className="text-sm text-gin-text">URL redirects</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title">URL redirects</h1>
          <p className="text-gin-text-light text-sm mt-1">
            {initialTotal} redirect{initialTotal !== 1 ? 's' : ''} configured
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
          Add redirect
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
            Add URL redirect
          </h2>
          <div className="mb-5">
            <label
              htmlFor="source-path"
              className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
            >
              From path
            </label>
            <input
              id="source-path"
              type="text"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
              placeholder="/old-page"
              required
            />
            <p className="text-xs text-gin-text-light mt-1.5">
              The path to redirect from (e.g. /old-page).
            </p>
          </div>
          <div className="mb-5">
            <label
              htmlFor="dest-path"
              className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
            >
              To path
            </label>
            <input
              id="dest-path"
              type="text"
              value={newDest}
              onChange={(e) => setNewDest(e.target.value)}
              className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
              placeholder="/new-page"
              required
            />
            <p className="text-xs text-gin-text-light mt-1.5">
              The destination path (e.g. /new-page or https://example.com).
            </p>
          </div>
          <div className="flex gap-4 mb-5">
            <div className="flex-1">
              <label
                htmlFor="status-code"
                className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
              >
                Redirect type
              </label>
              <select
                id="status-code"
                value={newStatus}
                onChange={(e) => setNewStatus(Number(e.target.value))}
                className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
              >
                {STATUS_CODES.map((sc) => (
                  <option key={sc.value} value={sc.value}>
                    {sc.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
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
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="px-5 py-2.5 bg-gin-primary hover:bg-gin-primary-hover text-white text-sm font-semibold rounded-gin transition-colors"
            >
              Create redirect
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
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-gin-bg-layer2 border-b border-gin-border-table">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">
                From
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">
                To
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider w-24">
                Status
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider w-16">
                Hits
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider w-20">
                Active
              </th>
              <th className="text-right px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider w-32">
                Operations
              </th>
            </tr>
          </thead>
          <tbody>
            {initialRedirects.map((redirect) => (
              <tr
                key={redirect.id}
                className={`border-b border-gin-border-table last:border-0 ${
                  !redirect.enabled ? 'opacity-50' : ''
                }`}
              >
                <td className="px-4 py-3 font-medium text-gin-title font-mono text-xs">
                  {redirect.source_path}
                </td>
                <td className="px-4 py-3 text-gin-text font-mono text-xs">
                  {redirect.redirect_path}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-gin-s text-[11px] font-medium ${
                    redirect.status_code === 301
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {redirect.status_code}
                  </span>
                </td>
                <td className="px-4 py-3 text-gin-text-light tabular-nums">
                  {redirect.count}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggle(redirect)}
                    className={`inline-block px-2 py-0.5 rounded-gin-s text-[11px] font-medium cursor-pointer ${
                      redirect.enabled
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-gray-50 text-gray-500 border border-gray-200'
                    }`}
                  >
                    {redirect.enabled ? 'Yes' : 'No'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(redirect.id)}
                    className="text-sm text-gin-danger hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {initialRedirects.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-gin-text-light"
                >
                  No URL redirects configured. Redirects are also auto-created when URL aliases change.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
