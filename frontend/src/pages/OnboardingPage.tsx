import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/errors';
import {
  createProvider,
  getBranding,
  saveBranding,
  upsertWhatsApp,
  type Branding,
} from '../api/seller';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Icon } from '../components/ui/Icon';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { PLANS } from '../lib/plans';
import { useOnboarding, type OnboardingStepKey, type OnboardingView } from '../onboarding/OnboardingContext';
import { validateColor, validateSupportEmail } from '../lib/validation';

/**
 * Onboarding wizard (authenticated). Steps: branding -> plan -> config
 * checklist -> completion dashboard.
 *
 * Contract fidelity:
 *  - Branding -> GET/PATCH /seller/branding (storeId resolved from an existing
 *    branding row, since the JWT carries no slug and there is no /auth/me).
 *  - Plan     -> subscription selection is preview-only (no seller plan
 *    endpoint exists); stored client-side, never charged.
 *  - Config   -> providers (MOCK/DIGIFLAZZ) + WhatsApp (MOCK/OFFICIAL). Payments
 *    have no endpoint -> marked unavailable.
 */
export function OnboardingPage() {
  const { session } = useAuth();
  const { state, markComplete, setPlanName, setHasProvider, setHasWhatsApp } =
    useOnboarding();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<OnboardingView>('branding');

  const [primaryColor, setPrimaryColor] = useState('#8057f5');
  const [secondaryColor, setSecondaryColor] = useState('#9877ff');
  const [supportEmail, setSupportEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [brandingBusy, setBrandingBusy] = useState(false);

  const [providerType, setProviderType] = useState<'MOCK' | 'DIGIFLAZZ'>('MOCK');
  const [providerLabel, setProviderLabel] = useState('My provider');
  const [whatsAppType, setWhatsAppType] = useState<'MOCK' | 'OFFICIAL'>('MOCK');
  const [configBusy, setConfigBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const colorError = validateColor(primaryColor);
  const emailError = validateSupportEmail(supportEmail || undefined);

  const plan = PLANS.find((p) => p.name === state.planName);

  const steps: { key: OnboardingView; label: string }[] = [
    { key: 'branding', label: 'Branding' },
    { key: 'plan', label: 'Plan' },
    { key: 'config', label: 'Setup' },
    { key: 'done', label: 'Done' },
  ];

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await getBranding();
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          /* not configured yet — expected on first run */
        }
      }
      void cancelled;
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function resolveStoreId(): Promise<string | null> {
    try {
      const branding = await getBranding();
      return branding.storeId ?? branding.id ?? null;
    } catch {
      return null;
    }
  }

  async function submitBranding(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (colorError || emailError) {
      setError('Please fix the highlighted fields.');
      return;
    }
    setBrandingBusy(true);
    try {
      const resolvedStoreId = await resolveStoreId();
      if (resolvedStoreId) {
        await saveBranding({
          storeId: resolvedStoreId,
          primaryColor,
          secondaryColor,
          supportEmail: supportEmail || undefined,
          logoUrl: logoUrl || undefined,
        } satisfies Branding);
      }
      markComplete('branding');
      setStep('plan');
      toast(
        'success',
        'Branding saved',
        resolvedStoreId ? undefined : 'Recorded locally (store id not yet resolvable).',
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save branding.');
    } finally {
      setBrandingBusy(false);
    }
  }

  function submitPlan() {
    markComplete('plan');
    setStep('config');
  }

  async function submitConfig(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setConfigBusy(true);
    try {
      let providerOk = state.hasProvider;
      let whatsAppOk = state.hasWhatsApp;

      try {
        await createProvider({ providerType, label: providerLabel, enabled: false });
        providerOk = true;
        setHasProvider(true);
      } catch (err) {
        if (err instanceof ApiError) toast('error', 'Provider setup failed', err.message);
      }

      try {
        await upsertWhatsApp({ connectionType: whatsAppType, enabled: false });
        whatsAppOk = true;
        setHasWhatsApp(true);
      } catch (err) {
        if (err instanceof ApiError) toast('error', 'WhatsApp setup failed', err.message);
      }

      if (providerOk && whatsAppOk) {
        markComplete('config');
        setStep('done');
      } else {
        setError('Some integrations could not be configured. You can retry them later.');
      }
    } finally {
      setConfigBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth__card" style={{ maxWidth: '34rem' }}>
        <div className="auth__body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 className="auth__title">Set up your store</h1>
            <Badge tone="primary">{session?.role ?? 'OWNER'}</Badge>
          </div>
          <p className="auth__subtitle">
            A few more steps to finish onboarding. You can change these anytime.
          </p>

          <div className="auth__steps" aria-label="Onboarding progress">
            {steps.map((s) => (
              <span
                key={s.key}
                className={`auth__step ${
                  step === s.key
                    ? 'auth__step--active'
                    : state.completed.includes(s.key as OnboardingStepKey)
                      ? 'auth__step--done'
                      : ''
                }`}
              />
            ))}
          </div>

          {error && <p className="auth__error">{error}</p>}

          {step === 'branding' && (
            <form className="auth__form" onSubmit={submitBranding}>
              <p className="auth__hint">
                Colors and support details are sanitized server-side (#RRGGBB only).
              </p>
              <div className="auth__color-row">
                <div className="auth__color-input">
                  <Input
                    label="Primary color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    error={colorError}
                  />
                </div>
                <span className="auth__color-preview" style={{ background: primaryColor }} aria-hidden="true" />
              </div>
              <div className="auth__color-row">
                <div className="auth__color-input">
                  <Input
                    label="Secondary color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    error={validateColor(secondaryColor)}
                  />
                </div>
                <span className="auth__color-preview" style={{ background: secondaryColor }} aria-hidden="true" />
              </div>
              <Input
                label="Support email"
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                error={emailError}
                placeholder="support@yourstore.com"
              />
              <Input
                label="Logo URL (optional)"
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://cdn.example.com/logo.png"
                hint="Must be an https:// URL."
              />
              <Button type="submit" loading={brandingBusy} fullWidth>
                Save & continue
              </Button>
            </form>
          )}

          {step === 'plan' && (
            <div className="auth__form">
              <div className="auth__plans" role="radiogroup" aria-label="Select a plan">
                {PLANS.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className={`auth__plan${plan?.id === p.id ? ' auth__plan--selected' : ''}`}
                    role="radio"
                    aria-checked={plan?.id === p.id}
                    onClick={() => setPlanName(p.name)}
                  >
                    <span className="auth__plan-radio" aria-hidden="true" />
                    <span className="auth__plan-info">
                      <span className="auth__plan-name">{p.name}</span>
                      <span className="auth__plan-price">
                        {p.monthlyPriceMinor === 0
                          ? 'Free'
                          : `Rp ${(p.monthlyPriceMinor / 100).toLocaleString('id-ID')} / month`}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              <p className="auth__hint">
                Plan selection is recorded locally — there is no seller-facing
                subscription endpoint yet, so no charge is made.
              </p>
              <Button type="button" onClick={submitPlan} fullWidth>
                Continue
              </Button>
            </div>
          )}

          {step === 'config' && (
            <form className="auth__form" onSubmit={submitConfig}>
              <div className="auth__checklist">
                <div className={`auth__check-item${state.hasProvider ? ' auth__check-item--done' : ''}`}>
                  <span className="auth__check-icon">
                    <Icon name={state.hasProvider ? 'check' : 'plug'} size={18} />
                  </span>
                  <div className="auth__check-label">
                    <p className="auth__check-title">Provider</p>
                    <p className="auth__check-desc">
                      Connect a top-up provider. MOCK works instantly; DIGIFLAZZ is
                      fail-closed until official credentials are verified.
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <select
                        className="tpt-select"
                        value={providerType}
                        onChange={(e) => setProviderType(e.target.value as 'MOCK' | 'DIGIFLAZZ')}
                        aria-label="Provider type"
                      >
                        <option value="MOCK">MOCK</option>
                        <option value="DIGIFLAZZ">DIGIFLAZZ</option>
                      </select>
                      <Input
                        value={providerLabel}
                        onChange={(e) => setProviderLabel(e.target.value)}
                        aria-label="Provider label"
                        placeholder="Label"
                      />
                    </div>
                  </div>
                </div>

                <div className={`auth__check-item${state.hasWhatsApp ? ' auth__check-item--done' : ''}`}>
                  <span className="auth__check-icon">
                    <Icon name={state.hasWhatsApp ? 'check' : 'chat'} size={18} />
                  </span>
                  <div className="auth__check-label">
                    <p className="auth__check-title">WhatsApp notifications</p>
                    <p className="auth__check-desc">
                      Optional. MOCK works instantly; OFFICIAL requires credentials.
                    </p>
                    <select
                      className="tpt-select"
                      value={whatsAppType}
                      onChange={(e) => setWhatsAppType(e.target.value as 'MOCK' | 'OFFICIAL')}
                      aria-label="WhatsApp connection type"
                    >
                      <option value="MOCK">MOCK</option>
                      <option value="OFFICIAL">OFFICIAL</option>
                    </select>
                  </div>
                </div>

                <div className="auth__check-item">
                  <span className="auth__check-icon">
                    <Icon name="credit-card" size={18} />
                  </span>
                  <div className="auth__check-label">
                    <p className="auth__check-title">Payments</p>
                    <p className="auth__check-desc">
                      No payment-gateway configuration endpoint exists yet — this
                      step is pending backend support. Orders use mock payment in
                      the meantime.
                    </p>
                  </div>
                </div>
              </div>

              <Button type="submit" loading={configBusy} fullWidth>
                Finish setup
              </Button>
            </form>
          )}

          {step === 'done' && (
            <div className="auth__complete">
              <span className="auth__complete-ring">
                <Icon name="check" size={32} />
              </span>
              <h2 className="auth__complete-title">You're all set</h2>
              <p className="auth__complete-lead">
                Your store is ready. Here's where you stand.
              </p>

              <div className="auth__summary">
                <SummaryRow done label="Account" />
                <SummaryRow done={state.completed.includes('store')} label="Store" />
                <SummaryRow done={state.completed.includes('branding')} label="Branding" />
                <SummaryRow done={state.completed.includes('plan')} label="Plan" value={plan?.name ?? 'Free'} />
                <SummaryRow done={state.hasProvider} label="Provider" />
                <SummaryRow done={state.hasWhatsApp} label="WhatsApp" />
                <SummaryRow done={false} label="Payments" value="Unavailable" />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <Button variant="secondary" onClick={() => navigate('/dash')}>
                  Go to dashboard
                </Button>
                <Button variant="primary" onClick={() => navigate('/dash')}>
                  Explore dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, done, value }: { label: string; done: boolean; value?: string }) {
  return (
    <div className={`auth__summary-row ${done ? 'auth__summary-row--done' : 'auth__summary-row--todo'}`}>
      <Icon name={done ? 'check' : 'alert'} size={16} />
      <span style={{ flex: 1 }}>{label}</span>
      {value && <span style={{ color: 'var(--color-text-muted)' }}>{value}</span>}
    </div>
  );
}
