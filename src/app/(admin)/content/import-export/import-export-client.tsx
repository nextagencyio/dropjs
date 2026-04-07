'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Loader2, CheckCircle2, CircleAlert, Download, Upload, FileJson } from 'lucide-react';
import { exportContentAction, importContentAction } from '@/app/(admin)/_actions/entity';

interface Props {
  nodeTypes: { bundle: string; label: string }[];
}

export default function ImportExportClient({ nodeTypes }: Props) {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

  // Export state
  const [exportBundle, setExportBundle] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Import state
  const [importData, setImportData] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ created: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    if (!exportBundle) return;
    setExportLoading(true);
    setExportError(null);
    setExportSuccess(null);

    const result = await exportContentAction(exportBundle);
    if (result.success) {
      const json = result.data as string;
      const parsed = JSON.parse(json);
      const count = Array.isArray(parsed) ? parsed.length : 0;

      // Download as JSON file
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportBundle}-content-export.json`;
      a.click();
      URL.revokeObjectURL(url);

      setExportSuccess(`Exported ${count} ${exportBundle} entities.`);
    } else {
      setExportError(result.error || 'Export failed');
    }
    setExportLoading(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImportData(ev.target?.result as string ?? '');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importData.trim()) return;
    setImportLoading(true);
    setImportError(null);
    setImportSuccess(null);
    setImportResult(null);

    const result = await importContentAction(importData);
    if (result.success) {
      const data = result.data as { created: number; errors: string[] };
      setImportResult(data);
      if (data.errors.length > 0) {
        setImportError(`Import completed with ${data.errors.length} error(s).`);
      } else {
        setImportSuccess(`Successfully imported ${data.created} entities.`);
      }
    } else {
      setImportError(result.error || 'Import failed');
    }
    setImportLoading(false);
  };

  return (
    <div>
      <nav className="mb-5 flex items-center gap-0">
        <Link href="/content" className="text-gin-primary hover:underline text-sm">
          Content
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">Import / Export</span>
      </nav>

      <h1 className="text-[28px] font-normal tracking-tight text-gin-title mb-1">
        Content import / export
      </h1>
      <p className="text-sm text-gin-text-light mb-5">
        Export content as JSON or import content from a JSON file.
      </p>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-gin-border">
        <button
          onClick={() => setActiveTab('export')}
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
          onClick={() => setActiveTab('import')}
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

      {/* Export tab */}
      {activeTab === 'export' && (
        <div className="bg-white border border-gin-border rounded-gin p-5">
          {exportError && (
            <div className="flex items-start gap-2.5 bg-[#fef2f2] border border-gin-danger/20 text-gin-danger text-sm px-4 py-3 rounded-gin mb-4">
              <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{exportError}</span>
            </div>
          )}
          {exportSuccess && (
            <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-gin mb-4">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{exportSuccess}</span>
            </div>
          )}

          <h2 className="text-sm font-semibold text-gin-title mb-3">Export content</h2>
          <p className="text-sm text-gin-text-light mb-4">
            Select a content type to export all entities as a JSON file. The exported file can be imported into another DropJS or Drupal instance.
          </p>

          <div className="flex items-end gap-4">
            <div className="min-w-[250px]">
              <label htmlFor="export-type" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
                Content type
              </label>
              <select
                id="export-type"
                value={exportBundle}
                onChange={(e) => setExportBundle(e.target.value)}
                className="w-full border border-gin-border-form rounded-gin-s px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gin-primary focus:border-gin-primary"
              >
                <option value="">-- Select content type --</option>
                {nodeTypes.map((t) => (
                  <option key={t.bundle} value={t.bundle}>
                    {t.label} ({t.bundle})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleExport}
              disabled={!exportBundle || exportLoading}
              className="inline-flex items-center gap-1.5 bg-gin-primary text-white rounded-gin-s px-4 py-2.5 text-sm font-semibold hover:bg-gin-primary-hover disabled:opacity-50 transition-colors"
            >
              {exportLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export JSON
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Import tab */}
      {activeTab === 'import' && (
        <div className="bg-white border border-gin-border rounded-gin p-5">
          {importError && (
            <div className="flex items-start gap-2.5 bg-[#fef2f2] border border-gin-danger/20 text-gin-danger text-sm px-4 py-3 rounded-gin mb-4">
              <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{importError}</span>
            </div>
          )}
          {importSuccess && (
            <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-gin mb-4">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{importSuccess}</span>
            </div>
          )}
          {importResult && importResult.errors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-gin mb-4">
              <p className="font-medium mb-1">Import errors:</p>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                {importResult.errors.slice(0, 10).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {importResult.errors.length > 10 && (
                  <li>...and {importResult.errors.length - 10} more</li>
                )}
              </ul>
            </div>
          )}

          <h2 className="text-sm font-semibold text-gin-title mb-3">Import content</h2>
          <p className="text-sm text-gin-text-light mb-4">
            Upload a JSON file or paste JSON data to import content. The JSON should be an array of entity objects, each with a <code className="text-xs bg-gin-bg-layer2 px-1 py-0.5 rounded">type</code> (bundle) and <code className="text-xs bg-gin-bg-layer2 px-1 py-0.5 rounded">title</code> field.
          </p>

          <div className="mb-4">
            <label className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Upload JSON file
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gin-text bg-white border border-gin-border-form rounded-gin-s hover:bg-gin-bg-layer2 transition-all"
              >
                <FileJson className="w-4 h-4 text-gin-text-light" />
                Choose file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="import-json" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
              Or paste JSON data
            </label>
            <textarea
              id="import-json"
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              rows={10}
              placeholder='[{"type": "article", "title": "My Article", "field_body": {"value": "Content..."}}]'
              className="w-full border border-gin-border-form rounded-gin-s px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gin-primary focus:border-gin-primary"
            />
          </div>

          <button
            onClick={handleImport}
            disabled={!importData.trim() || importLoading}
            className="inline-flex items-center gap-1.5 bg-gin-primary text-white rounded-gin-s px-4 py-2.5 text-sm font-semibold hover:bg-gin-primary-hover disabled:opacity-50 transition-colors"
          >
            {importLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Import content
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
