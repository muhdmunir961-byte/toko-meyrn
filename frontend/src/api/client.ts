import { ApiError, networkError, toApiError } from './errors';

/**
 * Thin, typed fetch wrapper. Same-origin relative URLs only — the backend
 * enforces `origin: false` CORS, so the SPA is expected to be served from the
 * same origin as the API (Caddy reverse proxy; Vite dev proxy).
 *
 * This client does NOT invent endpoints. Every path used must exist in the
 * verified F0 endpoint map.
 */

export const API_BASE = '/api/v1';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Required for order creation — backend returns 409 without a reused key. */
  idempotencyKey?: string;
  /** Manual override for bearer token (JWT). */
  token?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export function authHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function request<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    idempotencyKey,
    token,
    signal,
    timeoutMs = 15000,
  } = opts;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...authHeaders(token),
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // Chain an external signal if provided.
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      throw await toApiError(res);
    }

    // 204 No Content and empty bodies resolve to undefined.
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw networkError(err);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/** Convenience helpers. */
export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  del: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
};

export { ApiError };