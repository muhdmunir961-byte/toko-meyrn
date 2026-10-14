import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/errors';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

/**
 * Login — `/auth/login` -> `{ accessToken }`. 401 -> "invalid credentials".
 * No password-recovery contract exists, so none is offered (no invented link).
 * Google Sign-In is offered in addition (POST /auth/google).
 */
export function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function goToDestination() {
    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
    navigate(from ?? '/onboarding', { replace: true });
  }

  async function onGoogleCredential(credential: string) {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle(credential);
      goToDestination();
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setError('Google sign-in is not available right now.');
      } else if (err instanceof ApiError && err.status === 401) {
        setError('Google could not verify that account.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Unable to sign in with Google.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      goToDestination();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Invalid email or password.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Unable to sign in.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__body">
          <h1 className="auth__title">Sign in</h1>
          <p className="auth__subtitle">Welcome back to your gaming store.</p>

          <form className="auth__form" onSubmit={onSubmit}>
            <Input
              label="Email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && <p className="auth__error">{error}</p>}

            <Button type="submit" loading={loading} fullWidth>
              Sign in
            </Button>
          </form>

          <GoogleSignInButton
            onCredential={onGoogleCredential}
            onError={setError}
            disabled={loading}
            text="signin_with"
          />

          <p className="auth__footer" style={{ marginTop: '1rem' }}>
            New here? <Link to="/register">Create your store</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
