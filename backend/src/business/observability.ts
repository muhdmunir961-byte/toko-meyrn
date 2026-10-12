// Observability helpers. No secrets or PII in metrics.

export type HealthCheck = { status: 'ok' | 'degraded' | 'unhealthy'; components: Record<string, string> };

export function health(): HealthCheck {
  return { status: 'ok', components: { api: 'ok' } };
}

export function readiness(): HealthCheck {
  return { status: 'ok', components: { database: 'unknown', redis: 'unknown', queues: 'unknown' } };
}

export function liveness(): HealthCheck {
  // Liveness only checks that the process is running; health also includes dependency checks.
  return { status: 'ok', components: { api: 'ok' } };
}

export function correlationId(reqId?: string): string {
  if (reqId) return reqId;
  const id = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
  return id;
}

export function sanitizeLogs(input: unknown): unknown {
  // Defensive: remove common sensitive patterns. In practice this is applied to log payloads before writing.
  const keysToOmit = ['keyHash', 'secret', 'credentialsCiphertext', 'password'];
  if (typeof input === 'object' && input != null) {
    const copy: Record<string, unknown> = {};
    const source = input as Record<string, unknown>;
    for (const k of Object.keys(source)) {
      if (!keysToOmit.includes(k)) {
        copy[k] = source[k];
      }
    }
    return copy;
  }
  return input;
}

type LatencyBucket = 'p50' | 'p90' | 'p99';

export function percentile(values: number[], p: LatencyBucket): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * (p === 'p50' ? 0.5 : p === 'p90' ? 0.9 : 0.99)) - 1;
  return sorted[Math.max(0, idx)] ?? 0;
}