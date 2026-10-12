import { decodeClaims, type SessionClaims } from '../api/auth';

/**
 * Client-side session store.
 *
 * SECURITY — credential storage policy:
 * The access token is a bearer credential. It is held in memory (authoritative
 * during the SPA lifetime) and mirrored to `sessionStorage` — NOT localStorage —
 * so it is cleared when the tab/browser session ends and is never persisted to
 * disk across sessions. This is the minimum persistence required to survive a
 * page reload given the existing backend architecture:
 *
 *  - JWTs are signed WITHOUT `expiresIn` (they do not expire), and
 *  - there is NO refresh-token endpoint and NO `/auth/me` endpoint.
 *
 * A memory-only store would force re-login on every reload; sessionStorage
 * avoids that while still not persisting the credential beyond the session.
 *
 * Residual risk (documented, not eliminated): both memory and sessionStorage
 * are readable by any script running on the same origin, so a successful XSS
 * still exfiltrates the token. There is no refresh/rotation contract to limit
 * blast radius today — flagging that as a backend follow-up.
 *
 * Logout = discard the token locally (no server-side logout endpoint exists).
 */

const STORAGE_KEY = 'tpt.accessToken';

let memoryToken: string | null = null;

export function getAccessToken(): string | null {
  if (memoryToken) return memoryToken;
  try {
    memoryToken = window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    memoryToken = null;
  }
  return memoryToken;
}

export function setAccessToken(token: string | null): void {
  memoryToken = token;
  try {
    if (token) window.sessionStorage.setItem(STORAGE_KEY, token);
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable — memory-only session */
  }
}

export function getSession(): SessionClaims | null {
  const token = getAccessToken();
  if (!token) return null;
  return decodeClaims(token);
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

export function clearSession(): void {
  setAccessToken(null);
}
