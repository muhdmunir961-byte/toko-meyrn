import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { login as apiLogin, register as apiRegister, loginWithGoogle as apiLoginWithGoogle } from '../api/auth';
import type { SessionClaims, RegisterInput } from '../api/auth';
import {
  clearSession,
  getSession,
  setAccessToken,
} from './session';

interface AuthContextValue {
  session: SessionClaims | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionClaims | null>(() =>
    getSession(),
  );

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin({ email, password });
    setAccessToken(res.accessToken);
    setSession(getSession());
  }, []);

  const register = useCallback(
    async (input: RegisterInput) => {
      const res = await apiRegister(input);
      setAccessToken(res.accessToken);
      setSession(getSession());
    },
    [],
  );

  const loginWithGoogle = useCallback(async (credential: string) => {
    const res = await apiLoginWithGoogle(credential);
    setAccessToken(res.accessToken);
    setSession(getSession());
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: session !== null,
      login,
      loginWithGoogle,
      register,
      logout,
    }),
    [session, login, loginWithGoogle, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}