'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createLanguageAction,
  updateLanguageAction,
  deleteLanguageAction,
} from '@/app/(admin)/_actions/system';

interface Language {
  id: string;
  label: string;
  direction: 'ltr' | 'rtl';
  weight: number;
  enabled: boolean;
}

interface LanguagesClientProps {
  initialLanguages: Language[];
}

export default function LanguagesClient({ initialLanguages }: LanguagesClientProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [newId, setNewId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newDirection, setNewDirection] = useState<'ltr' | 'rtl'>('ltr');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const result = await createLanguageAction({
        id: newId,
        label: newLabel,
        direction: newDirection,
        enabled: true,
      });
      if (!result.success) {
        setError(result.error || 'Failed to add language');
        return;
      }
      setShowAdd(false);
      setNewId('');
      setNewLabel('');
      setNewDirection('ltr');
      setSuccess('Language added.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add language');
    }
  };

  const handleToggleEnabled = async (lang: Language) => {
    setError('');
    try {
      const result = await updateLanguageAction(lang.id, { enabled: !lang.enabled });
      if (!result.success) {
        setError(result.error || 'Failed to toggle language');
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle language');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete language "${id}"? This will also remove all translations in this language.`))
      return;
    setError('');
    setSuccess('');
    try {
      const result = await deleteLanguageAction(id);
      if (!result.success) {
        setError(result.error || 'Failed to remove language');
        return;
      }
      setSuccess('Language removed.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove language');
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
        <span className="text-sm text-gin-text">Languages</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title">Languages</h1>
          <p className="text-gin-text-light text-sm mt-1">
            Configure languages for multilingual content translation.
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
          Add language
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
          onSubmit={handleCreate}
          className="bg-white rounded-gin-l border border-gin-border p-6 mb-5 max-w-xl"
        >
          <h2 className="text-lg font-semibold text-gin-title mb-4">
            Add language
          </h2>
          <div className="mb-5">
            <label
              htmlFor="lang-id"
              className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
            >
              Language code
            </label>
            <input
              id="lang-id"
              type="text"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
              placeholder="e.g. fr, es, pt-BR"
              pattern="^[a-z]{2,3}(-[A-Za-z0-9]+)?$"
              required
            />
            <p className="text-xs text-gin-text-light mt-1.5">
              ISO 639 language code (e.g. en, fr, de, pt-BR).
            </p>
          </div>
          <div className="mb-5">
            <label
              htmlFor="lang-label"
              className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
            >
              Language name
            </label>
            <input
              id="lang-label"
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white placeholder:text-gin-text-light focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
              placeholder="e.g. French, Spanish"
              required
            />
          </div>
          <div className="mb-5">
            <label
              htmlFor="lang-direction"
              className="block text-[13px] font-semibold text-gin-text-light mb-1.5"
            >
              Text direction
            </label>
            <select
              id="lang-direction"
              value={newDirection}
              onChange={(e) => setNewDirection(e.target.value as 'ltr' | 'rtl')}
              className="w-full rounded-gin-s px-3 py-2.5 text-sm text-gin-text border border-gin-border-form bg-white focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none transition-colors"
            >
              <option value="ltr">Left to right (LTR)</option>
              <option value="rtl">Right to left (RTL)</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="px-5 py-2.5 bg-gin-primary hover:bg-gin-primary-hover text-white text-sm font-semibold rounded-gin transition-colors"
            >
              Add language
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
        <table className="w-full min-w-[500px] text-sm">
          <thead className="bg-gin-bg-layer2 border-b border-gin-border-table">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">
                Language
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">
                Code
              </th>
              <th className="text-center px-4 py-3 font-semibold text-gin-text-light text-[13px] uppercase tracking-wider">
                Direction
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
            {initialLanguages.map((lang) => (
              <tr
                key={lang.id}
                className="border-b border-gin-border-table last:border-0"
              >
                <td className="px-4 py-3 text-gin-title font-medium">
                  {lang.label}
                </td>
                <td className="px-4 py-3">
                  <code className="text-xs bg-gin-bg-layer2 text-gin-text px-1.5 py-0.5 rounded-gin-s">
                    {lang.id}
                  </code>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs text-gin-text-light uppercase">
                    {lang.direction}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggleEnabled(lang)}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      lang.enabled
                        ? 'bg-emerald-50 text-gin-green'
                        : 'bg-gin-bg-layer2 text-gin-text-light'
                    }`}
                  >
                    {lang.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  {lang.id !== 'en' && (
                    <button
                      onClick={() => handleDelete(lang.id)}
                      className="text-sm text-gin-danger hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {initialLanguages.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-gin-text-light"
                >
                  No languages configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
