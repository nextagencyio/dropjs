'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, Upload, ArrowRightLeft, Loader2, CheckCircle2, CircleAlert } from 'lucide-react';
import { exportAllConfiguration, importConfiguration, diffConfiguration } from '@/app/(admin)/_actions/system';

interface Props {
  currentConfigJson: string;
  configCount: number;
}

export default function ConfigSyncClient({ currentConfigJson, configCount }: Props) {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importText, setImportText] = useState('');
  const [diff, setDiff] = useState<{ added: string[]; changed: string[]; removed: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    const result = await exportAllConfiguration();
    if (result.success && result.data) {
      const blob = new Blob([result.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dropjs-config-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      setError(result.error || 'Export failed');
    }
    setLoading(false);
  };

  const handleDiff = async () => {
    if (!importText.trim()) {
      setError('Paste or upload a configuration JSON first');
      return;
    }
    setLoading(true);
    setError(null);
    setDiff(null);

    const result = await diffConfiguration(importText);
    if (result.success && result.data) {
      setDiff(result.data);
    } else {
      setError(result.error || 'Diff failed — check that the JSON is valid');
    }
    setLoading(false);
  };

  const handleImport = async () => {
    if (!importText.trim()) {
      setError('Paste or upload a configuration JSON first');
      return;
    }
    if (!confirm('This will overwrite existing configuration. Continue?')) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await importConfiguration(importText);
    if (result.success) {
      setSuccess('Configuration imported successfully. You may need to reload the page for changes to take effect.');
      setDiff(null);
    } else {
      setError(result.error || 'Import failed');
    }
    setLoading(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImportText(reader.result as string);
      setDiff(null);
      setError(null);
      setSuccess(null);
    };
    reader.readAsText(file);
  };

  const totalChanges = diff ? diff.added.length + diff.changed.length + diff.removed.length : 0;

  return (
    <div>
      <div className="mb-5">
        <Link href="/config" className="text-sm text-gin-primary hover:underline">
          Configuration
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">Configuration synchronization</span>
      </div>

      <h1 className="text-[28px] font-normal tracking-tight text-gin-title mb-1">
        Configuration synchronization
      </h1>
      <p className="text-sm text-gin-text-light mb-6">
        Export, compare, and import site configuration as JSON.
      </p>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-gin-border">
        <button
          onClick={() => { setActiveTab('export'); setError(null); setSuccess(null); }}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'export'
              ? 'text-gin-primary border-gin-primary'
              : 'text-gin-text-light border-transparent hover:text-gin-text hover:border-gin-border'
          }`}
        >
          <Download className="w-4 h-4" />
          Export
        </button>
        <button
          onClick={() => { setActiveTab('import'); setError(null); setSuccess(null); }}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'import'
              ? 'text-gin-primary border-gin-primary'
              : 'text-gin-text-light border-transparent hover:text-gin-text hover:border-gin-border'
          }`}
        >
          <Upload className="w-4 h-4" />
          Import
        </button>
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

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="bg-white border border-gin-border rounded-gin p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gin-title">Current configuration</h2>
              <p className="text-xs text-gin-text-light mt-1">{configCount} configuration entries</p>
            </div>
            <button
              onClick={handleExport}
              disabled={loading}
              className="inline-flex items-center gap-1.5 bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download JSON
            </button>
          </div>
          <textarea
            readOnly
            value={currentConfigJson}
            className="w-full h-72 font-mono text-xs border border-gin-border-form rounded-gin-s p-3 bg-gin-bg-layer2 text-gin-text resize-y"
          />
        </div>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="bg-white border border-gin-border rounded-gin p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gin-title">Import configuration</h2>
              <p className="text-xs text-gin-text-light mt-1">Paste JSON or upload a file exported from another site</p>
            </div>
            <label className="inline-flex items-center gap-1.5 bg-white border border-gin-border text-gin-text rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-light cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              Upload file
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <textarea
            value={importText}
            onChange={(e) => { setImportText(e.target.value); setDiff(null); setError(null); setSuccess(null); }}
            placeholder='Paste configuration JSON here...'
            className="w-full h-60 font-mono text-xs border border-gin-border-form rounded-gin-s p-3 bg-white text-gin-text resize-y placeholder:text-gin-text-light/60 focus:border-gin-primary focus:ring-2 focus:ring-gin-primary/10 focus:outline-none"
          />

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleDiff}
              disabled={loading || !importText.trim()}
              className="inline-flex items-center gap-1.5 border border-gin-border text-gin-text rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-light disabled:opacity-40 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
              Compare changes
            </button>
            <button
              onClick={handleImport}
              disabled={loading || !importText.trim()}
              className="inline-flex items-center gap-1.5 bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover disabled:opacity-40 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Import
            </button>
          </div>

          {/* Diff results */}
          {diff && (
            <div className="mt-5 border border-gin-border rounded-gin overflow-hidden">
              <div className="bg-gin-bg-layer2 px-4 py-3 border-b border-gin-border">
                <h3 className="text-sm font-semibold text-gin-title">
                  Changes detected: {totalChanges === 0 ? 'None' : totalChanges}
                </h3>
              </div>
              {totalChanges === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gin-text-light">
                  The imported configuration is identical to the current configuration.
                </div>
              ) : (
                <div className="divide-y divide-gin-border-table">
                  {diff.added.length > 0 && (
                    <div className="px-4 py-3">
                      <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">
                        Added ({diff.added.length})
                      </h4>
                      <ul className="space-y-1">
                        {diff.added.map((name) => (
                          <li key={name} className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                            + {name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {diff.changed.length > 0 && (
                    <div className="px-4 py-3">
                      <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">
                        Changed ({diff.changed.length})
                      </h4>
                      <ul className="space-y-1">
                        {diff.changed.map((name) => (
                          <li key={name} className="text-xs font-mono text-amber-700 bg-amber-50 px-2 py-1 rounded">
                            ~ {name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {diff.removed.length > 0 && (
                    <div className="px-4 py-3">
                      <h4 className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-2">
                        Removed ({diff.removed.length})
                      </h4>
                      <ul className="space-y-1">
                        {diff.removed.map((name) => (
                          <li key={name} className="text-xs font-mono text-red-700 bg-red-50 px-2 py-1 rounded">
                            - {name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
