'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { EntityForm } from '@/components/entity-form';

export function NodeCreateForm({ bundle, bundleLabel }: { bundle: string; bundleLabel: string }) {
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
