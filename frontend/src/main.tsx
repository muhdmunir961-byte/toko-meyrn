import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/global.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/home.css';
import './styles/auth.css';
import './styles/storefront.css';
import './styles/dashboard.css';
import './styles/customization.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);