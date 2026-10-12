import {
  createContext,
  useContext,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from 'react';

/**
 * Tenant branding boundary.
 *
 * The backend `GET /api/v1/public/store/:slug/branding` returns sanitized
 * `#RRGGBB` accent colors (primaryColor, secondaryColor) plus a `theme` mode.
 * These MUST ONLY affect the storefront surface — never the dashboard or admin
 * consoles — so we scope overrides to a subtree via a wrapper element + CSS
 * custom properties rather than mutating the global <html> theme.
 */

export interface TenantBranding {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  theme?: 'dark' | 'light' | 'system' | null;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function sanitize(color: string | null | undefined): string | undefined {
  if (color && HEX_RE.test(color)) return color;
  return undefined;
}

function brandingStyles(branding: TenantBranding): CSSProperties {
  const primary = sanitize(branding.primaryColor);
  const secondary = sanitize(branding.secondaryColor);
  const styles: CSSProperties & Record<`--${string}`, string> = {};
  if (primary) {
    styles['--color-primary' as never] = primary;
    styles['--color-primary-hover' as never] = primary;
    styles['--color-brand-500' as never] = primary;
  }
  if (secondary) {
    styles['--color-brand-400' as never] = secondary;
  }
  return styles;
}

const TenantBrandingContext = createContext<TenantBranding>({});

export function TenantTheme({
  branding,
  children,
}: {
  branding: TenantBranding;
  children: ReactNode;
}) {
  const styles = useMemo(() => brandingStyles(branding), [branding]);
  return (
    <TenantBrandingContext.Provider value={branding}>
      <div className="tenant-theme" style={styles}>
        {children}
      </div>
    </TenantBrandingContext.Provider>
  );
}

export function useTenantBranding(): TenantBranding {
  return useContext(TenantBrandingContext);
}