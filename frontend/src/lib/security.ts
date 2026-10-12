/**
 * AI + secrets safety helpers.
 *
 * The AI model is MOCK only (MockAIProvider) — every AI surface must be clearly
 * labeled as AI-generated and non-authoritative. API keys are returned in
 * plaintext ONCE at creation; after that they are masked and never re-shown.
 */

/** Mask an API key, keeping a short prefix for recognition. e.g. "sk_abc123…". */
export function maskApiKey(raw: string): string {
  if (!raw) return '—';
  const prefix = raw.slice(0, 7);
  return `${prefix}${'•'.repeat(6)}${raw.slice(-4)}`;
}

/** Verify a masked/known key is never a full secret before rendering. */
export function isSecretLike(value: string): boolean {
  return /^sk_[A-Za-z0-9_-]{16,}$/.test(value);
}

/** Standard label for AI-generated content. */
export const AI_LABEL = 'AI-generated · non-authoritative';
