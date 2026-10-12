import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Top-level error boundary. Catches uncaught render/runtime errors so a single
 * broken page doesn't unmount the entire application. Renders a minimal,
 * on-brand fallback with a reload action.
 */
interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface the error to the console for diagnosis (no remote logging wired).
    console.error('Uncaught render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '2rem',
            textAlign: 'center',
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
          }}
        >
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>Something went wrong</h1>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: '32rem' }}>
            An unexpected error occurred. Please reload the page. If the problem
            persists, contact support.
          </p>
          <button
            type="button"
            className="tpt-button tpt-button--primary tpt-button--md"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
