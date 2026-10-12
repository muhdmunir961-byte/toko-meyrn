import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/errors';
import { getBranding, saveBranding, type Branding } from '../api/seller';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { SkeletonLine } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { validateColor, validateSupportEmail } from '../lib/validation';

/**
 * Seller profile & store settings.
 *
 * `GET/PATCH /seller/branding` is the only store-settings endpoint that exists.
 * Payment integration configuration has NO endpoint (the
 * PaymentGatewayConfiguration model exists but is not wired) — so it is shown
 * as a documented gap, not a fake form.
 */
export function SettingsPage() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [primaryColor, setPrimaryColor] = useState('#8057f5');
  const [secondaryColor, setSecondaryColor] = useState('#9877ff');
  const [supportEmail, setSupportEmail] = useState('');

  const colorError = validateColor(primaryColor);
  const emailError = validateSupportEmail(supportEmail || undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const b = await getBranding();
        if (!cancelled) {
          setBranding(b);
          setPrimaryColor(b.primaryColor ?? '#8057f5');
          setSecondaryColor(b.secondaryColor ?? '#9877ff');
          setSupportEmail(b.supportEmail ?? '');
        }
      } catch (err) {
        // 404 = branding not configured yet (fine); other errors surface.
        if (err instanceof ApiError && err.status === 404) {
          if (!cancelled) setBranding(null);
        } else if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Unable to load settings.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (colorError || emailError) {
      setError('Please fix the highlighted fields.');
      return;
    }
    if (!branding?.storeId && !branding?.id) {
      setError('Store ID unavailable — branding cannot be saved yet. Complete store setup first.');
      return;
    }
    setSaving(true);
    try {
      const storeId = branding?.storeId ?? branding?.id ?? '';
      const saved = await saveBranding({
        storeId,
        primaryColor,
        secondaryColor,
        supportEmail: supportEmail || undefined,
      });
      setBranding(saved);
      toast('success', 'Settings saved');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="tpt-page">
      <div className="tpt-page__header">
        <h1 className="tpt-page__title">Store settings</h1>
        <p className="tpt-page__subtitle">
          Tenant <code>{session?.tenantId ?? '—'}</code> · role <Badge tone="primary">{session?.role ?? '—'}</Badge>
        </p>
      </div>

      {loading ? (
        <SkeletonLine lines={5} />
      ) : (
        <div style={{ maxWidth: '34rem' }}>
          <form className="sf__form" onSubmit={onSubmit}>
            <div className="auth__color-row">
              <div className="auth__color-input">
                <Input label="Primary color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} error={colorError} />
              </div>
              <span className="auth__color-preview" style={{ background: primaryColor }} aria-hidden="true" />
            </div>
            <div className="auth__color-row">
              <div className="auth__color-input">
                <Input label="Secondary color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} error={validateColor(secondaryColor)} />
              </div>
              <span className="auth__color-preview" style={{ background: secondaryColor }} aria-hidden="true" />
            </div>
            <Input label="Support email" type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} error={emailError} />
            {error && <p className="sf__error">{error}</p>}
            <Button type="submit" loading={saving}>Save settings</Button>
          </form>

          <div style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: '0.5rem' }}>Payment integration</h2>
            <div className="sf__notice">
              <Icon name="shield" size={14} style={{ verticalAlign: '-2px', marginRight: '0.25rem' }} />
              Payment gateway configuration is not available yet — the backend has
              no payment-config endpoint. Orders use the MOCK gateway only.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
