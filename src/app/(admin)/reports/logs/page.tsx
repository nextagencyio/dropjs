'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchLogs, clearLogs, type LogEntry } from '@/lib/api-system';

const SEVERITY_COLORS: Record<string, string> = {
  emergency: 'bg-red-100 text-red-800 border border-red-200',
  alert: 'bg-red-100 text-red-800 border border-red-200',
  critical: 'bg-red-50 text-red-700 border border-red-100',
  error: 'bg-red-50 text-red-700 border border-red-100',
  warning: 'bg-amber-50 text-amber-700 border border-amber-100',
  notice: 'bg-blue-50 text-blue-700 border border-blue-100',
  info: 'bg-sky-50 text-sky-700 border border-sky-100',
  debug: 'bg-gray-50 text-gray-600 border border-gray-100',
};

const SEVERITY_OPTIONS = [
  { value: '', label: 'All severities' },
  { value: '0', label: 'Emergency' },
  { value: '1', label: 'Alert' },
  { value: '2', label: 'Critical' },
  { value: '3', label: 'Error' },
  { value: '4', label: 'Warning' },
  { value: '5', label: 'Notice' },
  { value: '6', label: 'Info' },
  { value: '7', label: 'Debug' },
];

function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleString();
}

export default function RecentLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [types, setTypes] = useState<string[]>([]);
  const [clearing, setClearing] = useState(false);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchLogs({
        page,
        limit: 50,
        type: typeFilter || undefined,
        severity: severityFilter,
      });
      setLogs(res.data);
      setTotalPages(res.meta.pages);
      setTotal(res.meta.total);
      if (res.meta.types.length > 0) {
        setTypes(res.meta.types);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, severityFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear all log messages?')) return;
    setClearing(true);
    try {
      await clearLogs();
      setLogs([]);
      setTotal(0);
      setTotalPages(1);
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear logs');
    } finally {
      setClearing(false);
    }
  };

  const handleTypeChange = (val: string) => {
    setTypeFilter(val);
    setPage(1);
  };

  const handleSeverityChange = (val: string) => {
    setSeverityFilter(val);
    setPage(1);
  };

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
        <span className="text-sm text-gin-text-light">Recent log messages</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[28px] font-normal tracking-tight text-gin-title">
          Recent log messages
        </h1>
        <button
          onClick={handleClear}
          disabled={clearing || logs.length === 0}
          className="px-3 py-1.5 text-sm bg-gin-danger text-white rounded-gin-s hover:opacity-90 disabled:opacity-50 transition-colors"
        >
          {clearing ? 'Clearing...' : 'Clear log messages'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-gin-s text-sm">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={typeFilter}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="px-3 py-1.5 border border-gin-border-form rounded-gin-s text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gin-primary"
        >
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={severityFilter}
          onChange={(e) => handleSeverityChange(e.target.value)}
          className="px-3 py-1.5 border border-gin-border-form rounded-gin-s text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gin-primary"
        >
          {SEVERITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <span className="text-sm text-gin-text-light self-center">
          {total} {total === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {loading ? (
        <div className="bg-white border border-gin-border rounded-gin p-8 text-center text-gin-text-light">
          Loading...
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white border border-gin-border rounded-gin p-8 text-center text-gin-text-light">
          No log messages found.
        </div>
      ) : (
        <>
          <div className="bg-white border border-gin-border rounded-gin overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gin-border-table bg-gin-bg-layer2">
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-24">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-44">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">
                    Message
                  </th>
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-16">
                    User
                  </th>
                  <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-24">
                    Severity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gin-border-table">
                {logs.map((log) => (
                  <tr key={log.wid} className="hover:bg-gin-primary-light transition-colors">
                    <td className="px-4 py-3 text-sm text-gin-text font-medium">
                      {log.type}
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text-light whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text break-words max-w-md">
                      {log.message}
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text-light">
                      {log.uid || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-gin-s text-[11px] font-medium ${
                          SEVERITY_COLORS[log.severity_label] || 'bg-gray-50 text-gray-600 border border-gray-100'
                        }`}
                      >
                        {log.severity_label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gin-text-light">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm border border-gin-border rounded-gin-s hover:bg-gin-bg-layer2 disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-sm border border-gin-border rounded-gin-s hover:bg-gin-bg-layer2 disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
