'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchVocabularies, deleteVocabulary, type EntityTypeDefinition } from '@/lib/api-entities';

export default function TaxonomyList() {
  const [vocabularies, setVocabularies] = useState<EntityTypeDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchVocabularies()
      .then((v) => {
        setVocabularies(v);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (vid: string, label: string) => {
    if (!confirm(`Delete vocabulary "${label}"?`)) return;
    try {
      await deleteVocabulary(vid);
      load();
    } catch {
      alert('Failed to delete vocabulary');
    }
  };

  if (loading) {
    return (
      <div>
        <div className="h-8 w-40 animate-pulse bg-gin-bg-layer2 rounded-gin-s mb-5" />
        <div className="bg-white border border-gin-border rounded-gin overflow-hidden">
          <div className="bg-gin-bg-layer2 px-4 py-3">
            <div className="h-4 w-full animate-pulse bg-gin-bg-app rounded-gin-s" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-4 py-3 border-t border-gin-border">
              <div className="h-4 w-3/4 animate-pulse bg-gin-bg-layer2 rounded-gin-s" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[28px] font-normal tracking-tight text-gin-title">Taxonomy</h1>
        <Link
          href="/structure/taxonomy/add"
          className="bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors"
        >
          + Add vocabulary
        </Link>
      </div>

      <div className="bg-white border border-gin-border rounded-gin overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gin-bg-layer2 border-b border-gin-border-table">
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Machine name</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Description</th>
              <th className="text-left px-4 py-3 text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vocabularies.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gin-text-light">
                  No vocabularies defined.{' '}
                  <Link href="/structure/taxonomy/add" className="text-gin-primary hover:underline">Add one now</Link>.
                </td>
              </tr>
            ) : (
              vocabularies.map((vocab) => (
                <tr key={vocab.bundle} className="hover:bg-gin-bg-layer2/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gin-text border-t border-gin-border">
                    <Link
                      href={`/structure/taxonomy/${vocab.bundle}`}
                      className="text-gin-primary hover:underline font-medium"
                    >
                      {vocab.label}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gin-text border-t border-gin-border">
                    <code className="text-xs bg-gin-bg-layer2 px-1.5 py-0.5 rounded-gin-s text-gin-text">
                      {vocab.bundle}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-sm text-gin-text-light border-t border-gin-border">
                    {vocab.description || '\u2014'}
                  </td>
                  <td className="px-4 py-3 text-sm border-t border-gin-border">
                    <div className="flex gap-3">
                      <Link
                        href={`/structure/taxonomy/${vocab.bundle}`}
                        className="text-sm text-gin-primary hover:underline"
                      >
                        List terms
                      </Link>
                      <Link
                        href={`/structure/taxonomy/${vocab.bundle}/edit`}
                        className="text-sm text-gin-primary hover:underline"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(vocab.bundle, vocab.label)}
                        className="text-sm text-gin-danger hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
