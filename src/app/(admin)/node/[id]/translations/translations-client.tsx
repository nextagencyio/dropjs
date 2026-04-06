'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, CircleAlert, Globe, Plus, Trash2 } from 'lucide-react';
import { createTranslationAction, deleteTranslationAction } from '@/app/(admin)/_actions/system';

interface TranslationInfo {
  langcode: string;
  label: string;
  status: 'translated' | 'untranslated';
}

interface Language {
  id: string;
  label: string;
  direction: 'ltr' | 'rtl';
  weight: number;
  enabled: boolean;
}

interface Props {
  entityType: string;
  id: number;
  title: string;
  bundle: string;
  bundleLabel: string;
  translationStatus: TranslationInfo[];
  enabledLanguages: Language[];
}

export default function TranslationsClient({
  entityType,
  id,
  title,
  bundle,
  bundleLabel,
  translationStatus,
  enabledLanguages,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState<string | null>(null);
  const [addTitle, setAddTitle] = useState('');

  const handleAdd = async (langcode: string) => {
    setLoading(langcode);
    setError(null);
    setSuccess(null);

    const result = await createTranslationAction(entityType, id, langcode, {
      title: addTitle || `${title} (${langcode})`,
    });

    if (result.success) {
      setSuccess(`Translation for "${langcode}" created.`);
      setShowAddForm(null);
      setAddTitle('');
      router.refresh();
    } else {
      setError(result.error || 'Failed to create translation');
    }
    setLoading(null);
  };

  const handleDelete = async (langcode: string) => {
    if (!confirm(`Delete the ${langcode} translation?`)) return;

    setLoading(langcode);
    setError(null);
    setSuccess(null);

    const result = await deleteTranslationAction(entityType, id, langcode);

    if (result.success) {
      setSuccess(`Translation for "${langcode}" deleted.`);
      router.refresh();
    } else {
      setError(result.error || 'Failed to delete translation');
    }
    setLoading(null);
  };

  const onlyOneLanguage = enabledLanguages.length <= 1;

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-0">
        <Link href="/content" className="text-gin-primary hover:underline text-sm">
          Content
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <Link href={`/node/${id}/edit`} className="text-gin-primary hover:underline text-sm">
          {title}
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">Translations</span>
      </nav>

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-[28px] font-normal tracking-tight text-gin-title">
          Translations
        </h1>
      </div>
      <p className="text-sm text-gin-text-light mb-5">
        Manage translations for <strong>{title}</strong> ({bundleLabel}).
      </p>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-gin-border">
        <Link
          href={`/node/${id}/edit`}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gin-text-light border-b-2 border-transparent hover:text-gin-text hover:border-gin-border -mb-px transition-colors"
        >
          Edit
        </Link>
        <Link
          href={`/node/${id}/revisions`}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gin-text-light border-b-2 border-transparent hover:text-gin-text hover:border-gin-border -mb-px transition-colors"
        >
          Revisions
        </Link>
        <span className="inline-flex items-center px-4 py-2 text-sm font-medium text-gin-primary border-b-2 border-gin-primary -mb-px">
          Translations
        </span>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 bg-[#fef2f2] border border-gin-danger/20 text-gin-danger text-sm px-4 py-3 rounded-gin mb-4">
          <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-gin mb-4">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {onlyOneLanguage && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-gin mb-4">
          Only one language is enabled. <Link href="/config/languages" className="text-gin-primary hover:underline font-medium">Enable more languages</Link> to use translations.
        </div>
      )}

      <div className="bg-white border border-gin-border rounded-gin overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="bg-gin-bg-layer2 border-b border-gin-border-table">
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                Language
              </th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                Operations
              </th>
            </tr>
          </thead>
          <tbody>
            {translationStatus.map((t) => {
              const isOriginal = t.langcode === 'en' && t.status === 'translated';
              return (
                <tr key={t.langcode} className="hover:bg-gin-bg-layer2/50 transition-colors border-t border-gin-border">
                  <td className="px-4 py-3 text-sm text-gin-text">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gin-text-light" />
                      <span className="font-medium">{t.label}</span>
                      <code className="text-xs bg-gin-bg-layer2 px-1.5 py-0.5 rounded-gin-s text-gin-text-light">
                        {t.langcode}
                      </code>
                      {isOriginal && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          Original
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {t.status === 'translated' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-gin-green">
                        Translated
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Not translated
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {loading === t.langcode ? (
                      <Loader2 className="w-4 h-4 animate-spin text-gin-text-light" />
                    ) : t.status === 'translated' && !isOriginal ? (
                      <button
                        onClick={() => handleDelete(t.langcode)}
                        className="inline-flex items-center gap-1 text-sm text-gin-danger hover:underline"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    ) : t.status === 'untranslated' ? (
                      showAddForm === t.langcode ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={addTitle}
                            onChange={(e) => setAddTitle(e.target.value)}
                            placeholder={`${title} (${t.langcode})`}
                            className="border border-gin-border-form rounded-gin-s px-2 py-1 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-gin-primary"
                          />
                          <button
                            onClick={() => handleAdd(t.langcode)}
                            className="bg-gin-primary text-white rounded-gin-s px-3 py-1 text-xs font-medium hover:bg-gin-primary-hover transition-colors"
                          >
                            Create
                          </button>
                          <button
                            onClick={() => { setShowAddForm(null); setAddTitle(''); }}
                            className="text-xs text-gin-text-light hover:text-gin-text"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowAddForm(t.langcode)}
                          className="inline-flex items-center gap-1 text-sm text-gin-primary hover:underline"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add translation
                        </button>
                      )
                    ) : (
                      <span className="text-xs text-gin-text-light">Source language</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {translationStatus.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-8 text-gin-text-light">
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
