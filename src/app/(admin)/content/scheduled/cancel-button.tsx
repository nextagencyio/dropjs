'use client';

import { useState } from 'react';
import { cancelSchedule } from '../../_actions/entity';

export function CancelScheduleButton({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: number;
}) {
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (!confirm('Cancel this scheduled transition?')) return;
    setLoading(true);
    try {
      const result = await cancelSchedule(entityType, entityId);
      if (!result.success) {
        alert(result.error || 'Failed to cancel schedule');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="text-xs text-red-600 hover:text-red-800 hover:underline disabled:opacity-50"
    >
      {loading ? 'Cancelling...' : 'Cancel'}
    </button>
  );
}
