'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createContentType } from '@/lib/api-entities';

function toMachineName(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
}

export function ContentTypeAddForm() {
  const router = useRouter();

  const [label, setLabel] = useState('');
  const [machineName, setMachineName] = useState('');
  const [description, setDescription] = useState('');
  const [autoName, setAutoName] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleLabelChange = (value: string) => {
    setLabel(value);
    if (autoName) {
      setMachineName(toMachineName(value));
    }
  };

  const handleMachineNameChange = (value: string) => {
    setAutoName(false);
    setMachineName(value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 32));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await createContentType({
        bundle: machineName,
        label,
        description: description || undefined,
      });
      router.push('/structure/types');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create content type',
      );
    } finally {
      setSubmitting(false);
    }
  };

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
        <span className="text-sm text-gin-text-light">Add content type</span>
      </nav>

      <h1 className="text-[28px] font-normal tracking-tight text-gin-title mb-5">
        Add content type
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
            onChange={(e) => handleLabelChange(e.target.value)}
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
            onChange={(e) => handleMachineNameChange(e.target.value)}
            required
            maxLength={32}
            pattern="[a-z][a-z0-9_]*"
            className="w-full font-mono bg-gin-bg-layer2"
          />
          <p className="text-[12px] text-gin-text-light mt-1">
            Lowercase letters, numbers, and underscores only. Max 32 characters.
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
            disabled={submitting || !label || !machineName}
            className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating...' : 'Save content type'}
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
