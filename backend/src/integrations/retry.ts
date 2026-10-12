export function exponentialBackoff(attempt: number, baseMs = 1000, maxMs = 3600000) {
  return Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt - 1));
}

export function deliveryStatus(statusCode: number | undefined, attempt: number, maxAttempts = 5) {
  if (statusCode !== undefined && statusCode >= 200 && statusCode < 300) return 'DELIVERED' as const;
  return attempt >= maxAttempts ? 'DEAD_LETTER' as const : 'RETRYING' as const;
}