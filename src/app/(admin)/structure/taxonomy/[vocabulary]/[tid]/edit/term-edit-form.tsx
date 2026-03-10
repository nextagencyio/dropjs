'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateEntity } from '@/app/(admin)/_actions/entity';

interface TermOption {
  nid: number;
  title: string;
  _depth: number;
}

interface TermAncestor {
  tid: number;
  title: string;
  parent: number;
}

interface TermData {
  title: string;
  description: string;
  weight: number;
  parent: number;
  published: boolean;
}

export function TermEditForm({
  vocabulary,
  vocabLabel,
  tid,
  initialData,
  availableTerms,
  ancestors,
}: {
  vocabulary: string;
  vocabLabel: string;
  tid: number;
  initialData: TermData;
  availableTerms: TermOption[];
  ancestors: TermAncestor[];
}) {
  const router = useRouter();

  const [name, setName] = useState(initialData.title);
  const [description, setDescription] = useState(initialData.description);
  const [weight, setWeight] = useState(initialData.weight);
  const [parent, setParent] = useState(initialData.parent);
  const [published, setPublished] = useState(initialData.published);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const result = await updateEntity('taxonomy_term', vocabulary, tid, {
      title: name,
      status: published,
      weight,
      parent,
    });
    if (result.success) {
      router.push(`/structure/taxonomy/${vocabulary}`);
    } else {
      setError(result.error ?? 'Failed to save term');
    }
    setSubmitting(false);
  };

  return (
    <div>
      <nav className="mb-5 flex flex-wrap items-center gap-0">
        <Link
          href="/structure/taxonomy"
          className="text-gin-primary hover:underline text-sm"
        >
          Taxonomy
        </Link>
        <span className="text-gin-text-light mx-2">/</span>
        <Link
          href={`/structure/taxonomy/${vocabulary}`}
          className="text-gin-primary hover:underline text-sm"
        >
          {vocabLabel}
        </Link>

        {ancestors.length > 1 && ancestors.slice(0, -1).map((anc) => (
          <span key={anc.tid} className="flex items-center">
            <span className="text-gin-text-light mx-2">/</span>
            <Link
              href={`/structure/taxonomy/${vocabulary}/${anc.tid}/edit`}
              className="text-gin-primary hover:underline text-sm"
            >
              {anc.title}
            </Link>
          </span>
        ))}

        <span className="text-gin-text-light mx-2">/</span>
        <span className="text-sm text-gin-text-light">Edit term</span>
      </nav>

      <h1 className="text-[28px] font-normal tracking-tight text-gin-title mb-5">Edit term</h1>

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
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full"
            placeholder="Term name"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="description" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full"
            placeholder="Optional description..."
          />
        </div>

        <div className="mb-4">
          <label htmlFor="parent" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
            Parent term
          </label>
          <select
            id="parent"
            value={parent}
            onChange={(e) => setParent(parseInt(e.target.value, 10) || 0)}
            className="w-full"
          >
            <option value={0}>- None -</option>
            {availableTerms.map((term) => (
              <option key={term.nid} value={term.nid}>
                {'\u00A0\u00A0'.repeat(term._depth)}{term._depth > 0 ? '-- ' : ''}{term.title}
              </option>
            ))}
          </select>
          <p className="text-[12px] text-gin-text-light mt-1">
            Select a parent to create a hierarchy.
          </p>
        </div>

        <div className="mb-4">
          <label htmlFor="weight" className="block text-[13px] font-semibold text-gin-text-light mb-1.5">
            Weight
          </label>
          <input
            id="weight"
            type="number"
            value={weight}
            onChange={(e) => setWeight(parseInt(e.target.value, 10) || 0)}
            className="w-32"
          />
          <p className="text-[12px] text-gin-text-light mt-1">
            Lower weights appear first in lists.
          </p>
        </div>

        <div className="mb-6">
          <label htmlFor="published" className="flex items-center gap-2 cursor-pointer">
            <input
              id="published"
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="rounded border-gin-border-form text-gin-primary focus:ring-gin-primary"
            />
            <span className="text-sm text-gin-text">Published</span>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || !name}
            className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving...' : 'Save term'}
          </button>
          <Link
            href={`/structure/taxonomy/${vocabulary}`}
            className="border border-gin-border text-gin-text rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-bg-layer2 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
