import { describe, expect, it } from 'vitest';
import { calculatePrice, applyMarkup } from '../src/business/pricing.js';
import { calculateCommission, canTransition, isEligible, ledgerBalance } from '../src/business/commission.js';
import { wouldCreateCycle, depth, assertResellerScope, findPathToRoot } from '../src/business/reseller.js';
import { chooseWeighted, scoreCandidate } from '../src/business/routing-score.js';
import { aggregateAnalytics } from '../src/business/analytics.js';
import { evaluateRisk } from '../src/business/fraud.js';
import { isEntitled, underLimit, nextStateOnExpiry } from '../src/business/subscription.js';
import { isValidDomain, normalizeDomain, isPrivateOrLocalhost, assertTrustedHost } from '../src/business/domain.js';
import { sanitizeBranding } from '../src/business/branding.js';

describe('pricing precedence', () => {
  it('applies reseller override first', () => {
    const r = calculatePrice({ providerCostMinor: 10000, sellerDefault: { type: 'FIXED', value: 1500 }, resellerOverride: { type: 'FIXED', value: 2500 } });
    expect(r.finalPriceMinor).toBe(12500);
    expect(r.appliedRule).toBe('reseller');
  });
  it('falls back through product, promotional, category, default', () => {
    expect(calculatePrice({ providerCostMinor: 10000, productOverride: { type: 'FIXED', value: 2000 } }).appliedRule).toBe('product');
    expect(calculatePrice({ providerCostMinor: 10000, promotional: { type: 'FIXED', value: 100, active: true } }).appliedRule).toBe('promotional');
    expect(calculatePrice({ providerCostMinor: 10000, categoryMarkup: { type: 'FIXED', value: 300 } }).appliedRule).toBe('category');
    expect(calculatePrice({ providerCostMinor: 10000, sellerDefault: { type: 'FIXED', value: 1500 } }).appliedRule).toBe('default');
  });
  it('enforces minimum margin', () => {
    expect(calculatePrice({ providerCostMinor: 10000, minMarginMinor: 5000 }).finalPriceMinor).toBe(15000);
  });
  it('applies percentage as basis points deterministically', () => {
    expect(applyMarkup(10000, { type: 'PERCENTAGE', value: 1000 })).toBe(11000);
  });
});

describe('commission lifecycle', () => {
  it('requires payment AND fulfillment for eligibility', () => {
    expect(isEligible(true, true)).toBe(true);
    expect(isEligible(true, false)).toBe(false);
    expect(isEligible(false, true)).toBe(false);
  });
  it('enforces the state machine', () => {
    expect(canTransition('PENDING', 'ELIGIBLE')).toBe(true);
    expect(canTransition('PENDING', 'SETTLED')).toBe(false);
    expect(canTransition('SETTLED', 'REVERSED')).toBe(true);
    expect(canTransition('REVERSED', 'APPROVED')).toBe(false);
  });
  it('computes fixed and percentage commissions', () => {
    expect(calculateCommission(10000, 1000, 'PERCENTAGE')).toBe(1000);
    expect(calculateCommission(10000, 0, 'FIXED', 500)).toBe(500);
  });
  it('reverses via immutable ledger entries', () => {
    expect(ledgerBalance([{ kind: 'CREDIT', amountMinor: 1000 }, { kind: 'REVERSAL', amountMinor: 1000 }])).toBe(0);
  });
});

describe('reseller hierarchy', () => {
  const byId = new Map([
    ['a', { id: 'a', parentId: null }],
    ['b', { id: 'b', parentId: 'a' }],
    ['c', { id: 'c', parentId: 'b' }],
  ]);
  it('detects cycles', () => {
    expect(wouldCreateCycle({ id: 'a', parentId: null }, 'c', byId)).toBe(true);
    expect(wouldCreateCycle({ id: 'd', parentId: null }, 'a', byId)).toBe(false);
  });
  it('computes depth', () => {
    expect(depth({ id: 'c', parentId: 'b' }, byId)).toBe(2);
    expect(depth({ id: 'a', parentId: null }, byId)).toBe(0);
  });
  it('finds path to root', () => {
    expect(findPathToRoot({ id: 'c', parentId: 'b' }, byId)).toEqual(['b', 'a']);
  });
  it('restricts reseller scopes', () => {
    expect(() => assertResellerScope(['admin:all'])).toThrow();
    expect(() => assertResellerScope(['orders:read'])).not.toThrow();
  });
});

describe('weighted routing', () => {
  it('excludes open-circuit and maintenance providers', () => {
    const out = chooseWeighted([
      { id: 'a', enabled: true, maintenance: false, health: 'CLOSED', availability: 1, reliability: 1, failureRateBps: 0, costMinor: 100, latencyMs: 10 },
      { id: 'b', enabled: true, maintenance: true, health: 'CLOSED', availability: 1, reliability: 1, failureRateBps: 0, costMinor: 10, latencyMs: 5 },
    ]);
    expect(out?.id).toBe('a');
  });
  it('scores deterministically', () => {
    const a = { id: 'a', enabled: true, maintenance: false, health: 'CLOSED' as const, availability: 1, reliability: 1, failureRateBps: 0, costMinor: 100, latencyMs: 10 };
    expect(scoreCandidate(a)).toBe(scoreCandidate(a));
  });
});

describe('analytics financial ownership', () => {
  it('keeps platform subscription revenue separate from seller GMV', () => {
    const out = aggregateAnalytics({
      orders: [{ status: 'SUCCESS', totalMinor: 10000, costMinor: 7000, sellerMarkupMinor: 3000, resellerCommissionMinor: 1000, createdAt: new Date(), customerId: 'c1' }],
      subscriptionRevenueMinor: 5000,
    });
    expect(out.grossSalesMinor).toBe(10000);
    expect(out.platformRevenueMinor).toBe(5000);
    expect(out.sellerRevenueMinor).toBe(2000);
  });
});

describe('fraud rules', () => {
  it('never auto-blocks without a matching rule', () => {
    expect(evaluateRisk([{ category: 'DUPLICATE_ORDER', value: 10 }], [{ category: 'DUPLICATE_ORDER', threshold: 5, action: 'FLAG' }]).action).toBe('FLAG');
  });
  it('escalates to block only via explicit rule', () => {
    expect(evaluateRisk([{ category: 'TRANSACTION_BURST', value: 100 }], [{ category: 'TRANSACTION_BURST', threshold: 50, action: 'BLOCK' }]).action).toBe('BLOCK');
  });
});

describe('subscription enforcement', () => {
  it('gates entitlement and limits', () => {
    const ent = [{ feature: 'resellers', limit: 5 }];
    expect(isEntitled(ent, 'resellers')).toBe(true);
    expect(underLimit(ent, [{ feature: 'resellers', usage: 4 }], 'resellers')).toBe(true);
    expect(underLimit(ent, [{ feature: 'resellers', usage: 5 }], 'resellers')).toBe(false);
  });
  it('transitions through grace periods without deleting data', () => {
    expect(nextStateOnExpiry('ACTIVE', 7, 3)).toBe('PAST_DUE');
    expect(nextStateOnExpiry('ACTIVE', 7, 10)).toBe('GRACE_EXPIRED');
  });
});

describe('domain and branding safety', () => {
  it('validates and normalizes domains', () => {
    expect(isValidDomain('shop.example.com')).toBe(true);
    expect(isValidDomain('not a domain')).toBe(false);
    expect(normalizeDomain('Shop.Example.COM.')).toBe('shop.example.com');
    expect(isPrivateOrLocalhost('localhost')).toBe(true);
  });
  it('rejects host-header spoofing', () => {
    expect(assertTrustedHost('shop.example.com', new Set(['shop.example.com']))).toBe('shop.example.com');
    expect(assertTrustedHost('evil.example.com', new Set(['shop.example.com']))).toBeNull();
  });
  it('sanitizes branding to prevent injection', () => {
    const out = sanitizeBranding({ storeName: '<script>alert(1)</script>', primaryColor: '#FF0000', supportEmail: 'bad', logoUrl: 'javascript:alert(1)' });
    expect(out.storeName).not.toContain('<');
    expect(out.primaryColor).toBe('#FF0000');
    expect(out.logoUrl).toBeUndefined();
  });
});