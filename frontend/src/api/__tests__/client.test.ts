import { afterEach, describe, expect, it, vi } from 'vitest';
import { authHeaders, request } from '../client';
import { clearSession, setAccessToken } from '../../auth/session';

describe('authHeaders', () => {
  it('attaches a bearer token when present', () => {
    expect(authHeaders('jwt-123')).toEqual({ Authorization: 'Bearer jwt-123' });
  });

  it('omits the header when no token is available', () => {
    expect(authHeaders(undefined)).toEqual({});
    expect(authHeaders()).toEqual({});
  });
});

describe('request authentication wiring', () => {
  afterEach(() => {
    clearSession();
    vi.restoreAllMocks();
  });

  it('attaches the session bearer token automatically (regression: seller calls 401ed)', async () => {
    setAccessToken('session-token-abc');
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await request('/seller/orders');

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer session-token-abc');
  });

  it('lets an explicit token override the session token', async () => {
    setAccessToken('session-token-abc');
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await request('/seller/orders', { token: 'scoped-key-xyz' });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer scoped-key-xyz');
  });

  it('sends no Authorization header when there is no session', async () => {
    clearSession();
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await request('/storefront/demo');

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });
});
