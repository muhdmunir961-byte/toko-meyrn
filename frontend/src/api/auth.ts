import { api } from './client';

/**
 * Auth API — strictly matches the verified backend contracts:
 *
 *  - POST /api/v1/auth/register -> { accessToken }  (User OWNER + Tenant + Store)
 *  - POST /api/v1/auth/login    -> { accessToken }  (profile NOT returned)
 *  - POST /api/v1/auth/google   -> { accessToken }  (Google Identity Services)
 *
 * Registration body (backend zod): email, password (min 12), tenantName (min 2),
 * storeName (min 2), slug (regex /^[a-z0-9-]+$/). Duplicate email -> 409.
 *
 * Google sign-in: the browser obtains an ID token (`credential`) from Google
 * Identity Services and the server verifies it. First sign-in for an unknown
 * email provisions a new OWNER + Tenant + Store (201); a known email is linked
 * and returns 200. 503 means the server has no GOOGLE_CLIENT_ID configured.
 *
 * Confirmed gaps (F0 audit) — NOT implemented here, because no contract exists:
 *  - No GET /auth/me, no refresh token, no logout endpoint, no password reset.
 *  - JWTs are signed without `expiresIn` (do not expire).
 *
 * Session role/tenant are read from the decoded JWT for UI purposes only;
 * authorization always comes from server responses.
 */

export interface AuthResponse {
  accessToken: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  tenantName: string;
  storeName: string;
  slug: string;
}

export function register(input: RegisterInput) {
  return api.post<AuthResponse>('/auth/register', input);
}

export function login(input: { email: string; password: string }) {
  return api.post<AuthResponse>('/auth/login', input);
}

/** Exchange a Google Identity Services ID token for a session. */
export function loginWithGoogle(credential: string) {
  return api.post<AuthResponse>('/auth/google', { credential });
}

/** Decode (NOT verify) the JWT payload for UI hints. */
export interface SessionClaims {
  id: string;
  tenantId: string;
  role: string;
  exp?: number;
  iat?: number;
}

export function decodeClaims(token: string): SessionClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // base64url -> base64 -> utf8
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(payload)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(json) as SessionClaims;
  } catch {
    return null;
  }
}
