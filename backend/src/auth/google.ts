/**
 * Google Identity Services (GIS) ID-token verification.
 *
 * Verifies the RS256 signature of a Google-issued ID token against Google's
 * published JWKS, then validates the standard claims (iss/aud/exp).
 *
 * Design notes:
 *  - Uses ONLY Node built-ins (`node:crypto` + global `fetch`). No new runtime
 *    dependency is introduced for a single integration.
 *  - The ID-token flow requires no client secret: the browser obtains the token
 *    and this server only *verifies* it. That keeps the secret surface minimal.
 *  - JWKS responses are cached for their advertised `max-age` so a sign-in does
 *    not cost a network round-trip to Google on every request.
 *  - On an unknown `kid` the cache is force-refreshed once (key rotation).
 */

import { createPublicKey, createVerify } from 'node:crypto';

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const VALID_ISSUERS = new Set([
  'accounts.google.com',
  'https://accounts.google.com',
]);
/** Tolerate small clock differences between this host and Google. */
const CLOCK_SKEW_SECONDS = 60;
const JWKS_TIMEOUT_MS = 5000;

export class GoogleAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleAuthError';
  }
}

export interface GoogleClaims {
  sub: string;
  email: string;
  email_verified: boolean;
  aud: string;
  iss: string;
  exp: number;
  iat?: number;
  name?: string;
  picture?: string;
}

interface Jwk {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg?: string;
  use?: string;
}

interface Jwks {
  keys: Jwk[];
}

let cachedKeys: { byKid: Map<string, Jwk>; expiresAt: number } | null = null;

function base64UrlToBuffer(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function decodeSegment<T>(segment: string): T {
  return JSON.parse(base64UrlToBuffer(segment).toString('utf8')) as T;
}

function cacheMaxAgeSeconds(res: Response): number {
  const header = res.headers.get('cache-control') ?? '';
  const match = /max-age=(\d+)/.exec(header);
  const parsed = match ? Number(match[1]) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3600;
}


async function loadKeys(forceRefresh = false): Promise<Map<string, Jwk>> {
  const now = Date.now();
  if (!forceRefresh && cachedKeys && cachedKeys.expiresAt > now) {
    return cachedKeys.byKid;
  }
  let res: Response;
  try {
    res = await fetch(GOOGLE_JWKS_URL, {
      signal: AbortSignal.timeout(JWKS_TIMEOUT_MS),
    });
  } catch {
    throw new GoogleAuthError('unable to reach Google signing keys');
  }
  if (!res.ok) throw new GoogleAuthError('unable to fetch Google signing keys');

  const body = (await res.json()) as Jwks;
  if (!Array.isArray(body?.keys) || body.keys.length === 0) {
    throw new GoogleAuthError('malformed Google JWKS response');
  }
  const byKid = new Map(body.keys.map((k) => [k.kid, k]));
  cachedKeys = { byKid, expiresAt: now + cacheMaxAgeSeconds(res) * 1000 };
  return byKid;
}

/** Test seam — drops the cached JWKS so a test can control key rotation. */
export function resetJwksCache(): void {
  cachedKeys = null;
}

function verifySignature(token: string, key: Jwk): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [header, payload, signature] = parts;
  if (!header || !payload || !signature) return false;

  const publicKey = createPublicKey({
    key: { kty: key.kty, n: key.n, e: key.e },
    format: 'jwk',
  });
  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${header}.${payload}`);
  verifier.end();
  return verifier.verify(publicKey, base64UrlToBuffer(signature));
}

/**
 * Verify a Google ID token and return its claims.
 *
 * @param token       The raw ID token (`credential`) from Google Identity Services.
 * @param expectedAud The OAuth client ID this token must be issued for.
 * @throws GoogleAuthError when the token is malformed, has a bad signature,
 *         is expired, or fails issuer/audience checks.
 */
export async function verifyGoogleIdToken(
  token: string,
  expectedAud: string,
): Promise<GoogleClaims> {
  if (!token || typeof token !== 'string') {
    throw new GoogleAuthError('missing Google credential');
  }
  if (!expectedAud) {
    throw new GoogleAuthError('Google sign-in is not configured');
  }

  const parts = token.split('.');
  if (parts.length !== 3) throw new GoogleAuthError('malformed Google token');

  const header = decodeSegment<{ alg?: string; kid?: string }>(parts[0]);
  if (header.alg !== 'RS256') {
    // Reject `none`/HMAC algs outright — never let the token pick its own algorithm.
    throw new GoogleAuthError('unsupported Google token algorithm');
  }
  if (!header.kid) throw new GoogleAuthError('Google token missing key id');

  let keys = await loadKeys();
  let key = keys.get(header.kid);
  if (!key) {
    // Unknown kid: Google may have rotated. Refresh once, then give up.
    keys = await loadKeys(true);
    key = keys.get(header.kid);
  }
  if (!key) throw new GoogleAuthError('unknown Google signing key');

  if (!verifySignature(token, key)) {
    throw new GoogleAuthError('invalid Google token signature');
  }

  const claims = decodeSegment<Partial<GoogleClaims>>(parts[1]);

  if (!claims.iss || !VALID_ISSUERS.has(claims.iss)) {
    throw new GoogleAuthError('invalid Google token issuer');
  }
  if (claims.aud !== expectedAud) {
    throw new GoogleAuthError('Google token audience mismatch');
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== 'number' || claims.exp + CLOCK_SKEW_SECONDS < nowSeconds) {
    throw new GoogleAuthError('Google token expired');
  }
  if (typeof claims.iat === 'number' && claims.iat - CLOCK_SKEW_SECONDS > nowSeconds) {
    throw new GoogleAuthError('Google token issued in the future');
  }
  if (!claims.sub) throw new GoogleAuthError('Google token missing subject');
  if (!claims.email) throw new GoogleAuthError('Google token missing email');
  if (claims.email_verified !== true) {
    // An unverified Google email must never be trusted to claim an account.
    throw new GoogleAuthError('Google email is not verified');
  }

  return claims as GoogleClaims;
}
