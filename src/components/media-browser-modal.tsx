'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X, Image, FileText, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export interface MediaFile {
  fid: number;
  uuid: string;
  filename: string;
  uri: string;
  filemime: string;
  filesize: number;
  status: number;
  created: number;
  changed: number;
  url: string;
  thumbnail_url: string | null;
}

interface MediaBrowserModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (file: MediaFile) => void;
  accept?: 'image' | 'file' | 'all';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString();
}

export function MediaBrowserModal({ open, onClose, onSelect, accept = 'all' }: MediaBrowserModalProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<MediaFile | null>(null);
  const limit = 24;

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (accept === 'image') params.set('mimetype', 'image/');

      const resp = await fetch(`/api/media?${params.toString()}`, { credentials: 'same-origin' });
      if (resp.ok) {
        const data = await resp.json();
        setFiles(data.data ?? []);
        setTotal(data.meta?.total ?? 0);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, search, accept]);

  useEffect(() => {
    if (open) {
      fetchFiles();
      setSelected(null);
    }
  }, [open, fetchFiles]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  if (!open) return null;

  const totalPages = Math.ceil(total / limit);
  const isImage = (f: MediaFile) => f.filemime?.startsWith('image/');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-gin-l shadow-2xl w-[900px] max-w-[95vw] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gin-border">
          <h2 className="text-lg font-semibold text-gin-title">Media library</h2>
          <button
            onClick={onClose}
            className="p-1 text-gin-text-light hover:text-gin-text rounded-gin-s transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-5 py-3 border-b border-gin-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gin-text-light" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search media by filename..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gin-border-form rounded-gin-s focus:outline-none focus:ring-2 focus:ring-gin-primary/30 focus:border-gin-primary"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-gin-primary animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12 text-gin-text-light text-sm">
              {search ? 'No media matching your search.' : 'No media files found.'}
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {files.map((file) => {
                const isSelected = selected?.fid === file.fid;
                return (
                  <button
                    key={file.fid}
                    type="button"
                    onClick={() => setSelected(file)}
                    className={`group flex flex-col items-center rounded-gin border-2 p-2 transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'border-gin-primary bg-gin-primary-light ring-2 ring-gin-primary/20'
                        : 'border-transparent hover:border-gin-border hover:bg-gin-bg-layer2'
                    }`}
                  >
                    <div className="w-full aspect-square bg-gin-bg-layer2 rounded-gin-s overflow-hidden flex items-center justify-center mb-1.5">
                      {isImage(file) && file.thumbnail_url ? (
                        <img
                          src={file.thumbnail_url}
                          alt={file.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : isImage(file) ? (
                        <img
                          src={file.url}
                          alt={file.filename}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="flex items-center justify-center w-full h-full"><svg class="w-8 h-8 text-gin-text-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>';
                          }}
                        />
                      ) : (
                        <FileText className="w-8 h-8 text-gin-text-light" />
                      )}
                    </div>
                    <span className="text-[11px] text-gin-text-light truncate w-full text-center" title={file.filename}>
                      {file.filename}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gin-border bg-gin-bg-layer">
          {/* Pagination */}
          <div className="flex items-center gap-2 text-sm text-gin-text-light">
            {totalPages > 1 && (
              <>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1 rounded-gin-s hover:bg-gin-bg-layer2 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1 rounded-gin-s hover:bg-gin-bg-layer2 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
            <span className="text-xs">{total} file{total !== 1 ? 's' : ''}</span>
          </div>

          {/* Selected info + insert button */}
          <div className="flex items-center gap-3">
            {selected && (
              <span className="text-xs text-gin-text-light">
                {selected.filename} ({formatSize(selected.filesize)}) — {formatDate(selected.created)}
              </span>
            )}
            <button
              onClick={() => {
                if (selected) {
                  onSelect(selected);
                  onClose();
                }
              }}
              disabled={!selected}
              className="px-4 py-2 bg-gin-primary text-white text-sm font-medium rounded-gin-s hover:bg-gin-primary-hover disabled:opacity-40 transition-colors"
            >
              Insert selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
