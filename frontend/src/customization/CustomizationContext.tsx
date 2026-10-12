import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * Storefront customization state.
 *
 * PERSISTED (verified backend): branding (logo/favicon/colors/theme/support)
 * via `PATCH /seller/branding`, and custom domains via `/seller/domains`.
 *
 * PREVIEW-ONLY (NO backend contract — banner, promo, section ordering,
 * featured products, nav/footer, SEO/social): these are held in local state so
 * the UI can demonstrate them, but they are NEVER sent to the backend and are
 * clearly labeled "preview only / not persisted". This is deliberate: the
 * backend has no endpoints or fields for them, so claiming persistence would
 * be fabricated.
 */

export interface BrandingDraft {
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  supportEmail: string;
  supportPhone: string;
  darkMode: boolean;
}

export interface PreviewDraft {
  bannerHeading: string;
  bannerSubtext: string;
  showBanner: boolean;
  featuredProductIds: string[];
  showFeatured: boolean;
}

interface CustomizationContextValue {
  branding: BrandingDraft;
  preview: PreviewDraft;
  setBranding: (patch: Partial<BrandingDraft>) => void;
  setPreview: (patch: Partial<PreviewDraft>) => void;
  /** True when the current draft differs from the last-saved (persisted) state. */
  isDirty: boolean;
  /** Mark the current draft as saved (used after a successful PATCH). */
  markSaved: () => void;
  /** Reset the draft to the last-saved state (discard changes). */
  reset: () => void;
}

const DEFAULT_BRANDING: BrandingDraft = {
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#8057f5',
  secondaryColor: '#9877ff',
  supportEmail: '',
  supportPhone: '',
  darkMode: true,
};

const DEFAULT_PREVIEW: PreviewDraft = {
  bannerHeading: '',
  bannerSubtext: '',
  showBanner: false,
  featuredProductIds: [],
  showFeatured: false,
};

const CustomizationContext = createContext<CustomizationContextValue | null>(null);

export function CustomizationProvider({ children }: { children: ReactNode }) {
  const [branding, setBrandingState] = useState<BrandingDraft>(DEFAULT_BRANDING);
  const [preview, setPreviewState] = useState<PreviewDraft>(DEFAULT_PREVIEW);

  // Snapshot of the last-saved state (in STATE so `isDirty` recomputes).
  const [savedSnapshot, setSavedSnapshot] = useState({
    branding: DEFAULT_BRANDING,
    preview: DEFAULT_PREVIEW,
  });

  // Refs always hold the latest values so `markSaved` can stay stable.
  const latestRef = useRef({ branding, preview });
  latestRef.current = { branding, preview };

  const setBranding = useCallback((patch: Partial<BrandingDraft>) => {
    setBrandingState((prev) => ({ ...prev, ...patch }));
  }, []);

  const setPreview = useCallback((patch: Partial<PreviewDraft>) => {
    setPreviewState((prev) => ({ ...prev, ...patch }));
  }, []);

  const isDirty = useMemo(() => {
    return (
      JSON.stringify(savedSnapshot.branding) !== JSON.stringify(branding) ||
      JSON.stringify(savedSnapshot.preview) !== JSON.stringify(preview)
    );
  }, [branding, preview, savedSnapshot]);

  const markSaved = useCallback(() => {
    setSavedSnapshot(latestRef.current);
  }, []);

  const reset = useCallback(() => {
    setBrandingState(savedSnapshot.branding);
    setPreviewState(savedSnapshot.preview);
  }, [savedSnapshot]);

  // Prime the saved snapshot once real data loads (handled by the page via
  // setBranding then markSaved).
  const value = useMemo<CustomizationContextValue>(
    () => ({ branding, preview, setBranding, setPreview, isDirty, markSaved, reset }),
    [branding, preview, setBranding, setPreview, isDirty, markSaved, reset],
  );

  return <CustomizationContext.Provider value={value}>{children}</CustomizationContext.Provider>;
}

export function useCustomization(): CustomizationContextValue {
  const ctx = useContext(CustomizationContext);
  if (!ctx) throw new Error('useCustomization must be used within a CustomizationProvider');
  return ctx;
}

/* --------------------------- Route-block guard --------------------------- */

/**
 * Returns a beforeunload handler that warns about unsaved changes.
 * Usage: attach in a useEffect and pass `isDirty`.
 */
export function useUnsavedChangesWarning(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);
}
