import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '../auth/AuthContext';

/**
 * Client-side onboarding progress tracker.
 *
 * The backend has no `/auth/me` and no seller-facing onboarding/subscription
 * status endpoint (the plans endpoint is SUPER_ADMIN-only), so completion is
 * tracked locally in sessionStorage per tenant. This is UI state only — the
 * server remains the source of truth for what a tenant may actually do.
 */

export type OnboardingStepKey =
  | 'account'
  | 'store'
  | 'branding'
  | 'plan'
  | 'config';

/** Wizard steps including the terminal "done" view. */
export type OnboardingView = OnboardingStepKey | 'done';

const STORAGE_PREFIX = 'tpt.onboarding.';

export interface OnboardingState {
  /** Steps marked complete (client-side). */
  completed: OnboardingStepKey[];
  /** The plan slug the user selected during onboarding (mirrors seed names). */
  planName: string | null;
  /** Slugs the user has seen fail availability-style checks (advisory only). */
  hasProvider: boolean;
  hasWhatsApp: boolean;
}

const EMPTY: OnboardingState = {
  completed: [],
  planName: null,
  hasProvider: false,
  hasWhatsApp: false,
};

interface OnboardingContextValue {
  state: OnboardingState;
  markComplete: (step: OnboardingStepKey) => void;
  setPlanName: (name: string | null) => void;
  setHasProvider: (v: boolean) => void;
  setHasWhatsApp: (v: boolean) => void;
  isComplete: (step: OnboardingStepKey) => boolean;
  reset: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

function readStored(tenantId: string | undefined): OnboardingState {
  if (!tenantId) return EMPTY;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + tenantId);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    return {
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      planName: typeof parsed.planName === 'string' ? parsed.planName : null,
      hasProvider: !!parsed.hasProvider,
      hasWhatsApp: !!parsed.hasWhatsApp,
    };
  } catch {
    return EMPTY;
  }
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const tenantId = session?.tenantId;
  const [state, setState] = useState<OnboardingState>(() => readStored(tenantId));

  // Re-load when the tenant changes (e.g. login vs logout).
  useEffect(() => {
    setState(readStored(tenantId));
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    try {
      window.sessionStorage.setItem(STORAGE_PREFIX + tenantId, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [tenantId, state]);

  const markComplete = useCallback((step: OnboardingStepKey) => {
    setState((prev) =>
      prev.completed.includes(step)
        ? prev
        : { ...prev, completed: [...prev.completed, step] },
    );
  }, []);

  const setPlanName = useCallback((name: string | null) => {
    setState((prev) => ({ ...prev, planName: name }));
  }, []);

  const setHasProvider = useCallback((v: boolean) => {
    setState((prev) => ({ ...prev, hasProvider: v }));
  }, []);

  const setHasWhatsApp = useCallback((v: boolean) => {
    setState((prev) => ({ ...prev, hasWhatsApp: v }));
  }, []);

  const isComplete = useCallback(
    (step: OnboardingStepKey) => state.completed.includes(step),
    [state.completed],
  );

  const reset = useCallback(() => setState(EMPTY), []);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      state,
      markComplete,
      setPlanName,
      setHasProvider,
      setHasWhatsApp,
      isComplete,
      reset,
    }),
    [state, markComplete, setPlanName, setHasProvider, setHasWhatsApp, isComplete, reset],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within an OnboardingProvider');
  return ctx;
}
