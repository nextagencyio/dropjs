'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
];

export function PeriodSelector({ currentPeriod }: { currentPeriod: string }) {
  const router = useRouter();

  function selectPeriod(value: string) {
    const params = new URLSearchParams();
    if (value && value !== '7d') {
      params.set('period', value);
    }
    const qs = params.toString();
    router.push(`/reports/top-pages${qs ? `?${qs}` : ''}`);
  }

  return (
    <div className="flex gap-2 mb-4">
      {PERIOD_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => selectPeriod(opt.value)}
          className={`px-3 py-1.5 text-sm rounded-gin-s border transition-colors ${
            currentPeriod === opt.value
              ? 'bg-gin-primary text-white border-gin-primary'
              : 'bg-white text-gin-text border-gin-border hover:bg-gin-bg-layer2'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
