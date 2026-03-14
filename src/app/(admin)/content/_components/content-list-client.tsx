'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, FileText, ChevronDown, Trash2 } from 'lucide-react';
import { deleteEntity, updateEntity } from '@/app/(admin)/_actions/entity';

interface EntityTypeDefinition {
  entity_type: string;
  bundle: string;
  label: string;
  description?: string;
  fields: Record<string, unknown>;
}

interface EntityData {
  [key: string]: unknown;
  nid?: number;
  vid?: number;
  uuid?: string;
  type?: string;
  title?: string;
  status?: boolean | number;
  uid?: number;
  created?: string | Date | number;
  changed?: string | Date | number;
  langcode?: string;
}

export interface ContentEntity extends EntityData {
  _entityType: string;
  _bundle: string;
  _label: string;
}

interface ContentListClientProps {
  types: EntityTypeDefinition[];
  entities: ContentEntity[];
  total: number;
  searchParams: {
    type: string;
    status: string;
    search: string;
    offset: number;
  };
}

export default function ContentListClient({ types, entities: initialEntities, total, searchParams: params }: ContentListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [batchAction, setBatchAction] = useState('');
  const [batchRunning, setBatchRunning] = useState(false);
  const [openOps, setOpenOps] = useState<number | null>(null);

  const { type: typeFilter, status: statusFilter, search, offset } = params;
  const limit = 50;
  const entities = initialEntities;
  const nodeTypes = types.filter((t) => t.entity_type === 'node');

  // Close operations dropdown when clicking outside
  useEffect(() => {
    if (openOps === null) return;
    const handler = () => setOpenOps(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openOps]);

  const handleDelete = async (item: ContentEntity) => {
    if (!confirm(`Delete "${item.title}"?`)) return;
    try {
      const result = await deleteEntity(item._entityType, item._bundle, item.nid!);
      if (!result.success) throw new Error(result.error);
      router.refresh();
    } catch {
      alert('Delete failed');
    }
  };

  const toggleSelect = (nid: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(nid)) next.delete(nid);
      else next.add(nid);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === entities.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(entities.map((e) => e.nid!)));
    }
  };

  const executeBatch = async () => {
    if (!batchAction || selected.size === 0) return;
    const actionLabel = batchAction === 'delete' ? 'delete' : batchAction === 'publish' ? 'publish' : 'unpublish';
    if (!confirm(`${actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1)} ${selected.size} item(s)?`)) return;

    setBatchRunning(true);
    const items = entities.filter((e) => selected.has(e.nid!));
    try {
      for (const item of items) {
        if (batchAction === 'delete') {
          await deleteEntity(item._entityType, item._bundle, item.nid!);
        } else {
          await updateEntity(item._entityType, item._bundle, item.nid!, {
            status: batchAction === 'publish',
          });
        }
      }
      router.refresh();
    } catch {
      alert('Batch operation failed');
    }
    setBatchRunning(false);
    setBatchAction('');
    setSelected(new Set());
  };

  const setParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    p.delete('offset');
    router.push(`/content?${p.toString()}`);
  };

  const formatDate = (val: unknown) => {
    if (!val) return '\u2014';
    const d = typeof val === 'number' ? new Date(val * 1000) : new Date(val as string);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[28px] font-normal tracking-tight text-gin-title">
          Content
        </h1>
        <Link
          href="/node/add"
          className="inline-flex items-center gap-1.5 bg-gin-primary text-white rounded-gin-s px-4 py-2 text-sm font-medium hover:bg-gin-primary-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add content
        </Link>
      </div>

      {/* Filters bar */}
      <div className="bg-white border border-gin-border rounded-t-gin px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative">
          <label htmlFor="search" className="sr-only">Title</label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gin-text-light pointer-events-none" />
          <input
            id="search"
            type="text"
            defaultValue={search}
            onChange={(e) => setParam('search', e.target.value)}
            placeholder="Filter by title..."
            style={{ paddingLeft: '2.25rem' }}
            className="border border-gin-border-form rounded-gin-s pr-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-1 focus:ring-gin-primary focus:border-gin-primary transition-colors"
          />
        </div>
        <div>
          <label htmlFor="type-filter" className="sr-only">Content type</label>
          <select
            id="type-filter"
            value={typeFilter}
            onChange={(e) => setParam('type', e.target.value)}
            className="border border-gin-border-form rounded-gin-s px-3 py-1.5 text-sm text-gin-text focus:outline-none focus:ring-1 focus:ring-gin-primary focus:border-gin-primary"
          >
            <option value="">- Any type -</option>
            {nodeTypes.map((t) => (
              <option key={t.bundle} value={t.bundle}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status-filter" className="sr-only">Status</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setParam('status', e.target.value)}
            className="border border-gin-border-form rounded-gin-s px-3 py-1.5 text-sm text-gin-text focus:outline-none focus:ring-1 focus:ring-gin-primary focus:border-gin-primary"
          >
            <option value="">- Any status -</option>
            <option value="1">Published</option>
            <option value="0">Unpublished</option>
          </select>
        </div>

        {/* Batch actions */}
        {selected.size > 0 && (
          <>
            <span className="w-px h-6 bg-gin-border mx-1" />
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gin-primary-light text-gin-primary">
              {selected.size} selected
            </span>
            <select
              value={batchAction}
              onChange={(e) => setBatchAction(e.target.value)}
              className="border border-gin-border-form rounded-gin-s px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gin-primary focus:border-gin-primary"
            >
              <option value="">Action</option>
              <option value="publish">Publish</option>
              <option value="unpublish">Unpublish</option>
              <option value="delete">Delete</option>
            </select>
            <button
              onClick={executeBatch}
              disabled={!batchAction || batchRunning}
              className="bg-gin-primary text-white rounded-gin-s px-4 py-1.5 text-sm font-medium hover:bg-gin-primary-hover disabled:opacity-40 transition-colors"
            >
              {batchRunning ? 'Processing...' : 'Apply'}
            </button>
          </>
        )}
      </div>

      {/* Table */}
      {entities.length === 0 ? (
        <div className="bg-white border border-t-0 border-gin-border rounded-b-gin p-12 text-center">
          <FileText className="w-10 h-10 text-gin-border mx-auto mb-3" />
          <p className="text-gin-text-light mb-2 text-sm">No content available.</p>
          <Link href="/node/add" className="text-gin-primary hover:underline text-sm font-medium">
            Add content
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-white border border-t-0 border-gin-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gin-border-table-header bg-gin-bg-layer2">
                  <th className="w-10 px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selected.size === entities.length && entities.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gin-border-form text-gin-primary"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-[13px] font-semibold text-gin-text-light uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-left text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-36">Content type</th>
                  <th className="px-4 py-3 text-left text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-32">Status</th>
                  <th className="px-4 py-3 text-left text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-32">Updated</th>
                  <th className="px-4 py-3 text-right text-[13px] font-semibold text-gin-text-light uppercase tracking-wider w-28">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gin-border">
                {entities.map((item) => (
                  <tr key={item.nid} className="hover:bg-gin-primary-light transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(item.nid!)}
                        onChange={() => toggleSelect(item.nid!)}
                        className="w-4 h-4 rounded border-gin-border-form text-gin-primary"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/node/${item.nid}/edit`}
                        className="text-gin-primary hover:underline font-medium"
                      >
                        {item.title ?? '(untitled)'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gin-text-light text-[13px]">
                      {(item._label as string) ?? item.type}
                    </td>
                    <td className="px-4 py-3">
                      {item.status ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-gin-green">
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gin-text-light">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gin-text-light text-[13px]">
                      {formatDate(item.changed)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <div className="inline-flex rounded-gin-s border border-gin-border divide-x divide-gin-border overflow-hidden">
                          <Link
                            href={`/node/${item.nid}/edit`}
                            className="px-3 py-1.5 text-[13px] font-medium text-gin-text hover:bg-gin-bg-layer2 transition-colors"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenOps(openOps === item.nid! ? null : item.nid!);
                            }}
                            className="px-1.5 py-1.5 text-gin-text-light hover:bg-gin-bg-layer2 transition-colors"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                        {openOps === item.nid && (
                          <div className="absolute right-0 mt-1 w-36 bg-white rounded-gin-s shadow-lg border border-gin-border py-1 z-10">
                            <button
                              onClick={() => { setOpenOps(null); handleDelete(item); }}
                              className="flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] text-gin-danger hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pager */}
          {total > limit && (
            <div className="bg-white border border-t-0 border-gin-border rounded-b-gin px-4 py-3 flex items-center justify-between">
              <span className="text-[13px] text-gin-text-light">
                {offset + 1}&ndash;{Math.min(offset + limit, total)} of {total} items
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const p = new URLSearchParams(searchParams.toString());
                    p.set('offset', String(Math.max(0, offset - limit)));
                    router.push(`/content?${p.toString()}`);
                  }}
                  disabled={offset === 0}
                  className="px-3 py-1.5 text-sm font-medium border border-gin-border rounded-gin-s hover:bg-gin-bg-layer2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 text-sm text-gin-text-light">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => {
                    const p = new URLSearchParams(searchParams.toString());
                    p.set('offset', String(offset + limit));
                    router.push(`/content?${p.toString()}`);
                  }}
                  disabled={offset + limit >= total}
                  className="px-3 py-1.5 text-sm font-medium border border-gin-border rounded-gin-s hover:bg-gin-bg-layer2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Bottom rounded corner when no pager */}
          {total <= limit && (
            <div className="bg-white border border-t-0 border-gin-border rounded-b-gin h-0" />
          )}
        </>
      )}
    </div>
  );
}
