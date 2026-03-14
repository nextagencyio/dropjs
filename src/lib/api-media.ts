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
