'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Clock } from 'lucide-react';
import { EntityForm } from '@/components/entity-form';
import { apiFetch } from '@/lib/api-client';

export default function NodeEditPage() {
  const params = useParams<{ id: string }>();
  const { id } = params;
  const [bundle, setBundle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadNode() {
      try {
        const res = await apiFetch<{ data: { type: string } }>(`/entity/node/${id}`);
        setBundle(res.data.type);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load node');
      }
      setLoading(false);
    }
    if (id) loadNode();
  }, [id]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gin-bg-layer2 rounded-gin-s w-48" />
        <div className="h-8 bg-gin-bg-layer2 rounded-gin-s w-64" />
        <div className="h-64 bg-gin-bg-layer2 rounded-gin" />
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div>
        <div className="bg-red-50 border border-red-200 text-gin-danger rounded-gin-s px-4 py-3 text-sm">
          {error || 'Node not found.'}
        </div>
      </div>
    );
  }

  const bundleLabel = bundle.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div>
      <div className="flex items-center gap-2 text-sm mb-4">
        <Link href="/content" className="text-gin-primary hover:underline font-medium">
          Content
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gin-text-light" />
        <span className="text-gin-text-light">Edit</span>
      </div>

      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title leading-tight">
            Edit <span className="text-gin-text-light">{bundleLabel}</span>
          </h1>
          <p className="text-sm text-gin-text-light mt-1">
            Editing node #{id}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/content/revisions/node/${bundle}/${id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gin-text bg-white border border-gin-border rounded-gin-s hover:bg-gin-bg-layer2 transition-colors"
          >
            <Clock className="w-4 h-4 text-gin-text-light" />
            Revisions
          </Link>
        </div>
      </div>
      <EntityForm entityType="node" bundle={bundle} entityId={parseInt(id, 10)} />
    </div>
  );
}
