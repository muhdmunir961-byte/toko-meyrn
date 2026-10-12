import { Link, Outlet, useParams } from 'react-router-dom';
import { TenantTheme } from '../lib/tenantTheme';
import { StorefrontProvider, useStorefront } from '../storefront/StorefrontContext';
import { CheckoutProvider } from '../storefront/CheckoutContext';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { useAuth } from '../auth/AuthContext';

/**
 * Public tenant storefront layout (slug-scoped).
 *
 * The tenant is resolved by URL slug (backend `/storefront/:slug`), NOT host —
 * host/domain white-labeling is a backend gap (see api/storefront.ts). Seller
 * branding is applied via TenantTheme so accent overrides stay scoped here.
 */
export function StorefrontLayout() {
  const { slug = '' } = useParams();
  return (
    <StorefrontProvider slug={slug}>
      <CheckoutProvider>
        <StorefrontShell />
      </CheckoutProvider>
    </StorefrontProvider>
  );
}

function StorefrontShell() {
  const { info, branding, loading, notFound, error, products } = useStorefront();
  const { isAuthenticated, logout } = useAuth();

  const theme = (branding?.theme as { darkMode?: boolean } | null | undefined)?.darkMode === false
    ? 'light'
    : 'dark';

  if (loading) {
    return (
      <div className="sf">
        <div className="sf__container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>Loading store…</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="sf">
        <div className="sf__container sf__result">
          <div className="sf__result-icon sf__result-icon--fail">
            <Icon name="alert" size={28} />
          </div>
          <h1>Store not found</h1>
          <p style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>
            No store matches this address. Check the link and try again.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sf">
        <div className="sf__container sf__result">
          <div className="sf__result-icon sf__result-icon--fail">
            <Icon name="alert" size={28} />
          </div>
          <h1>Something went wrong</h1>
          <p style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <TenantTheme
      branding={{
        primaryColor: branding?.primaryColor,
        secondaryColor: branding?.secondaryColor,
        theme,
      }}
    >
      <div className="sf">
        <header className="sf__header">
          <div className="sf__container sf__header-inner">
            <Link to="/" className="sf__brand">
              <Icon name="spark" size={20} /> {info?.name ?? 'Store'}
            </Link>
            <nav className="sf__nav" aria-label="Store">
              <a href="#catalog">Catalog</a>
              <a href="#lookup">Order lookup</a>
            </nav>
            <div className="sf__search">
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                {products.length} products
              </span>
              {isAuthenticated ? (
                <Button variant="ghost" size="sm" onClick={logout}>Sign out</Button>
              ) : (
                <Button asChildLink to="/login" variant="ghost" size="sm">Sign in</Button>
              )}
            </div>
          </div>
        </header>

        <main>
          <Outlet />
        </main>
      </div>
    </TenantTheme>
  );
}
