import { apiFetch } from './api-client';

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
  medium_url?: string;
  large_url?: string;
}

export interface MediaListMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface MediaListResponse {
  data: FileData[];
  meta: MediaListMeta;
}

export async function fetchMediaList(params?: {
  mimetype?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<MediaListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.mimetype) searchParams.set('mimetype', params.mimetype);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.from) searchParams.set('from', params.from);
  if (params?.to) searchParams.set('to', params.to);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  return apiFetch<MediaListResponse>(`/media${qs ? `?${qs}` : ''}`);
}

export async function fetchMediaImages(): Promise<MediaListResponse> {
  return apiFetch<MediaListResponse>('/media/images');
}

export async function uploadFile(file: File): Promise<{ data: FileData }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/media/upload', {
    method: 'POST',
    body: formData,
    credentials: 'same-origin',
  });

  if (!response.ok) {
    let message = `Upload failed with status ${response.status}`;
    try {
      const body = await response.json();
      message = body.error?.message ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return response.json();
}

export async function deleteFile(fid: number): Promise<void> {
  await apiFetch(`/media/${fid}`, { method: 'DELETE' });
}

export async function fetchFile(fid: number): Promise<{ data: FileData }> {
  return apiFetch<{ data: FileData }>(`/files/${fid}`);
}
