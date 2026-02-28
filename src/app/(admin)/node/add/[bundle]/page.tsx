'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { EntityForm } from '@/components/entity-form';

export default function NodeAddBundlePage() {
  const params = useParams<{ bundle: string }>();
  const { bundle } = params;

  if (!bundle) {
    return (
      <div>
        <div className="bg-red-50 border border-red-200 text-gin-danger rounded-gin-s px-4 py-3 text-sm">
          Missing content type.
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
        <span className="text-gin-text-light">Create</span>
      </div>

      <div className="mb-2">
        <h1 className="text-[28px] font-normal tracking-tight text-gin-title leading-tight">
          Create <span className="text-gin-text-light">{bundleLabel}</span>
        </h1>
      </div>
      <EntityForm entityType="node" bundle={bundle} />
    </div>
  );
}
