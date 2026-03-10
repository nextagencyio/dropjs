'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { clearLogs } from '@/app/(admin)/_actions/system';

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

export function LogFilters({
  types,
  currentType,
  currentSeverity,
  total,
}: {
  types: string[];
  currentType: string;
  currentSeverity: string;
  total: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page'); // Reset to page 1 on filter change
    router.push(`/reports/logs?${params.toString()}`);
  }

  return (
    <div className="flex gap-3 mb-4">
      <select
        value={currentType}
        onChange={(e) => updateFilter('type', e.target.value)}
        className="px-3 py-1.5 border border-gin-border-form rounded-gin-s text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gin-primary"
      >
        <option value="">All types</option>
        {types.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      <select
        value={currentSeverity}
        onChange={(e) => updateFilter('severity', e.target.value)}
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
  );
}

export function ClearLogsButton({ disabled }: { disabled: boolean }) {
  async function handleClear() {
    if (!confirm('Are you sure you want to clear all log messages?')) return;
    await clearLogs();
    window.location.href = '/reports/logs';
  }

  return (
    <button
      onClick={handleClear}
      disabled={disabled}
      className="px-3 py-1.5 text-sm bg-gin-danger text-white rounded-gin-s hover:opacity-90 disabled:opacity-50 transition-colors"
    >
      Clear log messages
    </button>
  );
}

export function LogPagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function goToPage(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage > 1) {
      params.set('page', String(newPage));
    } else {
      params.delete('page');
    }
    router.push(`/reports/logs?${params.toString()}`);
  }

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-4">
      <div className="text-sm text-gin-text-light">
        Page {page} of {totalPages}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => goToPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="px-3 py-1.5 text-sm border border-gin-border rounded-gin-s hover:bg-gin-bg-layer2 disabled:opacity-50 transition-colors"
        >
          Previous
        </button>
        <button
          onClick={() => goToPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="px-3 py-1.5 text-sm border border-gin-border rounded-gin-s hover:bg-gin-bg-layer2 disabled:opacity-50 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
