'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createVocabulary } from '@/app/(admin)/_actions/system';

function toMachineName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
}

export function VocabularyAddForm() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [vid, setVid] = useState('');
  const [description, setDescription] = useState('');
  const [autoName, setAutoName] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleNameChange = (value: string) => {
    setName(value);
    if (autoName) {
      setVid(toMachineName(value));
    }
  };

  const handleVidChange = (value: string) => {
    setAutoName(false);
    setVid(value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 32));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const result = await createVocabulary({
      vid,
      name,
      description: description || undefined,
    });
    if (result.success) {
      router.push('/structure/taxonomy');
    } else {
      setError(result.error ?? 'Failed to create vocabulary');
    }
    setSubmitting(false);
  };

  return (
    <div>
      <nav className="mb-5 flex items-center gap-0">
        <Link
          href="/structure/taxonomy"
          className="text-gin-primary hover:underline text-sm"
        >
          Taxonomy
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">Add vocabulary</span>
      </nav>

      <h1 className="text-[28px] font-normal tracking-tight text-gin-title mb-5">Add vocabulary</h1>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-gin-danger rounded-gin-s px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gin-border rounded-gin p-6 max-w-xl">
        <div className="mb-4">
          <label htmlFor="name" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
            Name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            className="w-full"
            placeholder="e.g. Tags"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="vid" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
            Machine name
          </label>
          <input
            id="vid"
            type="text"
            value={vid}
            onChange={(e) => handleVidChange(e.target.value)}
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
            placeholder="Describe this vocabulary..."
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || !name || !vid}
            className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating...' : 'Save vocabulary'}
          </button>
          <Link
            href="/structure/taxonomy"
            className="border border-gin-border text-gin-text rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-bg-layer2 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
