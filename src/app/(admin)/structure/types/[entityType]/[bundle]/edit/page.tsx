'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchContentType, updateContentType } from '@/lib/api-entities';

export default function ContentTypeEditPage() {
  const router = useRouter();
  const params = useParams<{ entityType: string; bundle: string }>();
  const { entityType, bundle } = params;

  const [label, setLabel] = useState('');
  const [machineName, setMachineName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!entityType || !bundle) return;
    fetchContentType(entityType, bundle)
      .then((ct) => {
        setLabel(ct.label);
        setMachineName(ct.bundle);
        setDescription(ct.description || '');
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load content type');
        setLoading(false);
      });
  }, [entityType, bundle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityType || !bundle) return;
    setError('');
    setSubmitting(true);

    try {
      await updateContentType(entityType, bundle, {
        label,
        description: description || undefined,
      });
      router.push('/structure/types');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to update content type',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gin-border rounded-gin p-6 max-w-xl">
        <div className="space-y-4">
          <div className="h-5 w-32 animate-pulse bg-gin-bg-layer2 rounded-gin-s" />
          <div className="h-9 w-full animate-pulse bg-gin-bg-layer2 rounded-gin-s" />
          <div className="h-5 w-24 animate-pulse bg-gin-bg-layer2 rounded-gin-s" />
          <div className="h-9 w-full animate-pulse bg-gin-bg-layer2 rounded-gin-s" />
          <div className="h-5 w-28 animate-pulse bg-gin-bg-layer2 rounded-gin-s" />
          <div className="h-20 w-full animate-pulse bg-gin-bg-layer2 rounded-gin-s" />
        </div>
      </div>
    );
  }

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
        <span className="text-sm text-gin-text-light">Edit {label}</span>
      </nav>

      <h1 className="text-[28px] font-normal tracking-tight text-gin-title mb-5">
        Edit content type
      </h1>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-gin-danger rounded-gin-s px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gin-border rounded-gin p-6 max-w-xl">
        <div className="mb-4">
          <label htmlFor="label" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
            Label *
          </label>
          <input
            id="label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
            className="w-full"
            placeholder="e.g. Article"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="machine-name" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
            Machine name
          </label>
          <input
            id="machine-name"
            type="text"
            value={machineName}
            disabled
            className="w-full font-mono bg-gin-bg-layer2 opacity-60 cursor-not-allowed"
          />
          <p className="text-[12px] text-gin-text-light mt-1">
            Machine name cannot be changed.
          </p>
        </div>

        <div className="mb-6">
          <label htmlFor="description" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full"
            placeholder="Describe this content type..."
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || !label}
            className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving...' : 'Save content type'}
          </button>
          <Link
            href="/structure/types"
            className="border border-gin-border text-gin-text rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-bg-layer2 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
