'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { restoreRevision } from '@/app/(admin)/_actions/entity';
import { useToast } from '@/components/toast';

export function RestoreRevisionButton({ nid, vid }: { nid: number; vid: number }) {
  const router = useRouter();
  const { error: showError } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleRestore() {
    if (!confirm(`Are you sure you want to restore revision #${vid}? This will create a new revision with the data from revision #${vid}.`)) {
      return;
    }

    setLoading(true);
    try {
      const result = await restoreRevision(nid, vid);
      if (result.success) {
        router.refresh();
      } else {
        showError(result.error || 'Failed to restore revision');
      }
    } catch (err) {
      showError('Failed to restore revision');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleRestore}
      disabled={loading}
      className="text-sm text-amber-600 hover:text-amber-800 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Restoring...' : 'Restore'}
    </button>
  );
}
