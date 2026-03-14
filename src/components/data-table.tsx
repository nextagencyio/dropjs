'use client';

import type { ReactNode } from 'react';
import { Loader2, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  pagination?: {
    offset: number;
    limit: number;
    total: number;
    onPageChange: (offset: number) => void;
  };
}

export function DataTable<T extends object>({
  columns,
  data,
  loading,
  emptyMessage = 'No items found.',
  pagination,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="bg-white rounded-gin border border-gin-border overflow-hidden">
        <div className="p-12 text-center">
          <Loader2 className="w-6 h-6 text-gin-text-light animate-spin mx-auto mb-3" />
          <p className="text-sm text-gin-text-light">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-gin border border-gin-border overflow-x-auto shadow-sm">
        <table className="w-full border-collapse min-w-[500px]">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`bg-gin-bg-layer2 px-4 py-3 text-left font-semibold text-[13px] text-gin-text-light uppercase tracking-wider border-b-2 border-gin-border-table-header ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gin-border-table">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Inbox className="w-8 h-8 text-gin-text-light/40" />
                    <p className="text-sm text-gin-text-light">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, idx) => {
                const rec = item as Record<string, unknown>;
                return (
                  <tr
                    key={(rec.nid as number) ?? (rec.uid as number) ?? idx}
                    className="hover:bg-gin-primary-light/50 transition-colors duration-100"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-sm text-gin-text ${col.className ?? ''}`}
                      >
                        {col.render
                          ? col.render(item)
                          : (rec[col.key] as ReactNode) ?? '\u2014'}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.total > pagination.limit && (
        <div className="flex items-center justify-between mt-4 px-1">
          <span className="text-sm text-gin-text-light">
            Showing{' '}
            <span className="font-medium text-gin-text">
              {pagination.offset + 1}&ndash;{Math.min(pagination.offset + pagination.limit, pagination.total)}
            </span>
            {' '}of{' '}
            <span className="font-medium text-gin-text">{pagination.total}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                pagination.onPageChange(
                  Math.max(0, pagination.offset - pagination.limit),
                )
              }
              disabled={pagination.offset === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-white border border-gin-border rounded-gin-s hover:bg-gin-bg-layer2 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <button
              onClick={() =>
                pagination.onPageChange(pagination.offset + pagination.limit)
              }
              disabled={
                pagination.offset + pagination.limit >= pagination.total
              }
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-white border border-gin-border rounded-gin-s hover:bg-gin-bg-layer2 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
