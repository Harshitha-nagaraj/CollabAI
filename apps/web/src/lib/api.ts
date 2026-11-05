import type { ApiResponse } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

export const API_BASE_URL = BASE_URL;

/**
 * Lightweight typed fetch wrapper.
 * Injects JWT from localStorage automatically.
 */
export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (networkError: any) {
    const isFetchError =
      networkError?.name === 'TypeError' ||
      networkError?.message?.includes('fetch') ||
      networkError?.message?.includes('network');

    if (isFetchError) {
      const helpfulError = new Error(
        `Unable to reach CollabAI API server at ${BASE_URL}. Please ensure the backend server is running on port 4000.`
      ) as Error & { status: number; isNetworkError: boolean; originalError: any };
      helpfulError.status = 0;
      helpfulError.isNetworkError = true;
      helpfulError.originalError = networkError;
      throw helpfulError;
    }
    throw networkError;
  }

  let json: any = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      json = await res.json();
    } catch {
      json = null;
    }
  } else {
    try {
      const text = await res.text();
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  const isEnvelope = json && typeof json === 'object' && 'success' in json;
  const isFailed = !res.ok || (isEnvelope && !json.success);

  if (isFailed) {
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }

    const message =
      json?.error?.message ||
      json?.message ||
      (typeof json?.error === 'string' ? json.error : null) ||
      (res.status ? `Request failed with HTTP ${res.status}` : 'Something went wrong');

    const err = new Error(typeof message === 'string' ? message : 'Something went wrong') as Error & {
      status: number;
      details?: unknown;
      isNetworkError?: boolean;
    };
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
