import { describe, expect, it } from 'vitest';
import {
  ADMIN_NAV,
  DASHBOARD_NAV,
  canSeeItem,
  filterNav,
  resolveActiveNavItem,
} from '../permissions';

describe('resolveActiveNavItem', () => {
  it('matches the exact route', () => {
    expect(resolveActiveNavItem(DASHBOARD_NAV, '/dash')?.key).toBe('overview');
    expect(resolveActiveNavItem(DASHBOARD_NAV, '/dash/orders')?.key).toBe('orders');
  });

  it('prefers the longest match so a child route is not shadowed by its parent', () => {
    // `/dash` (Overview) also prefix-matches `/dash/orders`; the child must win.
    expect(resolveActiveNavItem(DASHBOARD_NAV, '/dash/orders')?.to).toBe('/dash/orders');
    expect(resolveActiveNavItem(DASHBOARD_NAV, '/dash/ai-analytics')?.key).toBe('ai-analytics');
  });

  it('matches nested sub-paths beneath a route', () => {
    expect(resolveActiveNavItem(DASHBOARD_NAV, '/dash/orders/abc123')?.key).toBe('orders');
  });

  it('resolves the correct admin title (regression: app bar always showed the first item)', () => {
    expect(resolveActiveNavItem(ADMIN_NAV, '/admin/fraud')?.label).toBe('Fraud Review');
    expect(resolveActiveNavItem(ADMIN_NAV, '/admin/plans')?.label).toBe('Plans');
    expect(resolveActiveNavItem(ADMIN_NAV, '/admin')?.label).toBe('Overview');
  });

  it('returns undefined for an unknown route', () => {
    expect(resolveActiveNavItem(DASHBOARD_NAV, '/nope')).toBeUndefined();
  });

  it('does not match a sibling route with a shared prefix', () => {
    // `/dash/ai` must not match `/dash/ai-analytics`.
    expect(resolveActiveNavItem(DASHBOARD_NAV, '/dash/ai-analytics')?.key).not.toBe('ai');
  });
});

describe('role-aware navigation', () => {
  it('hides role-gated items from disallowed roles', () => {
    const customer = { id: 'u', tenantId: 't', role: 'CUSTOMER' };
    const keys = filterNav(DASHBOARD_NAV, customer).map((i) => i.key);
    expect(keys).not.toContain('resellers');
    expect(keys).not.toContain('domains');
    expect(keys).toContain('orders');
  });

  it('shows role-gated items to OWNER/STAFF', () => {
    const owner = { id: 'u', tenantId: 't', role: 'OWNER' };
    const keys = filterNav(DASHBOARD_NAV, owner).map((i) => i.key);
    expect(keys).toContain('resellers');
    expect(keys).toContain('domains');
  });

  it('hides auth-only items when there is no session', () => {
    expect(canSeeItem(DASHBOARD_NAV[0], null)).toBe(false);
  });
});
