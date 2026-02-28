'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchTopPages, type TopPageEntry } from '@/lib/api-system';

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
];

export default function TopPagesPage() {
  const [pages, setPages] = useState<TopPageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('7d');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchTopPages(period);
      setPages(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load top pages');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const maxHits = pages.length > 0 ? Math.max(...pages.map((p) => p.hits)) : 1;

  return (
    <div>
      <div className="mb-5">
        <Link
          href="/reports"
          className="text-sm text-gin-primary hover:underline"
        >
          Reports
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">Top pages</span>
      </div>

      <h1 className="text-[28px] font-normal tracking-tight mb-5 text-gin-title">
        Top pages
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-gin-s text-sm">
          {error}
        </div>
      )}

      {/* Period filter */}
      <div className="flex gap-2 mb-4">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`px-3 py-1.5 text-sm rounded-gin-s border transition-colors ${
              period === opt.value
                ? 'bg-gin-primary text-white border-gin-primary'
                : 'bg-white text-gin-text border-gin-border hover:bg-gin-bg-layer2'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white border border-gin-border rounded-gin p-8 text-center text-gin-text-light">
          Loading...
        </div>
      ) : pages.length === 0 ? (
        <div className="bg-white border border-gin-border rounded-gin p-8 text-center text-gin-text-light">
          No page views recorded for this period.
        </div>
      ) : (
        <div className="bg-white border border-gin-border rounded-gin overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gin-border-table bg-gin-bg-layer2">
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-8">
                  #
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                  Path
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-24">
                  Hits
                </th>
                <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-48" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gin-border-table">
              {pages.map((entry, idx) => (
                <tr key={entry.path} className="hover:bg-gin-primary-light transition-colors">
                  <td className="px-4 py-3 text-sm text-gin-text-light">{idx + 1}</td>
                  <td className="px-4 py-3 text-sm text-gin-text font-mono text-[13px]">
                    {entry.path}
                  </td>
                  <td className="px-4 py-3 text-sm text-gin-text font-medium">
                    {entry.hits}
                  </td>
                  <td className="px-4 py-3 text-sm text-gin-text">
                    <div className="w-full bg-gin-bg-layer2 rounded-full h-2">
                      <div
                        className="bg-gin-primary h-2 rounded-full transition-all"
                        style={{ width: `${(entry.hits / maxHits) * 100}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
