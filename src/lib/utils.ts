import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safe JSON fetch — returns null instead of throwing when the
 * server responds with HTML (e.g. a Next.js error page) or when
 * the response status is not 2xx.
 */
export async function fetchJSON<T = any>(
  url: string,
  init?: RequestInit,
): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) {
      console.warn(`fetchJSON ${res.status} for ${url}`);
      return null;
    }
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      console.warn(`fetchJSON: non-JSON response from ${url} (${ct})`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`fetchJSON error for ${url}:`, err);
    return null;
  }
}

/**
 * Safely parse a fetch Response as JSON.
 * Returns { data, ok, status } — never throws.
 * If the response is not JSON (e.g. HTML error page), data will be null.
 */
export async function safeParseJSON<T = any>(response: Response): Promise<{
  data: T | null;
  ok: boolean;
  status: number;
}> {
  const { ok, status } = response;
  if (!ok) {
    // Try to parse error body as JSON first
    const ct = response.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      try {
        const data = await response.json();
        return { data: data as T, ok: false, status };
      } catch {
        return { data: null, ok: false, status };
      }
    }
    return { data: null, ok: false, status };
  }
  const ct = response.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    console.warn(`safeParseJSON: non-JSON response (${ct})`);
    return { data: null, ok: true, status };
  }
  try {
    const data = await response.json();
    return { data: data as T, ok: true, status };
  } catch (err) {
    console.warn('safeParseJSON: failed to parse body:', err);
    return { data: null, ok: true, status };
  }
}

/**
 * POST wrapper that returns the parsed JSON body, or null on failure.
 */
export async function postJSON<T = any>(
  url: string,
  body?: unknown,
): Promise<T | null> {
  return fetchJSON<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

