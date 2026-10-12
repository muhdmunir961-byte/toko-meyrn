import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/errors';
import { getOperationsHealth, listPlans, type OperationsHealth, type SubscriptionPlan } from '../api/admin';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonLine } from '../components/ui/Skeleton';
import { formatIDR } from '../lib/money';

/**
 * Super-admin overview. Backed only by the verified admin endpoints:
 * operations health + subscription plans. Modules without a backend endpoint
 * are explicitly listed as "not available" (never fabricated).
 */
export function AdminOverviewPage() {
  const { session } = useAuth();
  const [health, setHealth] = useState<OperationsHealth | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [h, p] = await Promise.all([getOperationsHealth(), listPlans()]);
        if (!cancelled) { setHealth(h); setPlans(p); }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Unable to load admin overview.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="tpt-page">
      <div className="tpt-page__header">
        <h1 className="tpt-page__title">Admin console</h1>
        <p className="tpt-page__subtitle">
          Signed in as <strong>{session?.role ?? '—'}</strong> · tenant{' '}
          <code>{session?.tenantId ?? '—'}</code>
        </p>
      </div>

      {error && <EmptyState title="Couldn't load admin overview" description={error} icon={<Icon name="alert" size={32} />} action={<Button onClick={() => window.location.reload()}>Retry</Button>} />}

      {loading ? (
        <SkeletonLine lines={5} />
      ) : (
        <>
          <div className="dash__kpis">
            <div className="dash__kpi">
              <span className="dash__kpi-label">Operations</span>
              <div className="dash__kpi-value">
                <Badge tone={health?.status === 'ok' ? 'success' : 'danger'}>{health?.status ?? '—'}</Badge>
              </div>
            </div>
            <div className="dash__kpi">
              <span className="dash__kpi-label">Database</span>
              <div className="dash__kpi-value">
                <Badge tone={health?.components?.database === 'ok' ? 'success' : 'danger'}>{health?.components?.database ?? '—'}</Badge>
              </div>
            </div>
            <div className="dash__kpi">
              <span className="dash__kpi-label">Active plans</span>
              <div className="dash__kpi-value">{plans.filter((p) => p.active).length}</div>
            </div>
            <div className="dash__kpi">
              <span className="dash__kpi-label">Total plans</span>
              <div className="dash__kpi-value">{plans.length}</div>
            </div>
          </div>

          <div className="sf__notice" style={{ marginTop: '1.5rem' }}>
            <Icon name="shield" size={14} style={{ verticalAlign: '-2px', marginRight: '0.25rem' }} />
            Modules without a verified backend endpoint — tenant management, seller
            accounts, billing oversight, platform order monitoring, provider
            health, payment alerts, audit log, backup status, and feature flags —
            are not available. Only fraud review, operations health, and
            subscription plans are backed by real admin endpoints.
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: '0.5rem' }}>Subscription plans</h2>
            <div className="dash__detail">
              {plans.map((p) => (
                <div key={p.id} className="dash__detail-row">
                  <span>{p.name} <Badge tone={p.active ? 'success' : 'neutral'}>{p.active ? 'Active' : 'Inactive'}</Badge></span>
                  <span>{p.monthlyPriceMinor === 0 ? 'Free' : formatIDR(p.monthlyPriceMinor)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
