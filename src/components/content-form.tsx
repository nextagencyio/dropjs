'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CircleAlert, ChevronRight, Clock } from 'lucide-react';
import { EntityForm } from './entity-form';

export function ContentFormPage() {
  const params = useParams<{
    entityType: string;
    bundle: string;
    id?: string;
  }>();

  const { entityType, bundle, id } = params;

  if (!entityType || !bundle) {
    return (
      <div>
        <div className="bg-red-50 border border-red-200 text-gin-danger rounded-gin-s px-4 py-3 text-sm flex items-start gap-2">
          <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
          Missing entity type or bundle.
        </div>
      </div>
    );
  }

  const bundleLabel = bundle.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-4">
        <Link href="/content" className="text-gin-primary hover:underline font-medium">
          Content
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gin-text-light" />
        <span className="text-gin-text-light">{id ? 'Edit' : 'Create'}</span>
      </div>

      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-gin-title leading-tight">
            {id ? 'Edit' : 'Create'}{' '}
            <span className="text-gin-text-light">{bundleLabel}</span>
          </h1>
          {id && (
            <p className="text-sm text-gin-text-light mt-1">
              Editing entity #{id}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {id && entityType === 'node' && (
            <Link
              href={`/content/revisions/node/${bundle}/${id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gin-text bg-white border border-gin-border rounded-gin-s hover:bg-gin-bg-layer2 transition-colors"
            >
              <Clock className="w-4 h-4 text-gin-text-light" />
              Revisions
            </Link>
          )}
        </div>
      </div>
      <EntityForm
        entityType={entityType}
        bundle={bundle}
        entityId={id ? parseInt(id, 10) : undefined}
      />
    </div>
  );
}
