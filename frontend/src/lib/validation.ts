/**
 * Client-side form validation helpers shared across auth/onboarding forms.
 *
 * These mirror the backend zod schemas where a contract exists, and add
 * client-side niceties (password strength, URL/color/email shape) that the
 * backend also sanitizes. The server remains authoritative — these only
 * improve the error UX before a request is sent.
 */

export interface FieldErrors {
  [field: string]: string | undefined;
}

export const SLUG_RE = /^[a-z0-9-]+$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

/** Backend: slug must match /^[a-z0-9-]+$/ (register schema). */
export function validateSlug(slug: string): string | undefined {
  const v = slug.trim();
  if (!v) return 'Store slug is required.';
  if (v.length < 2) return 'Slug must be at least 2 characters.';
  if (!SLUG_RE.test(v)) return 'Only lowercase letters, numbers, and hyphens.';
  if (v.startsWith('-') || v.endsWith('-')) return 'Cannot start or end with a hyphen.';
  return undefined;
}

/** Backend: password min 12 (register schema). */
export function validatePassword(password: string): string | undefined {
  if (!password) return 'Password is required.';
  if (password.length < 12) return 'Password must be at least 12 characters.';
  return undefined;
}

export function validateEmail(email: string): string | undefined {
  const v = email.trim();
  if (!v) return 'Email is required.';
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address.';
  return undefined;
}

/** Backend: tenantName/storeName min 2. */
export function validateRequiredName(value: string, label: string): string | undefined {
  const v = value.trim();
  if (!v) return `${label} is required.`;
  if (v.length < 2) return `${label} must be at least 2 characters.`;
  return undefined;
}

/** Backend sanitizes colors to #RRGGBB; validate before submit for nicer UX. */
export function validateColor(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (!HEX_COLOR_RE.test(value.trim())) return 'Use a hex color like #8057F5.';
  return undefined;
}

/** Backend sanitizes supportEmail; validate shape for nicer UX. */
export function validateSupportEmail(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (!EMAIL_RE.test(value.trim())) return 'Enter a valid support email.';
  return undefined;
}

/** Backend sanitizes logoUrl/faviconUrl to http(s) URLs (≤1000 chars). */
export function validateHttpUrl(value: string | undefined, label: string): string | undefined {
  if (!value || !value.trim()) return undefined;
  const v = value.trim();
  if (!/^https?:\/\//i.test(v)) return `${label} must start with http:// or https://.`;
  if (v.length > 1000) return `${label} is too long.`;
  return undefined;
}

/** Backend sanitizes supportPhone to digits, +, and spaces (≤30 chars). */
export function validateSupportPhone(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (!/^[\d+ ]+$/.test(value.trim())) return 'Use digits, +, and spaces only.';
  if (value.trim().length > 30) return 'Phone number is too long.';
  return undefined;
}
