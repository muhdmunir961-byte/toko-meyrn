// Custom domain ownership validation and host-header safety.

import { randomBytes } from 'node:crypto';

const hostnameRe = /^(?=.{1,253}$)([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

export function isValidDomain(domain: string): boolean {
  const trimmed = domain.trim().toLowerCase();
  if (!hostnameRe.test(trimmed)) return false;
  if (trimmed.includes('..') || trimmed.startsWith('-')) return false;
  return true;
}

export function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/\.+$/, '');
}

// Reject host-header spoofing: the requested Host must exactly match a verified domain.
export function assertTrustedHost(hostHeader: string | undefined, verifiedDomains: Set<string>): string | null {
  if (!hostHeader) return null;
  const host = hostHeader.split(':')[0]?.toLowerCase();
  if (!host) return null;
  return verifiedDomains.has(host) ? host : null;
}

export function isPrivateOrLocalhost(domain: string): boolean {
  const d = domain.toLowerCase();
  return d === 'localhost' || d.endsWith('.localhost') || d.endsWith('.local') || d.endsWith('.internal');
}

export function generateVerificationToken(): { token: string; label: string } {
  const token = randomBytes(24).toString('base64url');
  return { token, label: `_topup-verify=${token}` };
}