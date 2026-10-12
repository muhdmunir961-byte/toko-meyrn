import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/errors';
import {
  getBranding,
  saveBranding,
  listDomains,
  createDomain,
  verifyDomain,
  removeDomain,
  listProducts,
  type Branding,
  type StoreDomain,
  type SellerProductWithMaster,
} from '../api/seller';
import {
  CustomizationProvider,
  useCustomization,
  useUnsavedChangesWarning,
} from '../customization/CustomizationContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { SkeletonLine } from '../components/ui/Skeleton';
import { DialogConfirm } from '../components/ui/Dialog';
import { useToast } from '../components/ui/Toast';
import { formatIDR } from '../lib/money';
import {
  validateColor,
  validateHttpUrl,
  validateSupportEmail,
  validateSupportPhone,
} from '../lib/validation';

/**
 * Storefront customization (Phase F6).
 * PERSISTED: branding (PATCH /seller/branding) + custom domains (/seller/domains).
 * PREVIEW-ONLY (no backend contract, never persisted): brand-name rename,
 * banner/promo, section ordering, featured products, nav/footer, SEO/social.
 * Draft/publish is NOT offered (backend has no draft state).
 */
export function CustomizationPage() {
  return (
    <CustomizationProvider>
      <CustomizationInner />
    </CustomizationProvider>
  );
}

function CustomizationInner() {
  const { session } = useAuth();
  const { toast } = useToast();
  const { branding, preview, setBranding, setPreview, isDirty, markSaved } = useCustomization();
  useUnsavedChangesWarning(isDirty);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  // Brand name is not renameable via any backend endpoint, so it is never
  // populated here — the UI surfaces this limitation explicitly.

  const [domains, setDomains] = useState<StoreDomain[]>([]);
  const [products, setProducts] = useState<SellerProductWithMaster[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [domainError, setDomainError] = useState<string | null>(null);
  const [removeDomainId, setRemoveDomainId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [b, d, p] = await Promise.all([
          getBranding().catch((e: unknown) => (e instanceof ApiError && e.status === 404 ? null : Promise.reject(e))),
          listDomains().catch(() => [] as StoreDomain[]),
          listProducts().catch(() => [] as SellerProductWithMaster[]),
        ]);
        if (cancelled) return;
        if (b) {
          setStoreId(b.storeId ?? b.id ?? null);
          setBranding({
            logoUrl: b.logoUrl ?? '',
            faviconUrl: b.faviconUrl ?? '',
            primaryColor: b.primaryColor ?? '#8057f5',
            secondaryColor: b.secondaryColor ?? '#9877ff',
            supportEmail: b.supportEmail ?? '',
            supportPhone: b.supportPhone ?? '',
            darkMode: (b.theme as { darkMode?: boolean } | null)?.darkMode !== false,
          });
        }
        setDomains(d);
        setProducts(p);
        markSaved();
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Unable to load customization.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setBranding, markSaved]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const colorError = validateColor(branding.primaryColor) ?? validateColor(branding.secondaryColor);
    const logoError = validateHttpUrl(branding.logoUrl || undefined, 'Logo URL');
    const faviconError = validateHttpUrl(branding.faviconUrl || undefined, 'Favicon URL');
    const emailError = validateSupportEmail(branding.supportEmail || undefined);
    const phoneError = validateSupportPhone(branding.supportPhone || undefined);
    if (colorError || logoError || faviconError || emailError || phoneError) {
      setError(colorError ?? logoError ?? faviconError ?? emailError ?? phoneError ?? 'Invalid input.');
      return;
    }
    if (!storeId) {
      setError('Store ID unavailable — branding cannot be saved yet.');
      return;
    }
    setSaving(true);
    try {
      await saveBranding({
        storeId,
        logoUrl: branding.logoUrl || undefined,
        faviconUrl: branding.faviconUrl || undefined,
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        supportEmail: branding.supportEmail || undefined,
        supportPhone: branding.supportPhone || undefined,
        theme: { darkMode: branding.darkMode },
      } satisfies Branding);
      markSaved();
      toast('success', 'Branding published');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save branding.');
    } finally {
      setSaving(false);
    }
  }

  async function onAddDomain(e: FormEvent) {
    e.preventDefault();
    setDomainError(null);
    if (!storeId) {
      setDomainError('Store ID unavailable — cannot add a domain yet.');
      return;
    }
    try {
      const created = await createDomain({ storeId, domain: newDomain.trim() });
      setDomains((prev) => [...prev, created]);
      setNewDomain('');
      toast('success', 'Domain added (pending verification)');
    } catch (err) {
      setDomainError(err instanceof ApiError ? err.message : 'Unable to add domain.');
    }
  }

  async function onVerifyDomain(id: string) {
    try {
      const updated = await verifyDomain(id);
      setDomains((prev) => prev.map((d) => (d.id === id ? { ...d, ...updated } : d)));
      toast('info', 'Verification started');
    } catch (err) {
      toast('error', 'Verification failed', err instanceof ApiError ? err.message : undefined);
    }
  }

  async function onRemoveDomain() {
    if (!removeDomainId) return;
    const id = removeDomainId;
    setRemoveDomainId(null);
    try {
      await removeDomain(id);
      setDomains((prev) => prev.filter((d) => d.id !== id));
      toast('success', 'Domain suspended');
    } catch (err) {
      toast('error', 'Remove failed', err instanceof ApiError ? err.message : undefined);
    }
  }

  return (
    <div className="tpt-page">
      <div className="tpt-page__header">
        <h1 className="tpt-page__title">Storefront customization</h1>
        <p className="tpt-page__subtitle">
          Tenant <code>{session?.tenantId ?? '—'}</code> · role{' '}
          <Badge tone="primary">{session?.role ?? '—'}</Badge>
        </p>
      </div>

      {isDirty && (
        <div className="custom__dirty-bar">
          <Icon name="alert" size={16} /> You have unsaved changes.
          <span style={{ marginLeft: 'auto' }}>
            <Button size="sm" variant="primary" loading={saving} onClick={(e) => onSave(e as unknown as FormEvent)}>Publish</Button>
          </span>
        </div>
      )}

      {error && <p className="sf__error" style={{ marginBottom: '1rem' }}>{error}</p>}

      {loading ? (
        <SkeletonLine lines={8} />
      ) : (
        <div className="custom">
          <form className="custom__form" onSubmit={onSave}>
            <SectionCard title="Brand identity">
              <p className="custom__hint">
                Brand name is set at registration and is not renameable — the
                backend has no rename endpoint. Uploads are not supported either;
                logo/favicon must be hosted URLs.
              </p>
              <Input label="Logo URL" type="url" value={branding.logoUrl} onChange={(e) => setBranding({ logoUrl: e.target.value })} placeholder="https://cdn.example.com/logo.png" hint="http(s) URL only — uploads are not supported by the backend." error={validateHttpUrl(branding.logoUrl || undefined, 'Logo URL')} />
              <Input label="Favicon URL" type="url" value={branding.faviconUrl} onChange={(e) => setBranding({ faviconUrl: e.target.value })} placeholder="https://cdn.example.com/favicon.ico" error={validateHttpUrl(branding.faviconUrl || undefined, 'Favicon URL')} />
            </SectionCard>

            <SectionCard title="Colors & theme">
              <div className="custom__row">
                <div style={{ flex: 1 }}>
                  <Input label="Primary / accent color" value={branding.primaryColor} onChange={(e) => setBranding({ primaryColor: e.target.value })} error={validateColor(branding.primaryColor)} />
                </div>
                <span className="custom__swatch" style={{ background: branding.primaryColor }} aria-hidden="true" />
              </div>
              <div className="custom__row">
                <div style={{ flex: 1 }}>
                  <Input label="Secondary color" value={branding.secondaryColor} onChange={(e) => setBranding({ secondaryColor: e.target.value })} error={validateColor(branding.secondaryColor)} />
                </div>
                <span className="custom__swatch" style={{ background: branding.secondaryColor }} aria-hidden="true" />
              </div>
              <label className="custom__checkbox">
                <input type="checkbox" checked={branding.darkMode} onChange={(e) => setBranding({ darkMode: e.target.checked })} />
                Dark storefront theme (uncheck for light)
              </label>
            </SectionCard>

            <SectionCard title="Support">
              <Input label="Support email" type="email" value={branding.supportEmail} onChange={(e) => setBranding({ supportEmail: e.target.value })} error={validateSupportEmail(branding.supportEmail || undefined)} />
              <Input label="Support phone" value={branding.supportPhone} onChange={(e) => setBranding({ supportPhone: e.target.value })} error={validateSupportPhone(branding.supportPhone || undefined)} />
            </SectionCard>

            <SectionCard title="Banner & promotions" previewOnly>
              <label className="custom__checkbox">
                <input type="checkbox" checked={preview.showBanner} onChange={(e) => setPreview({ showBanner: e.target.checked })} />
                Show promotional banner
              </label>
              <Input label="Banner heading" value={preview.bannerHeading} onChange={(e) => setPreview({ bannerHeading: e.target.value })} placeholder="Summer sale!" />
              <Input label="Banner subtext" value={preview.bannerSubtext} onChange={(e) => setPreview({ bannerSubtext: e.target.value })} placeholder="Up to 20% off top-ups" />
            </SectionCard>

            <SectionCard title="Featured products" previewOnly>
              <label className="custom__checkbox">
                <input type="checkbox" checked={preview.showFeatured} onChange={(e) => setPreview({ showFeatured: e.target.checked })} />
                Show featured section
              </label>
              {products.map((p) => (
                <label key={p.id} className="custom__checkbox">
                  <input
                    type="checkbox"
                    checked={preview.featuredProductIds.includes(p.id)}
                    onChange={(e) =>
                      setPreview({
                        featuredProductIds: e.target.checked
                          ? [...preview.featuredProductIds, p.id]
                          : preview.featuredProductIds.filter((id) => id !== p.id),
                      })
                    }
                  />
                  {p.masterProduct.name} · {formatIDR(p.manualPriceMinor ?? p.masterProduct.costMinor + (p.markupValue ?? 0))}
                </label>
              ))}
              {products.length === 0 && <p className="custom__hint">No products yet.</p>}
            </SectionCard>

            <SectionCard title="SEO & social preview" previewOnly>
              <p className="custom__hint">
                SEO title/description and social cards have no backend contract —
                preview only, not persisted.
              </p>
              <Input label="SEO title" placeholder="Preview only" />
              <Input label="SEO description" placeholder="Preview only" />
            </SectionCard>

            <SectionCard title="Custom domains">
              <p className="custom__hint">
                Verified via real domain endpoints. Host-based white-labeling is
                not wired end-to-end yet (documented backend gap).
              </p>
              {domains.map((d) => (
                <div key={d.id} className="dash__detail-row">
                  <span>
                    <code>{d.domain}</code> <Badge tone={domainTone(d.state)}>{d.state}</Badge>
                    {d.sslCertificateIssued && <Badge tone="success">SSL</Badge>}
                  </span>
                  <span style={{ display: 'flex', gap: '0.5rem' }}>
                    {d.state === 'PENDING' && <Button size="sm" variant="secondary" onClick={() => onVerifyDomain(d.id)}>Verify</Button>}
                    <Button size="sm" variant="danger" onClick={() => setRemoveDomainId(d.id)}>Remove</Button>
                  </span>
                </div>
              ))}
              {domains.length === 0 && <p className="custom__hint">No custom domains yet.</p>}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <Input label="Add domain" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="store.example.com" />
                </div>
                <Button type="button" variant="secondary" onClick={onAddDomain}>Add</Button>
              </div>
              {domainError && <p className="sf__error">{domainError}</p>}
            </SectionCard>

            <Button type="submit" variant="primary" size="lg" loading={saving}>Publish changes</Button>
          </form>

          <LivePreview />
        </div>
      )}

      <DialogConfirm
        open={removeDomainId !== null}
        onClose={() => setRemoveDomainId(null)}
        onConfirm={onRemoveDomain}
        title="Remove domain?"
        description="This suspends the domain (destructive). This cannot be undone from here."
        confirmLabel="Remove"
        danger
      />
    </div>
  );
}

/* --------------------------- Live preview --------------------------- */

function LivePreview() {
  const { branding, preview } = useCustomization();
  const featured = preview.featuredProductIds;

  return (
    <div className="custom__preview">
      <div
        className="custom__preview-frame"
        style={{ '--color-primary': branding.primaryColor, '--color-brand-400': branding.secondaryColor } as React.CSSProperties}
      >
        <div className="custom__preview-toolbar" aria-hidden="true">
          <span className="custom__preview-dot" />
          <span className="custom__preview-dot" />
          <span className="custom__preview-dot" />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginLeft: '0.5rem' }}>
            Live preview · {branding.darkMode ? 'dark' : 'light'}
          </span>
        </div>
        <div className="custom__preview-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="" style={{ width: '1.5rem', height: '1.5rem', objectFit: 'contain' }} />
            ) : (
              <span style={{ color: 'var(--color-primary)' }}><Icon name="spark" size={20} /></span>
            )}
            <strong>Your Store</strong>
          </div>

          {preview.showBanner && (
            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: '#fff', marginBottom: '0.75rem' }}>
              <strong>{preview.bannerHeading || 'Banner heading'}</strong>
              <div style={{ fontSize: 'var(--text-xs)', opacity: 0.9 }}>{preview.bannerSubtext || 'Banner subtext'}</div>
            </div>
          )}

          {preview.showFeatured && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', marginBottom: '0.25rem' }}>Featured</div>
              {featured.length === 0 ? (
                <p className="custom__hint">Select featured products to preview.</p>
              ) : (
                featured.slice(0, 3).map((id) => (
                  <div key={id} style={{ fontSize: 'var(--text-xs)', padding: '0.25rem 0' }}>• Product {id.slice(0, 8)}</div>
                ))
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                <div style={{ width: '100%', height: '2.5rem', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, var(--color-primary), var(--color-brand-700, #5b2fbe))', marginBottom: '0.5rem' }} />
                <div style={{ height: '0.5rem', width: '60%', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-full)' }} />
                <div style={{ height: '0.5rem', width: '40%', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-full)', marginTop: '0.25rem' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="custom__hint" style={{ marginTop: '0.5rem' }}>
        Preview reflects persisted branding + preview-only sections. Checkout
        accessibility is unaffected — this only restyles the storefront.
      </p>
    </div>
  );
}

function SectionCard({ title, children, previewOnly }: { title: string; children: React.ReactNode; previewOnly?: boolean }) {
  return (
    <section className="custom__card">
      <div className="custom__card-head">
        <h2 className="custom__card-title">
          {title}
          {previewOnly && <Badge tone="warning" className="custom__badge-inline">Preview only</Badge>}
        </h2>
      </div>
      <div className="custom__card-body">{children}</div>
    </section>
  );
}

function domainTone(state: string): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
  switch (state) {
    case 'ACTIVE':
    case 'VERIFIED':
      return 'success';
    case 'PROVISIONING':
    case 'VERIFYING':
      return 'info';
    case 'SUSPENDED':
    case 'FAILED':
    case 'EXPIRED':
      return 'danger';
    case 'PENDING':
      return 'warning';
    default:
      return 'neutral';
  }
}


