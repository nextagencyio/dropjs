'use client';

import { useState, useEffect, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { searchAction } from '../_actions/search';

interface SearchResult {
  entity_type: string;
  bundle: string;
  id: number;
  title: string;
  status: boolean;
  changed: number;
}

interface SearchMeta {
  query: string;
  total: number;
  engine: string;
}

function resultUrl(result: SearchResult): string {
  if (result.entity_type === 'node') return `/node/${result.id}`;
  if (result.entity_type === 'taxonomy_term') return `/taxonomy/term/${result.id}`;
  return `/node/${result.id}`;
}

export function SearchClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (initialQuery.length >= 2) {
      performSearch(initialQuery);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function performSearch(q: string) {
    if (q.length < 2) return;
    setSearched(true);
    startTransition(async () => {
      const response = await searchAction(q, 50);
      setResults(response.data || []);
      setMeta(response.meta);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    performSearch(trimmed);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Search</h1>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search content..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gin-primary"
            minLength={2}
            autoFocus
          />
          <button
            type="submit"
            disabled={isPending || query.trim().length < 2}
            className="px-6 py-2 bg-gin-primary text-white text-sm rounded hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {isPending && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-gin-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isPending && searched && (
        <div>
          {meta && (
            <p className="text-sm text-gray-500 mb-4">
              {meta.total === 0
                ? `No results for "${meta.query}"`
                : `${meta.total} result${meta.total !== 1 ? 's' : ''} for "${meta.query}"`}
            </p>
          )}

          {results.length > 0 && (
            <div className="space-y-4">
              {results.map((result) => (
                <article key={`${result.entity_type}-${result.id}`} className="border-b border-gray-100 pb-4">
                  <h2 className="text-lg font-medium">
                    <Link href={resultUrl(result)} className="text-gin-primary hover:underline no-underline">
                      {result.title}
                    </Link>
                  </h2>
                  <div className="text-xs text-gray-500 mt-1 flex gap-2">
                    <span className="px-2 py-0.5 bg-gray-100 rounded capitalize">{result.bundle}</span>
                    <span className="capitalize">{result.entity_type.replace('_', ' ')}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {!searched && !isPending && (
        <p className="text-gray-500 text-sm">Enter a search term to find content.</p>
      )}
    </div>
  );
}
