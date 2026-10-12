/**
 * Normalized API error model.
 *
 * The backend returns two distinct error envelopes (confirmed in the F0 audit):
 *  - REST routes: `{ error: string }` with an HTTP status code.
 *  - External API routes: `{ success, error: { code, message }, request_id }`.
 *
 * Both are collapsed into a single `ApiError` so UI code never branches on
 * envelope shape.
 */

export type ErrorKind =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'validation'
  | 'server'
  | 'unknown';

export class ApiError extends Error {
  readonly kind: ErrorKind;
  readonly status: number | null;
  readonly code: string | null;
  readonly requestId: string | null;
  readonly retryable: boolean;

  constructor(opts: {
    kind: ErrorKind;
    message: string;
    status?: number | null;
    code?: string | null;
    requestId?: string | null;
    retryable?: boolean;
  }) {
    super(opts.message);
    this.name = 'ApiError';
    this.kind = opts.kind;
    this.status = opts.status ?? null;
    this.code = opts.code ?? null;
    this.requestId = opts.requestId ?? null;
    this.retryable = opts.retryable ?? false;
  }
}

interface RestErrorBody {
  error?: string;
}

interface ExternalErrorBody {
  error?: { code?: string; message?: string };
  request_id?: string;
  message?: string;
}

function kindFromStatus(status: number): ErrorKind {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limited';
  if (status === 422 || status === 400) return 'validation';
  if (status >= 500) return 'server';
  return 'unknown';
}

function retryableFor(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export async function toApiError(
  res: Response,
  fallbackMessage = 'Request failed',
): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  let message = fallbackMessage;
  let code: string | null = null;
  let requestId: string | null = null;

  if (body && typeof body === 'object') {
    const rest = body as RestErrorBody;
    const ext = body as ExternalErrorBody;
    if (typeof rest.error === 'string') {
      message = rest.error;
    } else if (ext.error && typeof ext.error === 'object') {
      message = ext.error.message ?? message;
      code = ext.error.code ?? null;
    } else if (typeof ext.message === 'string') {
      message = ext.message;
    }
    requestId = ext.request_id ?? null;
  }

  return new ApiError({
    kind: kindFromStatus(res.status),
    message,
    status: res.status,
    code,
    requestId,
    retryable: retryableFor(res.status),
  });
}

export function networkError(cause: unknown): ApiError {
  const isTimeout =
    cause instanceof DOMException &&
    (cause.name === 'TimeoutError' || cause.name === 'AbortError');
  return new ApiError({
    kind: isTimeout ? 'timeout' : 'network',
    message: isTimeout
      ? 'The request timed out. Please try again.'
      : 'Network error. Check your connection and try again.',
    retryable: true,
  });
}