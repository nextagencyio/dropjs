/**
 * Server-side API fetch utility for Next.js server components.
 * Calls the local API server during SSR.
 */

const API_BASE = `http://localhost:${process.env.PORT || 3000}`;

export async function apiFetch<T = any>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}
