import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/errors';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Icon } from '../components/ui/Icon';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { PLANS, formatPlanPrice } from '../lib/plans';
import { useOnboarding } from '../onboarding/OnboardingContext';
import {
  validateEmail,
  validatePassword,
  validateRequiredName,
  validateSlug,
} from '../lib/validation';

/**
 * Registration — mirrors the backend `/auth/register` contract exactly:
 * { email, password(min 12), tenantName(min 2), storeName(min 2), slug }.
 * The backend creates the User (OWNER), Tenant, TenantMember, and Store in one
 * transaction and returns a JWT. Duplicate email -> 409.
 *
 * Three-step form for a better onboarding UX; the single register call is made
 * only at the end. No slug-availability endpoint exists, so the slug step is a
 * client-side syntax check plus an advisory note (backend enforces uniqueness
 * via `@unique`).
 */
export function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const { setPlanName, markComplete } = useOnboarding();
  const navigate = useNavigate();

  const [step, setStep] = useState<0 | 1 | 2>(0);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [slug, setSlug] = useState('');
  const [planId, setPlanId] = useState<string>('free');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  const confirmError = confirm !== password ? 'Passwords do not match.' : undefined;
  const tenantError = validateRequiredName(tenantName, 'Business name');
  const storeError = validateRequiredName(storeName, 'Store name');
  const slugError = validateSlug(slug);

  async function onGoogleCredential(credential: string) {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle(credential);
      // The backend provisioned User + Tenant + Store in one transaction, so the
      // account and store onboarding steps are already satisfied.
      markComplete('account');
      markComplete('store');
      navigate('/onboarding', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setError('Google sign-up is not available right now.');
      } else if (err instanceof ApiError && err.status === 401) {
        setError('Google could not verify that account.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Unable to continue with Google.');
      }
    } finally {
      setLoading(false);
    }
  }

  function next() {
    setError(null);
    if (step === 0) {
      if (emailError || passwordError || confirmError) {
        setError('Please fix the highlighted fields.');
        return;
      }
      setStep(1);
    } else if (step === 1) {
      if (tenantError || storeError || slugError) {
        setError('Please fix the highlighted fields.');
        return;
      }
      setStep(2);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({
        email: email.trim(),
        password,
        tenantName: tenantName.trim(),
        storeName: storeName.trim(),
        slug: slug.trim().toLowerCase(),
      });
      setPlanName(PLANS.find((p) => p.id === planId)?.name ?? null);
      markComplete('account');
      markComplete('store');
      markComplete('plan');
      navigate('/onboarding', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('That email is already registered. Try signing in instead.');
        setStep(0);
      } else {
        setError(err instanceof ApiError ? err.message : 'Unable to create your store.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__body">
          <h1 className="auth__title">Create your store</h1>
          <p className="auth__subtitle">
            {step === 0
              ? 'Start with your account.'
              : step === 1
                ? 'Name your business and pick a store address.'
                : 'Choose a plan to launch with.'}
          </p>

          <div className="auth__steps" aria-hidden="true">
            <span className={`auth__step ${step >= 0 ? 'auth__step--active' : ''}`} />
            <span className={`auth__step ${step >= 1 ? 'auth__step--active' : ''}`} />
            <span className={`auth__step ${step >= 2 ? 'auth__step--active' : ''}`} />
          </div>

          <form
            className="auth__form"
            onSubmit={step === 2 ? onSubmit : (e) => { e.preventDefault(); next(); }}
          >
            {step === 0 && (
              <>
                <Input
                  label="Email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={emailError}
                />
                <Input
                  label="Password"
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={12}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={passwordError}
                  hint="At least 12 characters."
                />
                <Input
                  label="Confirm password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  error={confirmError}
                />
              </>
            )}

            {step === 1 && (
              <>
                <Input
                  label="Business name"
                  required
                  autoComplete="organization"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  error={tenantError}
                />
                <Input
                  label="Store name"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  error={storeError}
                />
                <Input
                  label="Store slug"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  error={slugError}
                  hint="Lowercase letters, numbers, and hyphens only."
                  startAdornment={<span aria-hidden="true">/</span>}
                />
                <SlugStatus slug={slug} error={slugError} />
              </>
            )}

            {step === 2 && (
              <div className="auth__plans" role="radiogroup" aria-label="Select a plan">
                {PLANS.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className={`auth__plan${planId === p.id ? ' auth__plan--selected' : ''}`}
                    role="radio"
                    aria-checked={planId === p.id}
                    onClick={() => setPlanId(p.id)}
                  >
                    <span className="auth__plan-radio" aria-hidden="true" />
                    <span className="auth__plan-info">
                      <span className="auth__plan-name">{p.name}</span>
                      <span className="auth__plan-price">
                        {formatPlanPrice(p.monthlyPriceMinor)}
                        {p.monthlyPriceMinor > 0 ? ' / month' : ''}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {error && <p className="auth__error">{error}</p>}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {step > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setError(null); setStep((step - 1) as 0 | 1); }}
                >
                  Back
                </Button>
              )}
              <Button type="submit" loading={loading} fullWidth>
                {step === 2 ? 'Create store' : 'Continue'}
              </Button>
            </div>
          </form>

          {step === 0 && (
            <GoogleSignInButton
              onCredential={onGoogleCredential}
              onError={setError}
              disabled={loading}
              text="signup_with"
            />
          )}

          <p className="auth__footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function SlugStatus({ slug, error }: { slug: string; error?: string }) {
  if (!slug.trim()) return null;
  if (error) {
    return (
      <span className="auth__slug auth__slug-bad">
        <Icon name="alert" size={14} /> {error}
      </span>
    );
  }
  return (
    <span className="auth__slug auth__slug-ok">
      <Icon name="check" size={14} /> /{slug.trim()} looks good — availability
      is confirmed at signup (no live lookup endpoint yet).
    </span>
  );
}