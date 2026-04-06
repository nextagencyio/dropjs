'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, CircleAlert, Search, Database, RefreshCw } from 'lucide-react';
import { rebuildSearchIndexAction } from '@/app/(admin)/_actions/system';

interface Props {
  backend: string;
  available: boolean;
  indexedCount: number;
}

const BACKEND_LABELS: Record<string, { label: string; description: string }> = {
  fts5: { label: 'SQLite FTS5', description: 'Full-text search with porter stemming' },
  pg: { label: 'PostgreSQL tsquery', description: 'Full-text search with GIN index' },
  like: { label: 'LIKE fallback', description: 'Basic pattern matching (limited)' },
};

export default function SearchConfigClient({ backend, available, indexedCount }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRebuild = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await rebuildSearchIndexAction();
    if (result.success) {
      setSuccess(`Search index rebuilt: ${(result.data as any)?.count ?? 0} entities indexed.`);
      router.refresh();
    } else {
      setError(result.error || 'Failed to rebuild search index');
    }
    setLoading(false);
  };

  const backendInfo = BACKEND_LABELS[backend] ?? { label: backend, description: 'Unknown backend' };

  return (
    <div>
      <nav className="mb-5 flex items-center gap-0">
        <Link href="/config" className="text-gin-primary hover:underline text-sm">
          Configuration
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">Search</span>
      </nav>

      <h1 className="text-[28px] font-normal tracking-tight text-gin-title mb-1">
        Search settings
      </h1>
      <p className="text-sm text-gin-text-light mb-5">
        Configure full-text search indexing and view search engine status.
      </p>

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

      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gin-border rounded-gin p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-gin-s bg-blue-50">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gin-text-light uppercase tracking-wider">Backend</p>
              <p className="text-sm font-semibold text-gin-title">{backendInfo.label}</p>
            </div>
          </div>
          <p className="text-xs text-gin-text-light">{backendInfo.description}</p>
        </div>

        <div className="bg-white border border-gin-border rounded-gin p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-gin-s ${available ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <Search className={`w-5 h-5 ${available ? 'text-emerald-600' : 'text-red-600'}`} />
            </div>
            <div>
              <p className="text-xs text-gin-text-light uppercase tracking-wider">Status</p>
              <p className="text-sm font-semibold text-gin-title">
                {available ? 'Available' : 'Unavailable'}
              </p>
            </div>
          </div>
          <p className="text-xs text-gin-text-light">
            {available ? 'Full-text search is active and operational.' : 'Full-text search is not available. Content is not searchable.'}
          </p>
        </div>

        <div className="bg-white border border-gin-border rounded-gin p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-gin-s bg-purple-50">
              <RefreshCw className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gin-text-light uppercase tracking-wider">Indexed</p>
              <p className="text-sm font-semibold text-gin-title">{indexedCount} entities</p>
            </div>
          </div>
          <p className="text-xs text-gin-text-light">
            Total entities currently in the search index.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white border border-gin-border rounded-gin p-5">
        <h2 className="text-sm font-semibold text-gin-title mb-3">Index operations</h2>
        <p className="text-sm text-gin-text-light mb-4">
          Rebuild the search index to re-index all content. This is useful after bulk imports or if search results appear stale.
        </p>
        <button
          onClick={handleRebuild}
          disabled={loading || !available}
          className="inline-flex items-center gap-1.5 bg-gin-primary text-white rounded-gin-s px-4 py-2.5 text-sm font-semibold hover:bg-gin-primary-hover disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Rebuilding...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Rebuild search index
            </>
          )}
        </button>
      </div>
    </div>
  );
}
