// Structured white-label branding. All fields sanitized; no arbitrary templates.

export type BrandingInput = {
  storeName?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  supportEmail?: string;
  supportPhone?: string;
  theme?: Record<string, unknown>;
};

const colorRe = /^#[0-9a-fA-F]{6}$/;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function sanitizeBranding(input: BrandingInput): BrandingInput {
  const out: BrandingInput = {};
  if (input.storeName != null) out.storeName = String(input.storeName).replace(/[<>&"']/g, '').slice(0, 200);
  if (input.logoUrl != null) out.logoUrl = sanitizeUrl(input.logoUrl);
  if (input.faviconUrl != null) out.faviconUrl = sanitizeUrl(input.faviconUrl);
  if (input.primaryColor != null && colorRe.test(input.primaryColor)) out.primaryColor = input.primaryColor;
  if (input.secondaryColor != null && colorRe.test(input.secondaryColor)) out.secondaryColor = input.secondaryColor;
  if (input.supportEmail != null && emailRe.test(input.supportEmail)) out.supportEmail = input.supportEmail.toLowerCase();
  if (input.supportPhone != null) out.supportPhone = String(input.supportPhone).replace(/[^\d+ ]/g, '').slice(0, 30);
  if (input.theme != null) out.theme = sanitizeTheme(input.theme);
  return out;
}

function sanitizeUrl(value: string): string | undefined {
  const v = String(value).trim();
  if (!v) return undefined;
  if (!/^https?:\/\//i.test(v)) return undefined;
  return v.replace(/[<>"']/g, '').slice(0, 1000);
}

function sanitizeTheme(theme: Record<string, unknown>): Record<string, unknown> {
  const allowedKeys = ['primaryColor', 'secondaryColor', 'fontFamily', 'radius', 'darkMode'];
  const out: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    const val = theme[key];
    if (val == null) continue;
    if (typeof val === 'string' && val.length <= 200) out[key] = val.replace(/[<>]/g, '');
    else if (typeof val === 'boolean' || (typeof val === 'number' && Number.isFinite(val))) out[key] = val;
  }
  return out;
}

export function publicBranding(branding: BrandingInput & { storeName?: string }): BrandingInput {
  // Public view excludes nothing sensitive (no secrets stored in branding), but
  // re-sanitizes for defense in depth.
  return sanitizeBranding(branding);
}