'use client';

import { useRouter } from 'next/navigation';
import { deleteBlockPlacement, toggleBlockPlacementStatus } from '@/app/(admin)/_actions/system';

export function DeleteBlockButton({
  placementId,
  label,
}: {
  placementId: string;
  label?: string;
}) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Delete the "${label || placementId}" block placement?`)) return;
    const result = await deleteBlockPlacement(placementId);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error ?? 'Failed to delete block placement');
    }
  };

  return (
    <button
      onClick={handleDelete}
      className="text-sm text-gin-danger hover:underline"
    >
      Delete
    </button>
  );
}

export function ToggleBlockStatusButton({
  placementId,
  status,
}: {
  placementId: string;
  status: boolean;
}) {
  const router = useRouter();

  const handleToggle = async () => {
    const result = await toggleBlockPlacementStatus(placementId);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error ?? 'Failed to toggle block status');
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        status
          ? 'bg-emerald-50 text-gin-green'
          : 'bg-gray-100 text-gin-text-light'
      }`}
    >
      {status ? 'Enabled' : 'Disabled'}
    </button>
  );
}
