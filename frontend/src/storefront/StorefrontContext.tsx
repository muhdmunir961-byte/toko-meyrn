import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getPublicBranding,
  getStorefront,
  getStorefrontProducts,
  type PublicBranding,
  type SellerProduct,
  type StorefrontInfo,
} from '../api/storefront';
import { ApiError } from '../api/errors';

/**
 * Public storefront data scope, keyed by tenant slug.
 *
 * Tenant resolution is SLUG-based (backend `/storefront/:slug`). Host/domain
 * resolution is a backend gap — see storefront.ts. This provider loads the
 * store info, its catalog, and its sanitized branding once per slug and exposes
 * them to all storefront pages under `/:slug`.
 */

interface StorefrontContextValue {
  slug: string;
  info: StorefrontInfo | null;
  products: SellerProduct[];
  branding: PublicBranding | null;
  loading: boolean;
  notFound: boolean;
  error: string | null;
  reload: () => void;
}

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

export function StorefrontProvider({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const [info, setInfo] = useState<StorefrontInfo | null>(null);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [branding, setBranding] = useState<PublicBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    setError(null);
    try {
      const store = await getStorefront(slug);
      setInfo(store);

      const [catalog, brand] = await Promise.all([
        getStorefrontProducts(slug),
        getPublicBranding(slug).catch((err: unknown) => {
          // 404 means branding is not configured yet — fall back to defaults.
          if (err instanceof ApiError && err.status === 404) return null;
          throw err;
        }),
      ]);

      // Only ACTIVE products are returned by the endpoint; sort by master SKU
      // for stable display. Prices shown are the server-provided fields.
      setProducts(catalog.filter((p) => p.active));
      setBranding(brand);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        setError(err instanceof ApiError ? err.message : 'Unable to load store.');
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<StorefrontContextValue>(
    () => ({
      slug,
      info,
      products,
      branding,
      loading,
      notFound,
      error,
      reload: load,
    }),
    [slug, info, products, branding, loading, notFound, error, load],
  );

  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefront(): StorefrontContextValue {
  const ctx = useContext(StorefrontContext);
  if (!ctx) throw new Error('useStorefront must be used within a StorefrontProvider');
  return ctx;
}
