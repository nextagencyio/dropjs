'use client';

import Link from 'next/link';
import { ChevronRight, Clock } from 'lucide-react';
import { EntityForm } from '@/components/entity-form';

export function NodeEditForm({
  id,
  bundle,
  bundleLabel,
}: {
  id: number;
  bundle: string;
  bundleLabel: string;
}) {
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
      <EntityForm entityType="node" bundle={bundle} entityId={id} />
    </div>
  );
}
