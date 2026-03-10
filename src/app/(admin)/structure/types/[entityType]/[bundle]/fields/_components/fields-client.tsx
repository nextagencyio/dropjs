'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteField, reorderFields } from '@/app/(admin)/_actions/entity';

interface FieldRow {
  name: string;
  label: string;
  type: string;
  required: boolean;
  cardinality: number;
  weight: number;
}

export function DeleteFieldButton({
  fieldName,
  entityType,
  bundle,
}: {
  fieldName: string;
  entityType: string;
  bundle: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          onClick={async () => {
            setDeleting(true);
            const result = await deleteField(entityType, bundle, fieldName);
            if (result.success) {
              router.refresh();
            } else {
              alert(result.error ?? 'Failed to delete field');
            }
            setDeleting(false);
            setConfirming(false);
          }}
          disabled={deleting}
          className="text-xs text-white bg-gin-danger rounded px-2 py-0.5 disabled:opacity-50"
        >
          {deleting ? '...' : 'Confirm'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-gin-text-light hover:underline"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-sm text-gin-danger hover:underline"
    >
      Delete
    </button>
  );
}

export function ReorderFieldButton({
  fieldName,
  direction,
  disabled,
  entityType,
  bundle,
  fields,
}: {
  fieldName: string;
  direction: 'up' | 'down';
  disabled: boolean;
  entityType: string;
  bundle: string;
  fields: FieldRow[];
}) {
  const router = useRouter();

  const handleMove = async () => {
    const sorted = [...fields].sort((a, b) => a.weight - b.weight);
    const idx = sorted.findIndex((f) => f.name === fieldName);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sorted.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const tmpWeight = sorted[idx].weight;
    sorted[idx].weight = sorted[swapIdx].weight;
    sorted[swapIdx].weight = tmpWeight;

    if (sorted[idx].weight === sorted[swapIdx].weight) {
      sorted.forEach((item, i) => {
        item.weight = i;
      });
    }

    const result = await reorderFields(
      entityType,
      bundle,
      sorted.map((f) => ({ name: f.name, weight: f.weight })),
    );
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error ?? 'Failed to reorder fields');
    }
  };

  return (
    <button
      onClick={handleMove}
      disabled={disabled}
      className="text-gin-text-light hover:text-gin-text disabled:opacity-25 disabled:cursor-not-allowed text-xs leading-none p-0.5"
      title={direction === 'up' ? 'Move up' : 'Move down'}
    >
      {direction === 'up' ? '\u25B2' : '\u25BC'}
    </button>
  );
}
