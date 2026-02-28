'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  updateEntity,
  fetchEntity,
  fetchEntityList,
  fetchVocabularies,
  fetchTermAncestors,
  type EntityData,
  type EntityTypeDefinition,
  type TermAncestor,
} from '@/lib/api-entities';

function buildHierarchy(terms: EntityData[]): Array<EntityData & { _depth: number }> {
  const byId = new Map<number, EntityData>();
  for (const term of terms) {
    if (term.nid != null) byId.set(term.nid, term);
  }

  const roots: EntityData[] = [];
  const childrenMap = new Map<number, EntityData[]>();
  for (const term of terms) {
    const parentId = (term.parent as number) ?? 0;
    if (parentId === 0 || !byId.has(parentId)) {
      roots.push(term);
    } else {
      const siblings = childrenMap.get(parentId) ?? [];
      siblings.push(term);
      childrenMap.set(parentId, siblings);
    }
  }

  const result: Array<EntityData & { _depth: number }> = [];
  function walk(term: EntityData, depth: number) {
    result.push({ ...term, _depth: depth });
    for (const child of childrenMap.get(term.nid!) ?? []) {
      walk(child, depth + 1);
    }
  }
  for (const root of roots) walk(root, 0);
  return result;
}

export default function TaxonomyTermEditPage() {
  const params = useParams<{ vocabulary: string; tid: string }>();
  const router = useRouter();
  const vocabulary = params.vocabulary;
  const tid = params.tid;

  const [vocabDef, setVocabDef] = useState<EntityTypeDefinition | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState(0);
  const [parent, setParent] = useState(0);
  const [published, setPublished] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [availableTerms, setAvailableTerms] = useState<Array<EntityData & { _depth: number }>>([]);
  const [ancestors, setAncestors] = useState<TermAncestor[]>([]);

  useEffect(() => {
    if (!vocabulary) return;
    fetchVocabularies()
      .then((vocabs) => {
        const found = vocabs.find((v) => v.bundle === vocabulary);
        setVocabDef(found ?? null);
      })
      .catch(() => {});
  }, [vocabulary]);

  useEffect(() => {
    if (!vocabulary || !tid) return;
    fetchEntityList('taxonomy_term', vocabulary, {
      limit: 200,
      sort: 'weight,title',
    })
      .then((res) => {
        const currentTid = parseInt(tid, 10);
        const filtered = res.data.filter((t) => t.nid !== currentTid);
        setAvailableTerms(buildHierarchy(filtered));
      })
      .catch(() => {});
  }, [vocabulary, tid]);

  useEffect(() => {
    if (!vocabulary || !tid) return;
    setLoading(true);
    fetchEntity('taxonomy_term', vocabulary, parseInt(tid, 10))
      .then((data) => {
        setName((data.title as string) ?? '');
        setDescription((data.description__value as string) ?? '');
        setWeight((data.weight as number) ?? 0);
        setParent((data.parent as number) ?? 0);
        setPublished(Boolean(data.status));
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load term');
        setLoading(false);
      });
  }, [vocabulary, tid]);

  useEffect(() => {
    if (!vocabulary || !tid) return;
    fetchTermAncestors(vocabulary, parseInt(tid, 10))
      .then(setAncestors)
      .catch(() => setAncestors([]));
  }, [vocabulary, tid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vocabulary || !tid) return;
    setError('');
    setSubmitting(true);

    try {
      await updateEntity('taxonomy_term', vocabulary, parseInt(tid, 10), {
        title: name,
        status: published,
        weight,
        parent,
      });
      router.push(`/structure/taxonomy/${vocabulary}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save term');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="mb-5">
          <div className="h-4 w-48 animate-pulse bg-gin-bg-layer2 rounded-gin-s" />
        </div>
        <div className="h-8 w-40 animate-pulse bg-gin-bg-layer2 rounded-gin-s mb-5" />
        <div className="bg-white border border-gin-border rounded-gin p-6 max-w-xl">
          <div className="space-y-4">
            <div className="h-4 w-24 animate-pulse bg-gin-bg-layer2 rounded-gin-s" />
            <div className="h-9 w-full animate-pulse bg-gin-bg-layer2 rounded-gin-s" />
            <div className="h-4 w-32 animate-pulse bg-gin-bg-layer2 rounded-gin-s" />
            <div className="h-20 w-full animate-pulse bg-gin-bg-layer2 rounded-gin-s" />
          </div>
        </div>
      </div>
    );
  }

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
          {vocabDef?.label ?? vocabulary}
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
