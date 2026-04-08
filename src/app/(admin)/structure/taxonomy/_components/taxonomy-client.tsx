'use client';

import { useRouter } from 'next/navigation';
import { deleteVocabulary } from '@/app/(admin)/_actions/system';
import { useToast } from '@/components/toast';

export function DeleteVocabularyButton({
  vid,
  label,
}: {
  vid: string;
  label: string;
}) {
  const router = useRouter();
  const { error: showError } = useToast();

  const handleDelete = async () => {
    if (!confirm(`Delete vocabulary "${label}"?`)) return;
    const result = await deleteVocabulary(vid);
    if (result.success) {
      router.refresh();
    } else {
      showError(result.error ?? 'Failed to delete vocabulary');
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
