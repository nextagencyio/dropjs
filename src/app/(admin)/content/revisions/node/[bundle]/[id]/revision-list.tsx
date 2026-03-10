'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, ArrowLeft, CircleAlert, Clock, User, ArrowLeftRight, Loader2, RotateCcw } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

interface Revision {
  vid: number;
  revision_uid: number;
  revision_timestamp: number;
}

interface RevisionListResponse {
  data: Revision[];
  meta: { current_vid: number };
}

interface FieldChange {
  field: string;
  old_value: unknown;
  new_value: unknown;
}

interface DiffResponse {
  data: {
    from_vid: number;
    to_vid: number;
    changes: FieldChange[];
  };
}

function relativeTime(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 60) return 'just now';
  if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  }
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }
  if (diff < 604800) {
    const days = Math.floor(diff / 86400);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '(empty)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    if (value.length === 0) return '(empty)';
    if (value.length > 200) return value.slice(0, 200) + '...';
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '(empty)';
    return value.map((v) => formatValue(v)).join(', ');
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function fieldLabel(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function DiffView({ changes }: { changes: FieldChange[] }) {
  if (changes.length === 0) {
    return (
      <div className="px-5 py-6 text-center text-sm text-gin-text-light italic">
        No changes between these revisions.
      </div>
    );
  }

  return (
    <div className="divide-y divide-gin-border">
      {changes.map((change) => (
        <div key={change.field} className="px-5 py-4">
          <div className="text-[13px] font-semibold text-gin-text-light uppercase tracking-wider mb-3">
            {fieldLabel(change.field)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-gin-s bg-red-50 border border-red-200 px-4 py-3">
              <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wider block mb-1.5">
                Removed
              </span>
              <span className="text-sm text-red-800 break-words whitespace-pre-wrap">
                {formatValue(change.old_value)}
              </span>
            </div>
            <div className="rounded-gin-s bg-emerald-50 border border-emerald-200 px-4 py-3">
              <span className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider block mb-1.5">
                Added
              </span>
              <span className="text-sm text-emerald-800 break-words whitespace-pre-wrap">
                {formatValue(change.new_value)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RevisionList({ bundle, id }: { bundle: string; id: number }) {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [currentVid, setCurrentVid] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reverting, setReverting] = useState<number | null>(null);
  const [expandedDiff, setExpandedDiff] = useState<number | null>(null);
  const [diffData, setDiffData] = useState<Record<number, FieldChange[]>>({});
  const [diffLoading, setDiffLoading] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch<RevisionListResponse>(
          `/node/${bundle}/${id}/revisions`,
        );
        setRevisions(res.data);
        setCurrentVid(res.meta.current_vid);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load revisions');
      }
      setLoading(false);
    }
    if (bundle && id) load();
  }, [bundle, id]);

  const handleRevert = async (vid: number) => {
    if (!confirm(`Revert to revision ${vid}? This will create a new revision with the content from revision ${vid}.`)) return;
    setReverting(vid);
    setError(null);
    try {
      await apiFetch(`/node/${bundle}/${id}/revisions/${vid}/revert`, {
        method: 'POST',
      });
      const res = await apiFetch<RevisionListResponse>(
        `/node/${bundle}/${id}/revisions`,
      );
      setRevisions(res.data);
      setCurrentVid(res.meta.current_vid);
      setExpandedDiff(null);
      setDiffData({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revert failed');
    }
    setReverting(null);
  };

  const toggleDiff = async (vid: number, prevVid: number) => {
    if (expandedDiff === vid) {
      setExpandedDiff(null);
      return;
    }

    setExpandedDiff(vid);

    if (diffData[vid]) return;

    setDiffLoading(vid);
    try {
      const res = await apiFetch<DiffResponse>(
        `/node/${bundle}/${id}/revisions/${prevVid}/diff/${vid}`,
      );
      setDiffData((prev) => ({ ...prev, [vid]: res.data.changes }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load diff');
      setExpandedDiff(null);
    }
    setDiffLoading(null);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-gin-bg-layer2 rounded-gin-s w-48" />
            <div className="h-4 bg-gin-bg-layer2 rounded-gin-s w-36" />
          </div>
          <div className="h-10 bg-gin-bg-layer2 rounded-gin-s w-28" />
        </div>
        <div className="space-y-3 pl-14">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gin-bg-layer2 rounded-gin" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-4">
        <Link href="/content" className="text-gin-primary hover:underline font-medium">
          Content
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gin-text-light" />
        <Link href={`/node/${id}/edit`} className="text-gin-primary hover:underline font-medium">
          Edit
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gin-text-light" />
        <span className="text-gin-text-light">Revisions</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title">Revision History</h1>
          <p className="text-sm text-gin-text-light mt-1">
            {revisions.length} revision{revisions.length !== 1 ? 's' : ''} for this content
          </p>
        </div>
        <Link
          href={`/node/${id}/edit`}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gin-text bg-white border border-gin-border rounded-gin-s hover:bg-gin-bg-layer2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gin-text-light" />
          Back to edit
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-gin-danger rounded-gin-s px-4 py-3 text-sm mb-4 flex items-start gap-2">
          <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {revisions.length === 0 ? (
        <div className="bg-white rounded-gin border border-gin-border px-4 py-12 text-center">
          <Clock className="w-10 h-10 text-gin-border mx-auto mb-3" />
          <p className="text-gin-text-light text-sm">No revisions found.</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gin-border" />

          <div className="space-y-0">
            {revisions.map((rev, index) => {
              const isCurrent = rev.vid === currentVid;
              const isFirst = index === 0;
              const prevRev = index < revisions.length - 1 ? revisions[index + 1] : null;
              const isExpanded = expandedDiff === rev.vid;
              const isDiffLoading = diffLoading === rev.vid;

              return (
                <div key={rev.vid} className="relative pl-14">
                  <div
                    className={`absolute left-4 w-5 h-5 rounded-full border-2 z-10 top-5 transition-colors ${
                      isCurrent
                        ? 'bg-gin-primary border-gin-primary'
                        : 'bg-white border-gin-border'
                    }`}
                  >
                    {isCurrent && (
                      <div className="absolute inset-1 rounded-full bg-white" />
                    )}
                  </div>

                  <div
                    className={`bg-white rounded-gin border mb-3 overflow-hidden transition-all ${
                      isCurrent
                        ? 'border-gin-primary/30 shadow-sm'
                        : 'border-gin-border hover:border-gin-border-form'
                    }`}
                  >
                    <div className="px-5 py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gin-title text-[15px]">
                              Revision #{rev.vid}
                            </span>
                            {isCurrent && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gin-primary-light text-gin-primary">
                                Current
                              </span>
                            )}
                            {isFirst && !isCurrent && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gin-bg-layer2 text-gin-text-light">
                                Latest
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[13px] text-gin-text-light">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              <span title={new Date(rev.revision_timestamp * 1000).toLocaleString()}>
                                {relativeTime(rev.revision_timestamp)}
                              </span>
                            </span>
                            <span className="text-gin-border">|</span>
                            <span className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5" />
                              User #{rev.revision_uid}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4 shrink-0">
                          {prevRev && (
                            <button
                              onClick={() => toggleDiff(rev.vid, prevRev.vid)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-gin-s transition-colors ${
                                isExpanded
                                  ? 'bg-gin-primary-light text-gin-primary'
                                  : 'bg-gin-bg-layer2 text-gin-text-light hover:bg-gin-border hover:text-gin-text'
                              }`}
                            >
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                              {isExpanded ? 'Hide changes' : 'View changes'}
                            </button>
                          )}
                          {!isCurrent && (
                            <button
                              onClick={() => handleRevert(rev.vid)}
                              disabled={reverting !== null}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gin-warning rounded-gin-s hover:opacity-90 disabled:opacity-50 transition-colors"
                            >
                              {reverting === rev.vid ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Reverting...
                                </>
                              ) : (
                                <>
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Revert
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gin-border">
                        <div className="px-5 py-2.5 bg-gin-bg-layer2 text-[13px] text-gin-text-light font-medium flex items-center gap-2">
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          Changes from revision #{prevRev!.vid} to #{rev.vid}
                        </div>
                        {isDiffLoading ? (
                          <div className="flex items-center gap-2 text-gin-text-light text-sm px-5 py-8 justify-center">
                            <Loader2 className="animate-spin h-4 w-4" />
                            Loading diff...
                          </div>
                        ) : (
                          diffData[rev.vid] && <DiffView changes={diffData[rev.vid]} />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
