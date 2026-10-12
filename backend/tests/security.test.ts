// Security regression tests for production-readiness invariants.
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import {
  encryptSecret,
  decryptSecret,
  hashApiKey,
  safeEqual,
} from '../src/integrations/crypto.js';
import { assertSafeWebhookUrl, isPrivateAddress } from '../src/integrations/webhooks.js';
import { envSchema } from '../src/env.js';
import { incCounter, setGauge, renderMetrics } from '../src/business/metrics.js';
import { sanitizeLogs } from '../src/business/observability.js';

describe('credential encryption', () => {
  const original = process.env.CREDENTIAL_ENCRYPTION_KEY_BASE64;
  beforeAll(() => {
    // 32-byte key, base64.
    process.env.CREDENTIAL_ENCRYPTION_KEY_BASE64 = Buffer.alloc(32, 1).toString('base64');
  });
  afterAll(() => {
    if (original === undefined) delete process.env.CREDENTIAL_ENCRYPTION_KEY_BASE64;
    else process.env.CREDENTIAL_ENCRYPTION_KEY_BASE64 = original;
  });

  it('round-trips a secret and never returns the plaintext in metadata', () => {
    const encrypted = encryptSecret('super-secret-provider-key');
    expect(encrypted.ciphertext).not.toContain('super-secret-provider-key');
    expect(decryptSecret(encrypted)).toBe('super-secret-provider-key');
  });

  it('rejects a wrong key length', () => {
    expect(() => encryptSecret('x')).not.toThrow();
    const wrong = process.env.CREDENTIAL_ENCRYPTION_KEY_BASE64;
    process.env.CREDENTIAL_ENCRYPTION_KEY_BASE64 = Buffer.alloc(16, 1).toString('base64');
    expect(() => encryptSecret('x')).toThrow();
    process.env.CREDENTIAL_ENCRYPTION_KEY_BASE64 = wrong!;
  });

  it('hashes API keys with a pepper and uses timing-safe comparison', () => {
    const h1 = hashApiKey('key-value');
    const h2 = hashApiKey('key-value');
    expect(h1).toBe(h2);
    expect(safeEqual(h1, h2)).toBe(true);
    expect(safeEqual(h1, 'different')).toBe(false);
  });
});

describe('webhook URL safety', () => {
  it('rejects private/loopback addresses in production', () => {
    expect(isPrivateAddress('127.0.0.1')).toBe(true);
    expect(isPrivateAddress('10.0.0.1')).toBe(true);
    expect(isPrivateAddress('192.168.1.1')).toBe(true);
    expect(isPrivateAddress('8.8.8.8')).toBe(false);
  });

  it('refuses SSRF-prone URLs in production', async () => {
    await expect(assertSafeWebhookUrl('http://127.0.0.1:3000/hook', true)).rejects.toThrow();
    // Even over HTTPS, a private/loopback destination is rejected post-DNS.
    await expect(assertSafeWebhookUrl('https://127.0.0.1/hook', true)).rejects.toThrow();
    await expect(assertSafeWebhookUrl('https://169.254.169.254/latest/meta-data', true)).rejects.toThrow();
  });
});

describe('environment validation', () => {
  it('requires strong secrets in production', () => {
    const base = {
      DATABASE_URL: 'postgresql://u:p@h:5432/d',
      JWT_SECRET: 'a'.repeat(32),
      API_KEY_PEPPER: 'b'.repeat(32),
      CREDENTIAL_ENCRYPTION_KEY_BASE64: Buffer.alloc(32).toString('base64'),
    };
    expect(() => envSchema.parse({ ...base, NODE_ENV: 'production' })).not.toThrow();
    expect(() => envSchema.parse({ ...base, NODE_ENV: 'production', JWT_SECRET: 'short' })).toThrow();
  });
});

describe('metrics safety', () => {
  it('emits valid Prometheus exposition without secrets', () => {
    incCounter('http_requests_total', { method: 'GET', route: '/x', status: '200' });
    setGauge('http_request_duration_ms', 42, { method: 'GET', route: '/x' });
    const text = renderMetrics();
    expect(text).toContain('# TYPE http_requests_total counter');
    expect(text).toMatch(/http_requests_total\{/);
    // Never embeds the secret key used during encryption.
    expect(text).not.toContain('CREDENTIAL_ENCRYPTION_KEY');
  });
});

describe('log sanitization', () => {
  it('removes sensitive keys from log payloads', () => {
    const clean = sanitizeLogs({ keyHash: 'abc', password: 'pw', secret: 's', ok: 1 }) as Record<string, unknown>;
    expect(clean).toEqual({ ok: 1 });
    expect(clean).not.toHaveProperty('password');
    expect(clean).not.toHaveProperty('keyHash');
  });
});