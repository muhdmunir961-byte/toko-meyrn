import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { RequireAuth, RequireRole } from '../auth/guards';
import { ADMIN_ROLES, TENANT_ROLES } from '../auth/guards';
import { ThemeProvider } from '../lib/theme';
import { OnboardingProvider } from '../onboarding/OnboardingContext';
import { ToastProvider } from '../components/ui/Toast';
import { DashboardShell } from '../components/layout/DashboardShell';
import { Navbar } from '../components/layout/Navbar';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { ShowcasePage } from '../pages/ShowcasePage';
import { DashboardPage } from '../pages/DashboardPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';
import { OrdersPage } from '../pages/OrdersPage';
import { CatalogPage } from '../pages/CatalogPage';
import { PricingPage } from '../pages/PricingPage';
import { ProvidersPage } from '../pages/ProvidersPage';
import { SettingsPage } from '../pages/SettingsPage';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { AlertsPage } from '../pages/AlertsPage';
import { CustomizationPage } from '../pages/CustomizationPage';
import { AIChatPage } from '../pages/AIChatPage';
import { AIAnalyticsPage } from '../pages/AIAnalyticsPage';
import { AutomationPage } from '../pages/AutomationPage';
import { AdminOverviewPage } from '../pages/AdminOverviewPage';
import { AdminFraudPage } from '../pages/AdminFraudPage';
import { AdminOperationsPage } from '../pages/AdminOperationsPage';
import { AdminPlansPage } from '../pages/AdminPlansPage';
import { StorefrontLayout } from '../storefront/StorefrontLayout';
import { StorefrontHomePage } from '../storefront/StorefrontHomePage';
import { StorefrontProductPage } from '../storefront/StorefrontProductPage';
import { StorefrontCheckoutPage } from '../storefront/StorefrontCheckoutPage';
import { StorefrontOrderPage } from '../storefront/StorefrontOrderPage';
import { StorefrontLookupPage } from '../storefront/StorefrontLookupPage';

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <OnboardingProvider>
            <BrowserRouter>
              <Routes>
                {/* Public / marketing */}
                <Route path="/" element={<PublicLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="login" element={<LoginPage />} />
                  <Route path="register" element={<RegisterPage />} />
                  <Route path="showcase" element={<ShowcasePage />} />
                </Route>

                {/* Public tenant storefront (slug-scoped) */}
                <Route path="/:slug" element={<StorefrontLayout />}>
                  <Route index element={<StorefrontHomePage />} />
                  <Route path="product/:productId" element={<StorefrontProductPage />} />
                  <Route path="checkout" element={<StorefrontCheckoutPage />} />
                  <Route path="order/:orderId" element={<StorefrontOrderPage />} />
                  <Route path="lookup" element={<StorefrontLookupPage />} />
                </Route>

                {/* Onboarding (authenticated, tenant roles) */}
                <Route
                  path="/onboarding"
                  element={
                    <RequireAuth>
                      <RequireRole roles={[...TENANT_ROLES]}>
                        <OnboardingPage />
                      </RequireRole>
                    </RequireAuth>
                  }
                />

                {/* Dashboard (authenticated, tenant roles) */}
                <Route
                  path="/dash"
                  element={
                    <RequireAuth>
                      <RequireRole roles={[...TENANT_ROLES]}>
                        <DashboardShell />
                      </RequireRole>
                    </RequireAuth>
                  }
                >
                  <Route index element={<DashboardPage />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="catalog" element={<CatalogPage />} />
                  <Route path="pricing" element={<PricingPage />} />
                  <Route path="providers" element={<ProvidersPage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="alerts" element={<AlertsPage />} />
                  <Route path="customization" element={<CustomizationPage />} />
                  <Route path="ai" element={<AIChatPage />} />
                  <Route path="ai-analytics" element={<AIAnalyticsPage />} />
                  <Route path="automation" element={<AutomationPage />} />
                  <Route
                    path="resellers"
                    element={
                      <RequireRole roles={[...TENANT_ROLES]}>
                        <PlaceholderPage title="Resellers" />
                      </RequireRole>
                    }
                  />
                  <Route path="api-keys" element={<PlaceholderPage title="API Keys" />} />
                  <Route path="webhooks" element={<PlaceholderPage title="Webhooks" />} />
                  <Route path="whatsapp" element={<PlaceholderPage title="WhatsApp" />} />
                  <Route
                    path="domains"
                    element={
                      <RequireRole roles={[...TENANT_ROLES]}>
                        <PlaceholderPage title="Domains" />
                      </RequireRole>
                    }
                  />
                  <Route path="branding" element={<PlaceholderPage title="Branding" />} />
                </Route>

                {/* Admin (SUPER_ADMIN) */}
                <Route
                  path="/admin"
                  element={
                    <RequireAuth>
                      <RequireRole roles={[...ADMIN_ROLES]}>
                        <DashboardShell admin />
                      </RequireRole>
                    </RequireAuth>
                  }
                >
                  <Route index element={<AdminOverviewPage />} />
                  <Route path="fraud" element={<AdminFraudPage />} />
                  <Route path="operations" element={<AdminOperationsPage />} />
                  <Route path="plans" element={<AdminPlansPage />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </OnboardingProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

function PublicLayout() {
  return (
    <div>
      <Navbar
        links={[
          { to: '/#storefront', label: 'Storefront' },
          { to: '/#features', label: 'Features' },
          { to: '/#pricing', label: 'Pricing' },
          { to: '/#faq', label: 'FAQ' },
        ]}
      />
      <main>
        <Outlet />
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="tpt-container" style={{ paddingTop: '4rem' }}>
      <h1>Page not found</h1>
    </div>
  );
}