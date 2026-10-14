/**
 * Google Sign-In (Identity Services) button.
 *
 * Flow: loads Google's GSI script, renders the official button, and hands the
 * returned ID token (`credential`) to the caller, which exchanges it for a
 * session at POST /auth/google.
 *
 * Configuration: the client ID comes from `VITE_GOOGLE_CLIENT_ID` at build time
 * (Vite inlines `import.meta.env.*`). When it is unset the component renders
 * nothing, so a deployment without Google configured simply omits the button.
 *
 * Security notes:
 *  - The ID token is verified server-side against Google's JWKS; this component
 *    never trusts the token itself.
 *  - No client secret is used or needed for the ID-token flow.
 *  - `index.html` CSP must allow https://accounts.google.com in `script-src`
 *    and `frame-src` (GSI renders an iframe).
 */

import { useEffect, useRef, useState } from 'react';

const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const GSI_SCRIPT_ID = 'google-identity-services';

export const GOOGLE_CLIENT_ID: string =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '';

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleButtonConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize: (config: GoogleButtonConfig) => void;
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
      disableAutoSelect: () => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

/** Injects the GSI script once and resolves when `window.google` is available. */
function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  const existing = document.getElementById(GSI_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('gsi load failed')));
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = GSI_SCRIPT_ID;
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('gsi load failed'));
    document.head.appendChild(script);
  });
}

export interface GoogleSignInButtonProps {
  /** Called with the Google ID token; the caller exchanges it for a session. */
  onCredential: (credential: string) => void;
  /** Called when the script cannot load or Google returns no credential. */
  onError?: (message: string) => void;
  disabled?: boolean;
  /** GSI button label. */
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}

export function GoogleSignInButton({
  onCredential,
  onError,
  disabled = false,
  text = 'continue_with',
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  // Keep the latest callbacks without re-initialising GSI on every render.
  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);
  onCredentialRef.current = onCredential;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadGsiScript()
      .then(() => {
        if (cancelled || !window.google || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: (response) => {
            if (response.credential) onCredentialRef.current(response.credential);
            else onErrorRef.current?.('Google did not return a credential.');
          },
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 320,
        });
        setReady(true);
      })
      .catch(() => {
        onErrorRef.current?.('Could not load Google Sign-In.');
      });
    return () => {
      cancelled = true;
    };
  }, [text]);

  // Not configured -> render nothing (no dead button).
  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div
      className="auth__google"
      data-ready={ready || undefined}
      style={{
        marginTop: '1rem',
        display: 'flex',
        justifyContent: 'center',
        // Google renders an iframe we cannot disable directly, so block pointer
        // events while a request is in flight.
        pointerEvents: disabled ? 'none' : undefined,
        opacity: disabled ? 0.6 : undefined,
      }}
    >
      <div ref={containerRef} />
    </div>
  );
}
