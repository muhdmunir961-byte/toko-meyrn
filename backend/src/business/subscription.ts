// Subscription entitlement enforcement. Feature allocations are plan-managed,
// not hardcoded. Expiration never deletes seller data.

export type Entitlement = { feature: string; limit: number | null };
export type Usage = { feature: string; usage: number };

export function isEntitled(entitlements: Entitlement[], feature: string): boolean {
  return entitlements.some(e => e.feature === feature);
}

export function underLimit(entitlements: Entitlement[], usage: Usage[], feature: string, requested = 1): boolean {
  const ent = entitlements.find(e => e.feature === feature);
  if (!ent) return false;
  if (ent.limit == null) return true; // unlimited
  const used = usage.find(u => u.feature === feature)?.usage ?? 0;
  return used + requested <= ent.limit;
}

export type SubscriptionState = 'ACTIVE' | 'PAST_DUE' | 'GRACE_EXPIRED' | 'SUSPENDED' | 'CANCELLED';

export function nextStateOnExpiry(current: SubscriptionState, graceDays: number, daysPastDue: number): SubscriptionState {
  if (current === 'CANCELLED' || current === 'SUSPENDED') return current;
  if (daysPastDue <= graceDays) return 'PAST_DUE';
  return 'GRACE_EXPIRED';
}

export function featureGrantsWriteAccess(state: SubscriptionState): boolean {
  return state === 'ACTIVE' || state === 'PAST_DUE';
}