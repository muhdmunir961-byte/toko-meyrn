import { describe, expect, it } from 'vitest';
import { formatIDR, formatPercent, minorToMajor } from '../money';
import { maskApiKey, isSecretLike } from '../security';
import {
  validateColor,
  validateEmail,
  validateHttpUrl,
  validateSlug,
  validateSupportPhone,
} from '../validation';
import { humanizeStatus, orderStatusTone, paymentStatusTone } from '../status';
import { formatPlanPrice, PLANS } from '../plans';

describe('money', () => {
  it('converts minor units to major via integer truncation (no float drift)', () => {
    expect(minorToMajor(10000)).toBe(100);
    expect(minorToMajor(10001)).toBe(100); // truncates, never rounds up
    expect(minorToMajor(2500000)).toBe(25000);
  });

  it('formats IDR correctly', () => {
    expect(formatIDR(12000)).toMatch(/Rp\s*120/);
    expect(formatIDR(0)).toMatch(/Rp\s*0/);
  });

  it('formats a ratio as a percentage', () => {
    expect(formatPercent(0.25)).toBe('25%');
    expect(formatPercent(0)).toBe('0%');
  });
});

describe('security', () => {
  it('masks an API key, keeping prefix + suffix only', () => {
    const masked = maskApiKey('sk_abcdefghijklmnopqrstuvwxyz123456');
    expect(masked).toContain('sk_abc');
    expect(masked).not.toContain('abcdefghijklmnopqrstuvwxyz123456');
    expect(masked.length).toBeLessThan(30);
  });

  it('detects secret-like tokens', () => {
    expect(isSecretLike('sk_abcdefghijklmnopqrstuvwxyz123456')).toBe(true);
    expect(isSecretLike('not a secret')).toBe(false);
  });
});

describe('validation', () => {
  it('validates slugs per backend regex /^[a-z0-9-]+$/', () => {
    expect(validateSlug('nova-topup')).toBeUndefined();
    expect(validateSlug('Nova')).toMatch(/lowercase/);
    expect(validateSlug('has space')).toMatch(/lowercase/);
    expect(validateSlug('a')).toMatch(/at least 2/);
  });

  it('validates colors as #RRGGBB', () => {
    expect(validateColor('#8057f5')).toBeUndefined();
    expect(validateColor('red')).toMatch(/hex/);
    expect(validateColor('#12345')).toMatch(/hex/);
  });

  it('validates http(s) URLs', () => {
    expect(validateHttpUrl('https://cdn.example.com/logo.png', 'Logo')).toBeUndefined();
    expect(validateHttpUrl('javascript:alert(1)', 'Logo')).toMatch(/http/);
    expect(validateHttpUrl('', 'Logo')).toBeUndefined(); // empty allowed
  });

  it('validates email and phone', () => {
    expect(validateEmail('a@b.com')).toBeUndefined();
    expect(validateEmail('nope')).toMatch(/valid email/);
    expect(validateSupportPhone('+62 812 3456')).toBeUndefined();
    expect(validateSupportPhone('abc')).toMatch(/digits/);
  });
});

describe('status mapping', () => {
  it('maps order statuses to badge tones', () => {
    expect(orderStatusTone('SUCCESS')).toBe('success');
    expect(orderStatusTone('FAILED')).toBe('danger');
    expect(orderStatusTone('AWAITING_PAYMENT')).toBe('warning');
    expect(orderStatusTone('UNKNOWN_FUTURE_STATE')).toBe('neutral'); // defensive
  });

  it('maps payment statuses', () => {
    expect(paymentStatusTone('CONFIRMED')).toBe('success');
    expect(paymentStatusTone('PENDING')).toBe('warning');
    expect(paymentStatusTone(undefined)).toBe('neutral');
  });

  it('humanizes SCREAMING_SNAKE enums', () => {
    expect(humanizeStatus('AWAITING_PAYMENT')).toBe('Awaiting Payment');
  });
});

describe('plans', () => {
  it('mirrors the verified backend seed prices (minor units)', () => {
    const byName = Object.fromEntries(PLANS.map((p) => [p.name, p.monthlyPriceMinor]));
    expect(byName).toEqual({ Free: 0, Starter: 1000000, Pro: 2500000, Business: 5000000 });
  });

  it('formats Free as "Free" and paid as IDR', () => {
    expect(formatPlanPrice(0)).toBe('Free');
    expect(formatPlanPrice(1000000)).toMatch(/Rp/);
  });
});
