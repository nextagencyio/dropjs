'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  fetchContentType,
  deleteField,
  reorderFields,
  type EntityTypeDefinition,
} from '@/lib/api-entities';

interface FieldRow {
  name: string;
  label: string;
  type: string;
  required: boolean;
  cardinality: number;
  weight: number;
}

const FIELD_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  string: { label: 'Text (plain)', color: 'bg-blue-50 text-blue-700' },
  text_long: { label: 'Text (long)', color: 'bg-blue-50 text-blue-700' },
  integer: { label: 'Integer', color: 'bg-purple-50 text-purple-700' },
  float: { label: 'Float', color: 'bg-purple-50 text-purple-700' },
  decimal: { label: 'Decimal', color: 'bg-purple-50 text-purple-700' },
  boolean: { label: 'Boolean', color: 'bg-yellow-50 text-yellow-700' },
  email: { label: 'Email', color: 'bg-green-50 text-green-700' },
  timestamp: { label: 'Timestamp', color: 'bg-orange-50 text-orange-700' },
  entity_reference: { label: 'Reference', color: 'bg-indigo-50 text-indigo-700' },
  image: { label: 'Image', color: 'bg-pink-50 text-pink-700' },
  list_string: { label: 'List (text)', color: 'bg-teal-50 text-teal-700' },
  json: { label: 'JSON', color: 'bg-gray-100 text-gray-700' },
};

export default function ContentTypeFieldsPage() {
  const params = useParams<{ entityType: string; bundle: string }>();
  const { entityType, bundle } = params;
  const [definition, setDefinition] = useState<EntityTypeDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadDefinition = useCallback(() => {
    if (!entityType || !bundle) return;
    fetchContentType(entityType, bundle)
      .then((def) => {
        setDefinition(def);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load content type');
        setLoading(false);
      });
  }, [entityType, bundle]);

  useEffect(() => {
    loadDefinition();
  }, [loadDefinition]);

  const handleDelete = async (fieldName: string) => {
    if (!entityType || !bundle) return;
    setDeleting(true);
    setError('');
    try {
      await deleteField(entityType, bundle, fieldName);
      setDeleteConfirm(null);
      loadDefinition();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete field');
    } finally {
      setDeleting(false);
    }
  };

  const handleMove = async (fieldName: string, direction: 'up' | 'down') => {
    if (!entityType || !bundle || !definition) return;
    setError('');

    const sorted = Object.entries(definition.fields)
      .map(([name, field]) => ({
        name,
        weight: (field.weight as number) ?? 0,
      }))
      .sort((a, b) => a.weight - b.weight);

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

    try {
      await reorderFields(
        entityType,
        bundle,
        sorted.map((f) => ({ name: f.name, weight: f.weight })),
      );
      loadDefinition();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder fields');
    }
  };

  if (loading) {
    return (
      <div>
        <div className="mb-5">
          <div className="h-4 w-48 animate-pulse bg-gin-bg-layer2 rounded-gin-s" />
        </div>
        <div className="h-8 w-64 animate-pulse bg-gin-bg-layer2 rounded-gin-s mb-5" />
        <div className="bg-white border border-gin-border rounded-gin overflow-hidden">
          <div className="bg-gin-bg-layer2 px-4 py-3">
            <div className="h-4 w-full animate-pulse bg-gin-bg-app rounded-gin-s" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-4 py-3 border-t border-gin-border">
              <div className="h-4 w-full animate-pulse bg-gin-bg-layer2 rounded-gin-s" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!definition) {
    return (
      <div className="bg-red-50 border border-red-200 text-gin-danger rounded-gin-s px-4 py-3 text-sm">
        {error || 'Content type not found.'}
      </div>
    );
  }

  const fields: FieldRow[] = Object.entries(definition.fields)
    .map(([name, field]) => ({
      name,
      label: field.label,
      type: field.type,
      required: field.required ?? false,
      cardinality: field.cardinality ?? 1,
      weight: (field.weight as number) ?? 0,
    }))
    .sort((a, b) => a.weight - b.weight);

  return (
    <div>
      <nav className="mb-5 flex items-center gap-0">
        <Link
          href="/structure/types"
          className="text-gin-primary hover:underline text-sm"
        >
          Content Types
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">{definition.label}</span>
      </nav>

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-[28px] font-normal tracking-tight text-gin-title">
          {definition.label} -- Fields
        </h1>
        <Link
          href={`/structure/types/${entityType}/${bundle}/fields/add`}
          className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors"
        >
          + Add field
        </Link>
      </div>
      <p className="text-sm text-gin-text-light mb-5">
        {definition.entity_type}:{definition.bundle}
        {definition.description && ` -- ${definition.description}`}
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-gin-danger rounded-gin-s px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {deleteConfirm && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-gin-s px-4 py-3">
          <p className="text-sm text-red-800 mb-3">
            Are you sure you want to delete the field <strong>{deleteConfirm}</strong>?
            This will permanently remove the field and all its stored data.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleDelete(deleteConfirm)}
              disabled={deleting}
              className="bg-gin-danger text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Yes, delete'}
            </button>
            <button
              onClick={() => setDeleteConfirm(null)}
              disabled={deleting}
              className="border border-gin-border text-gin-text rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-bg-layer2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gin-border rounded-gin overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gin-bg-layer2 border-b border-gin-border-table">
              <th className="w-16 px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Order</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Field Name</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Label</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Type</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Required</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Cardinality</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Operations</th>
            </tr>
          </thead>
          <tbody>
            {fields.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gin-text-light">
                  No fields defined.{' '}
                  <Link href={`/structure/types/${entityType}/${bundle}/fields/add`} className="text-gin-primary hover:underline">Add a field</Link>.
                </td>
              </tr>
            ) : (
              fields.map((f, idx) => {
                const typeInfo = FIELD_TYPE_LABELS[f.type];
                return (
                  <tr key={f.name} className="hover:bg-gin-bg-layer2/50 transition-colors">
                    <td className="text-center px-4 py-3 text-sm text-gin-text border-t border-gin-border">
                      <div className="flex flex-col items-center gap-0.5">
                        <button
                          onClick={() => handleMove(f.name, 'up')}
                          disabled={idx === 0}
                          className="text-gin-text-light hover:text-gin-text disabled:opacity-25 disabled:cursor-not-allowed text-xs leading-none p-0.5"
                          title="Move up"
                        >
                          &#9650;
                        </button>
                        <button
                          onClick={() => handleMove(f.name, 'down')}
                          disabled={idx === fields.length - 1}
                          className="text-gin-text-light hover:text-gin-text disabled:opacity-25 disabled:cursor-not-allowed text-xs leading-none p-0.5"
                          title="Move down"
                        >
                          &#9660;
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text border-t border-gin-border">
                      <code className="text-xs bg-gin-bg-layer2 px-1.5 py-0.5 rounded-gin-s text-gin-text">
                        {f.name}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text border-t border-gin-border">{f.label}</td>
                    <td className="px-4 py-3 text-sm border-t border-gin-border">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          typeInfo?.color ?? 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {typeInfo?.label ?? f.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm border-t border-gin-border">
                      {f.required ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-gin-green">Yes</span>
                      ) : (
                        <span className="text-gin-text-light">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gin-text-light border-t border-gin-border">
                      {f.cardinality === -1 ? 'Unlimited' : f.cardinality}
                    </td>
                    <td className="px-4 py-3 text-sm border-t border-gin-border">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/structure/types/${entityType}/${bundle}/fields/${f.name}/edit`}
                          className="text-sm text-gin-primary hover:underline"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => setDeleteConfirm(f.name)}
                          className="text-sm text-gin-danger hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
