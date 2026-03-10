'use client';

import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';

interface NodeType {
  bundle: string;
  label: string;
  description?: string;
}

export function NodeAddList({ types }: { types: NodeType[] }) {
  return (
    <div>
      <h1 className="text-[28px] font-normal tracking-tight mb-1 text-gin-title">Add content</h1>
      <p className="text-sm mb-6 text-gin-text-light">
        Select the type of content you want to create.
      </p>

      {types.length === 0 ? (
        <div className="bg-white border border-gin-border rounded-gin p-12 text-center">
          <FileText className="w-10 h-10 text-gin-border mx-auto mb-3" />
          <p className="text-gin-text-light mb-4 text-sm">No content types have been defined yet.</p>
          <Link
            href="/structure/types/add"
            className="inline-flex items-center gap-1.5 bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add content type
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {types.map((t) => (
            <Link
              key={t.bundle}
              href={`/node/add/${t.bundle}`}
              className="bg-white border border-gin-border rounded-gin p-5 transition-all group hover:border-gin-primary hover:shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-gin-s bg-gin-bg-layer2 group-hover:bg-gin-primary-light flex items-center justify-center shrink-0 transition-colors">
                  <Plus className="w-5 h-5 text-gin-text-light group-hover:text-gin-primary transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[15px] font-semibold text-gin-title group-hover:text-gin-primary transition-colors">
                    {t.label}
                  </h2>
                  {t.description && (
                    <p className="text-[13px] text-gin-text-light mt-1 leading-relaxed line-clamp-2">{t.description}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
