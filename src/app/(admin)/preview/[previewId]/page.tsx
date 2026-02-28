'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CircleAlert, ArrowLeft, Eye } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { fetchEntityTypes } from '@/lib/api-entities';
import type { EntityTypeDefinition } from '@/lib/api-entities';

interface PreviewResponse {
  data: {
    id: string;
    entity_type: string;
    bundle: string;
    data: Record<string, unknown>;
    uid: number;
    created: number;
    expires: number;
  };
}

const BASE_FIELDS = new Set(['nid', 'uuid', 'type', 'uid', 'created', 'changed']);

export default function ContentPreviewPage() {
  const params = useParams<{ previewId: string }>();
  const { previewId } = params;
  const [preview, setPreview] = useState<PreviewResponse['data'] | null>(null);
  const [definition, setDefinition] = useState<EntityTypeDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!previewId) {
        setError('No preview ID provided');
        setLoading(false);
        return;
      }

      try {
        const res = await apiFetch<PreviewResponse>(`/preview/${previewId}`);
        setPreview(res.data);

        const types = await fetchEntityTypes();
        const def = types.find(
          (t) => t.entity_type === res.data.entity_type && t.bundle === res.data.bundle,
        );
        setDefinition(def ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load preview');
      }
      setLoading(false);
    }
    load();
  }, [previewId]);

  if (loading) {
    return (
      <div>
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-amber-100 rounded-gin-s" />
          <div className="bg-white border border-gin-border rounded-gin p-6 space-y-4">
            <div className="h-8 bg-gin-bg-layer2 rounded-gin-s w-64" />
            <div className="h-4 bg-gin-bg-layer2 rounded-gin-s w-32" />
            <div className="h-px bg-gin-border" />
            <div className="h-24 bg-gin-bg-layer2 rounded-gin-s" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="mt-8">
        <div className="bg-red-50 border border-red-200 text-gin-danger rounded-gin-s px-4 py-3 text-sm mb-4 flex items-start gap-2">
          <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
          {error ?? 'Preview not found or has expired.'}
        </div>
        <Link
          href="/content"
          className="inline-flex items-center gap-1.5 text-gin-primary hover:underline text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to content
        </Link>
      </div>
    );
  }

  const expiresDate = new Date(preview.expires * 1000);
  const data = preview.data;
  const title = (data.title as string) ?? '(Untitled)';
  const status = Boolean(data.status);

  return (
    <div>
      {/* Preview banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-gin-s px-4 py-3 mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <Eye className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <span className="text-amber-800 font-semibold text-sm block">Content Preview</span>
            <span className="text-amber-600 text-xs">
              Expires {expiresDate.toLocaleTimeString()}
            </span>
          </div>
        </div>
        <Link
          href={`/node/add/${preview.bundle}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to editor
        </Link>
      </div>

      {/* Preview content */}
      <div className="bg-white rounded-gin border border-gin-border overflow-hidden">
        <div className="p-6 pb-0">
          <h1 className="text-2xl font-bold text-gin-title mb-3">{title}</h1>

          <div className="flex items-center gap-3 mb-5">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                status
                  ? 'bg-emerald-50 text-gin-green'
                  : 'bg-gray-100 text-gin-text-light'
              }`}
            >
              {status ? 'Published' : 'Draft'}
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-gin-s bg-gin-bg-layer2 text-[11px] text-gin-text-light font-mono">
              {preview.entity_type}/{preview.bundle}
            </span>
          </div>
        </div>

        <hr className="border-gin-border" />

        <div className="p-6 space-y-5">
          {definition
            ? Object.entries(definition.fields).map(([fName, fieldDef]) => {
                if (
                  fName === 'title' ||
                  fName === 'status' ||
                  BASE_FIELDS.has(fName)
                )
                  return null;
                const val = data[fName];
                if (val == null) return null;

                return (
                  <div key={fName}>
                    <h3 className="text-[13px] font-semibold text-gin-text-light uppercase tracking-wider mb-2">
                      {fieldDef.label}
                    </h3>
                    <PreviewFieldValue value={val} fieldType={fieldDef.type} />
                  </div>
                );
              })
            : Object.entries(data).map(([key, val]) => {
                if (
                  key === 'title' ||
                  key === 'status' ||
                  BASE_FIELDS.has(key)
                )
                  return null;
                if (val == null) return null;

                return (
                  <div key={key}>
                    <h3 className="text-[13px] font-semibold text-gin-text-light uppercase tracking-wider mb-2">
                      {key}
                    </h3>
                    <PreviewFieldValue value={val} fieldType="string" />
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );
}

function PreviewFieldValue({
  value,
  fieldType,
}: {
  value: unknown;
  fieldType: string;
}) {
  if (value == null) return <span className="text-gin-text-light italic">--</span>;

  if (fieldType === 'text_long') {
    const obj = value as Record<string, unknown>;
    const text = typeof obj === 'object' ? (obj.value as string) : String(value);
    const format = typeof obj === 'object' ? (obj.format as string) : 'plain_text';
    if (format === 'basic_html' || format === 'full_html') {
      return (
        <div
          className="prose prose-sm max-w-none text-gin-text"
          dangerouslySetInnerHTML={{ __html: text ?? '' }}
        />
      );
    }
    return <p className="text-gin-text whitespace-pre-wrap leading-relaxed">{text}</p>;
  }

  if (fieldType === 'boolean') {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${value ? 'bg-emerald-50 text-gin-green' : 'bg-gray-100 text-gin-text-light'}`}>
        {value ? 'Yes' : 'No'}
      </span>
    );
  }

  if (fieldType === 'timestamp') {
    try {
      return (
        <span className="text-gin-text text-sm">
          {new Date(value as string).toLocaleString()}
        </span>
      );
    } catch {
      return <span className="text-gin-text text-sm">{String(value)}</span>;
    }
  }

  if (fieldType === 'json') {
    return (
      <pre className="bg-gin-bg-layer2 p-4 rounded-gin-s text-xs font-mono text-gin-text overflow-x-auto border border-gin-border">
        {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  if (Array.isArray(value)) {
    return (
      <ul className="list-disc list-inside text-gin-text text-sm space-y-1">
        {value.map((v, i) => (
          <li key={i}>{String(v)}</li>
        ))}
      </ul>
    );
  }

  if (typeof value === 'object') {
    return (
      <pre className="bg-gin-bg-layer2 p-4 rounded-gin-s text-xs font-mono text-gin-text overflow-x-auto border border-gin-border">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  return <span className="text-gin-text text-sm">{String(value)}</span>;
}
