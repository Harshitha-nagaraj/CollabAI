import type { ApiResponse } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

/**
 * Lightweight typed fetch wrapper.
 * Injects JWT from localStorage automatically.
 */
export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  if (!token && typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    token = 'demo-token';
    localStorage.setItem('token', token);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const json: any = await res.json();

  const isEnvelope = json && typeof json === 'object' && 'success' in json;
  const isFailed = !res.ok || (isEnvelope && !json.success);

  if (isFailed) {
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }

    const message = json?.error?.message || json?.message || json?.error || 'Something went wrong';
    const err = new Error(typeof message === 'string' ? message : 'Something went wrong') as Error & { status: number; details?: unknown };
    err.status = res.status;
    err.details = json?.error?.details;
    throw err;
  }

  if (isEnvelope && 'data' in json) {
    return json.data as T;
  }

  return json as T;
}

api.get = function <T = unknown>(path: string, options: RequestInit = {}): Promise<{ data: T }> {
  return api<T>(path, { ...options, method: 'GET' }).then((data) => ({ data }));
};

api.post = function <T = unknown>(path: string, body?: unknown, options: RequestInit = {}): Promise<{ data: T }> {
  return api<T>(path, {
    ...options,
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }).then((data) => ({ data }));
};

api.patch = function <T = unknown>(path: string, body?: unknown, options: RequestInit = {}): Promise<{ data: T }> {
  return api<T>(path, {
    ...options,
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }).then((data) => ({ data }));
};

api.put = function <T = unknown>(path: string, body?: unknown, options: RequestInit = {}): Promise<{ data: T }> {
  return api<T>(path, {
    ...options,
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }).then((data) => ({ data }));
};

api.delete = function <T = unknown>(path: string, options: RequestInit = {}): Promise<{ data: T }> {
  return api<T>(path, { ...options, method: 'DELETE' }).then((data) => ({ data }));
};
