'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearAllCaches } from '../../_actions/system';

export function ClearCacheButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleClear() {
    if (!confirm('Clear all caches? This may temporarily slow down the site.')) return;
    setLoading(true);
    setMessage('');
    try {
      const result = await clearAllCaches();
      if (result.success) {
        setMessage('All caches cleared.');
        router.refresh();
      } else {
        setMessage(result.error || 'Failed to clear caches');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to clear caches');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {message && (
        <span className={`text-sm ${message.includes('cleared') ? 'text-gin-green' : 'text-gin-danger'}`}>
          {message}
        </span>
      )}
      <button
        onClick={handleClear}
        disabled={loading}
        className="px-5 py-2.5 bg-gin-primary hover:bg-gin-primary-hover text-white text-sm font-semibold rounded-gin transition-colors disabled:opacity-50"
      >
        {loading ? 'Clearing...' : 'Clear all caches'}
      </button>
    </div>
  );
}
