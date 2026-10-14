/**
 * Google Sign-In verification tests.
 *
 * These cover the security-critical claim checks and the algorithm/key handling
 * without calling Google: a locally generated RSA key stands in for Google's
 * signing key, and `global.fetch` is stubbed to serve the matching JWKS.
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { generateKeyPairSync, createSign } from 'node:crypto';
import {
  verifyGoogleIdToken,
  resetJwksCache,
  GoogleAuthError,
} from '../src/auth/google.js';

const KID = 'test-key-1';
const AUD = 'test-client-id.apps.googleusercontent.com';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...(publicKey.export({ format: 'jwk' }) as Record<string, string>), kid: KID };

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

/** Build a signed ID token with overridable claims/header. */
function makeToken(
  claims: Record<string, unknown> = {},
  header: Record<string, unknown> = {},
): string {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', kid: KID, typ: 'JWT', ...header }));
  const body = b64url(
    JSON.stringify({
      iss: 'https://accounts.google.com',
      aud: AUD,
      sub: 'google-sub-123',
      email: 'user@example.com',
      email_verified: true,
      iat: now,
      exp: now + 3600,
      ...claims,
    }),
  );
  const signer = createSign('RSA-SHA256');
  signer.update(`${head}.${body}`);
  signer.end();
  return `${head}.${body}.${b64url(signer.sign(privateKey))}`;
}

function stubJwks(keys: unknown[] = [jwk]): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify({ keys }), {
        status: 200,
        headers: { 'cache-control': 'public, max-age=3600' },
      }),
    ),
  );
}

beforeEach(() => {
  resetJwksCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetJwksCache();
});

describe('verifyGoogleIdToken', () => {
  it('accepts a validly signed token and returns its claims', async () => {
    stubJwks();
    const claims = await verifyGoogleIdToken(makeToken(), AUD);
    expect(claims.sub).toBe('google-sub-123');
    expect(claims.email).toBe('user@example.com');
    expect(claims.email_verified).toBe(true);
  });

  it('rejects a token whose signature does not match the key', async () => {
    stubJwks();
    const token = makeToken();
    // Tamper with the payload, keeping the original signature.
    const [head, , sig] = token.split('.');
    const forged = b64url(
      JSON.stringify({ iss: 'https://accounts.google.com', aud: AUD, sub: 'attacker', email: 'evil@example.com', email_verified: true, exp: Math.floor(Date.now() / 1000) + 600 }),
    );
    await expect(verifyGoogleIdToken(`${head}.${forged}.${sig}`, AUD)).rejects.toThrow(
      GoogleAuthError,
    );
  });

  it('rejects an audience mismatch', async () => {
    stubJwks();
    await expect(verifyGoogleIdToken(makeToken(), 'someone-else.apps.googleusercontent.com')).rejects.toThrow(
      /audience mismatch/,
    );
  });

  it('rejects an invalid issuer', async () => {
    stubJwks();
    await expect(
      verifyGoogleIdToken(makeToken({ iss: 'https://evil.example.com' }), AUD),
    ).rejects.toThrow(/issuer/);
  });

  it('rejects an expired token', async () => {
    stubJwks();
    const past = Math.floor(Date.now() / 1000) - 7200;
    await expect(verifyGoogleIdToken(makeToken({ iat: past, exp: past + 60 }), AUD)).rejects.toThrow(
      /expired/,
    );
  });

  it('rejects an unverified Google email', async () => {
    stubJwks();
    await expect(verifyGoogleIdToken(makeToken({ email_verified: false }), AUD)).rejects.toThrow(
      /not verified/,
    );
  });

  it('rejects a non-RS256 algorithm (alg confusion)', async () => {
    stubJwks();
    await expect(
      verifyGoogleIdToken(makeToken({}, { alg: 'HS256' }), AUD),
    ).rejects.toThrow(/algorithm/);
  });

  it('rejects an unknown key id even after a forced refresh', async () => {
    stubJwks();
    await expect(verifyGoogleIdToken(makeToken({}, { kid: 'rotated-away' }), AUD)).rejects.toThrow(
      /unknown Google signing key/,
    );
  });

  it('rejects when no audience is configured', async () => {
    await expect(verifyGoogleIdToken(makeToken(), '')).rejects.toThrow(/not configured/);
  });

  it('rejects a malformed token', async () => {
    await expect(verifyGoogleIdToken('not-a-jwt', AUD)).rejects.toThrow(/malformed/);
  });
});
