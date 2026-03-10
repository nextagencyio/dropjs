'use client';

import { useRouter } from 'next/navigation';
import { deleteContentType } from '@/app/(admin)/_actions/entity';

export function DeleteContentTypeButton({
  entityType,
  bundle,
  label,
}: {
  entityType: string;
  bundle: string;
  label: string;
}) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Delete content type "${label}"? This cannot be undone.`)) return;
    const result = await deleteContentType(entityType, bundle);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error ?? 'Failed to delete content type');
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
