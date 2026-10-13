import type { SessionClaims } from '../api/auth';

/**
 * Permission-aware navigation. Mirrors the F0 RBAC matrix (server-side truth):
 *
 *  - Admin (`/admin/*`)   -> SUPER_ADMIN
 *  - Resellers / domains / advanced analytics -> OWNER, STAFF
 *  - Everything else in the seller dashboard -> any authenticated role today
 *    (no role gate in backend; flagged as a defect in the audit).
 */

export interface NavItem {
  key: string;
  label: string;
  to: string;
  /** Roles allowed to see this item; undefined = any authenticated user. */
  roles?: readonly string[];
  /** Show only to authenticated users. */
  auth?: boolean;
  icon?: string;
}

export function canSeeItem(item: NavItem, session: SessionClaims | null): boolean {
  if (item.auth && !session) return false;
  if (item.roles && (!session || !item.roles.includes(session.role))) {
    return false;
  }
  return true;
}

export function filterNav(
  items: readonly NavItem[],
  session: SessionClaims | null,
): NavItem[] {
  return items.filter((item) => canSeeItem(item, session));
}

/**
 * Resolve which nav item corresponds to the current pathname, so the app bar can
 * show the correct page title (previously it always showed the first item).
 *
 * Matching rules:
 *  - an exact match (`/dash`) or a nested-path match (`/dash/orders`) both count;
 *  - when several items match, the LONGEST `to` wins so a child route is never
 *    shadowed by its parent (e.g. `/dash/orders` beats `/dash`).
 */
export function resolveActiveNavItem(
  items: readonly NavItem[],
  pathname: string,
): NavItem | undefined {
  const matches = items.filter(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
  );
  return matches.sort((a, b) => b.to.length - a.to.length)[0];
}

/** Full dashboard navigation with role gating applied. */
export const DASHBOARD_NAV: readonly NavItem[] = [
  { key: 'overview', label: 'Overview', to: '/dash', auth: true, icon: 'grid' },
  { key: 'onboarding', label: 'Onboarding', to: '/onboarding', auth: true, icon: 'spark' },
  { key: 'orders', label: 'Orders', to: '/dash/orders', auth: true, icon: 'cart' },
  { key: 'catalog', label: 'Catalog', to: '/dash/catalog', auth: true, icon: 'box' },
  { key: 'pricing', label: 'Pricing', to: '/dash/pricing', auth: true, icon: 'tag' },
  {
    key: 'resellers',
    label: 'Resellers',
    to: '/dash/resellers',
    auth: true,
    roles: ['OWNER', 'STAFF'],
    icon: 'users',
  },
  { key: 'providers', label: 'Providers', to: '/dash/providers', auth: true, icon: 'plug' },
  { key: 'api-keys', label: 'API Keys', to: '/dash/api-keys', auth: true, icon: 'key' },
  { key: 'webhooks', label: 'Webhooks', to: '/dash/webhooks', auth: true, icon: 'webhook' },
  { key: 'whatsapp', label: 'WhatsApp', to: '/dash/whatsapp', auth: true, icon: 'chat' },
  {
    key: 'domains',
    label: 'Domains',
    to: '/dash/domains',
    auth: true,
    roles: ['OWNER', 'STAFF'],
    icon: 'globe',
  },
  { key: 'branding', label: 'Branding', to: '/dash/branding', auth: true, icon: 'palette' },
  { key: 'settings', label: 'Settings', to: '/dash/settings', auth: true, icon: 'key' },
  { key: 'analytics', label: 'Analytics', to: '/dash/analytics', auth: true, icon: 'chart' },
  { key: 'alerts', label: 'Alerts', to: '/dash/alerts', auth: true, icon: 'pulse' },
  { key: 'customization', label: 'Customization', to: '/dash/customization', auth: true, icon: 'palette' },
  { key: 'ai', label: 'AI Assistant', to: '/dash/ai', auth: true, icon: 'spark' },
  { key: 'ai-analytics', label: 'AI Insights', to: '/dash/ai-analytics', auth: true, icon: 'chart' },
  { key: 'automation', label: 'Automation', to: '/dash/automation', auth: true, icon: 'webhook' },
];

export const ADMIN_NAV: readonly NavItem[] = [
  { key: 'overview', label: 'Overview', to: '/admin', roles: ['SUPER_ADMIN'], auth: true, icon: 'grid' },
  { key: 'fraud', label: 'Fraud Review', to: '/admin/fraud', roles: ['SUPER_ADMIN'], auth: true, icon: 'shield' },
  { key: 'operations', label: 'Operations', to: '/admin/operations', roles: ['SUPER_ADMIN'], auth: true, icon: 'pulse' },
  { key: 'plans', label: 'Plans', to: '/admin/plans', roles: ['SUPER_ADMIN'], auth: true, icon: 'layers' },
];