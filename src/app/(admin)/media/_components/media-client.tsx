'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, File, Image as ImageIcon, Video, Music, X, Upload, Search } from 'lucide-react';
import {
  uploadFile,
  deleteFile,
} from '@/app/(admin)/_actions/media';
import { loadMediaListAction } from '@/app/(admin)/_actions/system';

export interface FileData {
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

export interface MediaListMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString();
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

function isImage(mimetype: string): boolean {
  return mimetype.startsWith('image/');
}

function getMimeIcon(mimetype: string): string {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype === 'application/pdf') return 'pdf';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.includes('spreadsheet') || mimetype.includes('excel')) return 'spreadsheet';
  if (mimetype.includes('document') || mimetype.includes('word')) return 'document';
  if (mimetype.includes('zip') || mimetype.includes('archive') || mimetype.includes('compressed')) return 'archive';
  return 'file';
}

function FileIcon({ mimetype, className = 'w-12 h-12' }: { mimetype: string; className?: string }) {
  const type = getMimeIcon(mimetype);

  const colors: Record<string, string> = {
    image: 'text-blue-500',
    pdf: 'text-gin-danger',
    video: 'text-purple-500',
    audio: 'text-green-500',
    spreadsheet: 'text-emerald-500',
    document: 'text-amber-500',
    archive: 'text-orange-400',
    file: 'text-gin-text-light',
  };

  const colorClass = colors[type] || 'text-gin-text-light';

  switch (type) {
    case 'image':
      return <ImageIcon className={`${className} ${colorClass}`} />;
    case 'video':
      return <Video className={`${className} ${colorClass}`} />;
    case 'audio':
      return <Music className={`${className} ${colorClass}`} />;
    case 'pdf':
    case 'document':
    case 'spreadsheet':
      return <FileText className={`${className} ${colorClass}`} />;
    default:
      return <File className={`${className} ${colorClass}`} />;
  }
}

function FileDetailModal({ file, onClose, onDelete }: {
  file: FileData;
  onClose: () => void;
  onDelete: (fid: number) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-gin-l shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gin-border">
          <h2 className="text-lg font-semibold text-gin-title truncate pr-4">{file.filename}</h2>
          <button onClick={onClose} className="text-gin-text-light hover:text-gin-text">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Preview */}
          <div className="mb-6">
            {isImage(file.filemime) ? (
              <div className="bg-gin-bg-layer2 rounded-gin-l overflow-hidden flex items-center justify-center max-h-[400px]">
                <img
                  src={file.url}
                  alt={file.filename}
                  className="max-w-full max-h-[400px] object-contain"
                />
              </div>
            ) : (
              <div className="bg-gin-bg-layer2 rounded-gin-l p-12 flex items-center justify-center">
                <FileIcon mimetype={file.filemime} className="w-24 h-24" />
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-gin-text-light uppercase tracking-wide">File Name</label>
                <p className="text-sm text-gin-title mt-1 break-all">{file.filename}</p>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gin-text-light uppercase tracking-wide">MIME Type</label>
                <p className="text-sm text-gin-title mt-1">{file.filemime}</p>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gin-text-light uppercase tracking-wide">File Size</label>
                <p className="text-sm text-gin-title mt-1">{formatFileSize(file.filesize)}</p>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gin-text-light uppercase tracking-wide">File ID</label>
                <p className="text-sm text-gin-title mt-1">{file.fid}</p>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gin-text-light uppercase tracking-wide">Uploaded</label>
                <p className="text-sm text-gin-title mt-1">{formatDateTime(file.created)}</p>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gin-text-light uppercase tracking-wide">Last Modified</label>
                <p className="text-sm text-gin-title mt-1">{formatDateTime(file.changed)}</p>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gin-text-light uppercase tracking-wide">URI</label>
              <p className="text-sm text-gin-title mt-1 font-mono bg-gin-bg-layer2 px-2 py-1 rounded-gin-s break-all">{file.uri}</p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gin-text-light uppercase tracking-wide">Download URL</label>
              <p className="text-sm mt-1">
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-gin-primary hover:underline break-all">
                  {file.url}
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gin-border bg-gin-bg-layer2">
          <button
            onClick={() => onDelete(file.fid)}
            className="text-sm text-gin-danger hover:underline font-medium"
          >
            Delete File
          </button>
          <div className="flex gap-3">
            <a
              href={file.url}
              download={file.filename}
              className="px-4 py-2 text-sm border border-gin-border rounded-gin-s text-gin-text hover:bg-white transition-colors"
            >
              Download
            </a>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-gin-primary text-white rounded-gin-s hover:bg-gin-primary-hover transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pagination({ meta, onPageChange }: {
  meta: MediaListMeta;
  onPageChange: (page: number) => void;
}) {
  if (meta.pages <= 1) return null;

  const pageNums: (number | '...')[] = [];
  const { page, pages: totalPages } = meta;

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNums.push(i);
  } else {
    pageNums.push(1);
    if (page > 3) pageNums.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pageNums.push(i);
    }
    if (page < totalPages - 2) pageNums.push('...');
    pageNums.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between mt-6">
      <p className="text-sm text-gin-text-light">
        Showing {((page - 1) * meta.limit) + 1}--{Math.min(page * meta.limit, meta.total)} of {meta.total} files
      </p>
      <div className="flex gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1 text-sm border border-gin-border rounded-gin-s hover:bg-gin-bg-layer2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        {pageNums.map((p, idx) =>
          p === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-2 py-1 text-sm text-gin-text-light">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-3 py-1 text-sm border rounded-gin-s transition-colors ${
                p === page
                  ? 'bg-gin-primary text-white border-gin-primary'
                  : 'border-gin-border hover:bg-gin-bg-layer2'
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1 text-sm border border-gin-border rounded-gin-s hover:bg-gin-bg-layer2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function MediaLibraryClient({
  initialFiles,
  initialMeta,
}: {
  initialFiles: FileData[];
  initialMeta: MediaListMeta;
}) {
  const router = useRouter();
  const [files, setFiles] = useState<FileData[]>(initialFiles);
  const [meta, setMeta] = useState<MediaListMeta>(initialMeta);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [page, setPage] = useState(initialMeta.page);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      const result = await loadMediaListAction({
        page,
        limit: 24,
        mimetype: filter || undefined,
        search: search || undefined,
      });
      if (!result.success) throw new Error(result.error);
      const data = result.data as { data: FileData[]; meta: MediaListMeta };
      setFiles(data.data);
      setMeta(data.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [filter, search, page]);

  // Reload when filter/search/page changes (skip initial render since we have server data)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    loadFiles();
  }, [loadFiles]);

  const handleSearchInput = (value: string) => {
    setSearchInput(value);
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 300);
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      for (let i = 0; i < fileList.length; i++) {
        const formData = new FormData();
        formData.append('file', fileList[i]);
        const result = await uploadFile(formData);
        if (!result.success) {
          throw new Error(result.error ?? 'Upload failed');
        }
      }
      await loadFiles();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (fid: number) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      const result = await deleteFile(fid);
      if (!result.success) {
        throw new Error(result.error ?? 'Delete failed');
      }
      setFiles((prev) => prev.filter((f) => f.fid !== fid));
      setSelectedFile(null);
      setSelectedFiles((prev) => {
        const next = new Set(prev);
        next.delete(fid);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedFiles.size} file(s)?`)) return;

    setError(null);
    try {
      for (const fid of selectedFiles) {
        const result = await deleteFile(fid);
        if (!result.success) {
          throw new Error(result.error ?? 'Bulk delete failed');
        }
      }
      setSelectedFiles(new Set());
      await loadFiles();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk delete failed');
    }
  };

  const toggleFileSelection = (fid: number) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fid)) {
        next.delete(fid);
      } else {
        next.add(fid);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map((f) => f.fid)));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  const handleFilterChange = (value: string) => {
    setFilter(value);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSelectedFiles(new Set());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-normal tracking-tight text-gin-title">
          Media Library
        </h1>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="bg-gin-primary text-white px-4 py-2 rounded-gin-s text-sm hover:bg-gin-primary-hover disabled:opacity-50 transition-colors"
        >
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleUpload(e.target.files)}
          className="hidden"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-gin-s text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">
            Dismiss
          </button>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mb-6 border-2 border-dashed rounded-gin-l p-8 text-center transition-colors ${
          dragOver
            ? 'border-gin-primary bg-gin-primary-light'
            : 'border-gin-border hover:border-gin-text-light'
        }`}
      >
        <Upload className="w-10 h-10 text-gin-text-light mx-auto mb-2" />
        <p className="text-sm text-gin-text-light">
          Drag and drop files here, or{' '}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-gin-primary hover:underline"
          >
            browse
          </button>
        </p>
        <p className="text-[12px] text-gin-text-light mt-1">Maximum file size: 50MB</p>
      </div>

      {/* Filters and search */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gin-text-light" />
          <input
            type="text"
            placeholder="Search files by name..."
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gin-border-form rounded-gin-s text-sm focus:outline-none focus:ring-2 focus:ring-gin-primary focus:border-transparent"
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gin-text-light hover:text-gin-text"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="border border-gin-border-form rounded-gin-s px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gin-primary"
        >
          <option value="">All files</option>
          <option value="image/">Images</option>
          <option value="application/pdf">PDFs</option>
          <option value="video/">Videos</option>
          <option value="audio/">Audio</option>
        </select>
      </div>

      {/* Bulk actions */}
      {selectedFiles.size > 0 && (
        <div className="flex items-center gap-4 mb-4 px-4 py-3 bg-gin-primary-light border border-gin-border rounded-gin-s">
          <span className="text-sm text-gin-primary font-medium">
            {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={handleBulkDelete}
            className="text-sm text-gin-danger hover:underline font-medium"
          >
            Delete Selected
          </button>
          <button
            onClick={() => setSelectedFiles(new Set())}
            className="text-sm text-gin-text-light hover:text-gin-text ml-auto"
          >
            Clear Selection
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gin-text-light">Loading...</div>
      ) : files.length === 0 ? (
        <div className="text-center py-12 text-gin-text-light">
          {search || filter ? (
            <>
              No files match your search.{' '}
              <button
                onClick={() => { setSearchInput(''); setSearch(''); setFilter(''); setPage(1); }}
                className="text-gin-primary hover:underline"
              >
                Clear filters
              </button>
            </>
          ) : (
            'No files uploaded yet. Upload your first file above.'
          )}
        </div>
      ) : (
        <>
          {/* Select all toggle */}
          <div className="flex items-center gap-2 mb-3">
            <label className="flex items-center gap-2 text-sm text-gin-text-light cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFiles.size === files.length && files.length > 0}
                onChange={toggleSelectAll}
                className="rounded border-gin-border-form text-gin-primary focus:ring-gin-primary"
              />
              Select all
            </label>
          </div>

          {/* File grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {files.map((file) => (
              <div
                key={file.fid}
                className={`bg-white border rounded-gin overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer relative ${
                  selectedFiles.has(file.fid)
                    ? 'border-gin-primary ring-2 ring-gin-primary/20'
                    : 'border-gin-border'
                }`}
              >
                {/* Selection checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.fid)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleFileSelection(file.fid);
                    }}
                    className="rounded border-gin-border-form opacity-0 group-hover:opacity-100 checked:opacity-100 transition-opacity text-gin-primary focus:ring-gin-primary"
                  />
                </div>

                {/* Thumbnail / icon */}
                <div
                  className="aspect-square bg-gin-bg-layer2 flex items-center justify-center overflow-hidden"
                  onClick={() => setSelectedFile(file)}
                >
                  {isImage(file.filemime) && file.thumbnail_url ? (
                    <img
                      src={file.thumbnail_url}
                      alt={file.filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <FileIcon mimetype={file.filemime} />
                  )}
                </div>

                {/* File info */}
                <div className="p-2" onClick={() => setSelectedFile(file)}>
                  <p className="text-[12px] font-medium text-gin-text truncate" title={file.filename}>
                    {file.filename}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-gin-text-light">
                      {formatFileSize(file.filesize)}
                    </span>
                    <span className="text-[11px] text-gin-text-light">
                      {formatDate(file.created)}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-gin-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(file.fid);
                      }}
                      className="text-[11px] text-gin-danger hover:underline ml-auto"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <Pagination meta={meta} onPageChange={handlePageChange} />
        </>
      )}

      {files.length > 0 && (
        <div className="mt-4 text-sm text-gin-text-light">
          {meta.total} file{meta.total !== 1 ? 's' : ''} total
        </div>
      )}

      {/* File detail modal */}
      {selectedFile && (
        <FileDetailModal
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
