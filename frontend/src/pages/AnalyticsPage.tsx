import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/errors';
import { getAnalytics, getProductAnalytics, getResellerAnalytics, type AnalyticsSummary, type ProductAnalytics, type ResellerAnalytics } from '../api/seller';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { SkeletonLine } from '../components/ui/Skeleton';
import { formatIDR, formatPercent } from '../lib/money';

/**
 * Revenue & order analytics.
 * All figures come from `GET /seller/analytics/advanced` (server-aggregated),
 * `GET /seller/analytics/products`, and `GET /seller/analytics/resellers`.
 */
export function AnalyticsPage() {
  const { session } = useAuth();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [products, setProducts] = useState<ProductAnalytics[]>([]);
  const [resellers, setResellers] = useState<ResellerAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [s, p, r] = await Promise.all([getAnalytics(), getProductAnalytics(), getResellerAnalytics()]);
        if (!cancelled) {
          setSummary(s);
          setProducts(p);
          setResellers(r);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Unable to load analytics.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="tpt-page">
      <div className="tpt-page__header">
        <h1 className="tpt-page__title">Analytics</h1>
        <p className="tpt-page__subtitle">
          Tenant <code>{session?.tenantId ?? '—'}</code> · server-aggregated revenue & orders
        </p>
      </div>

      {error && <EmptyState title="Couldn't load analytics" description={error} icon={<Icon name="alert" size={32} />} action={<Button onClick={() => window.location.reload()}>Retry</Button>} />}

      {loading ? (
        <SkeletonLine lines={6} />
      ) : summary ? (
        <>
          <div className="dash__kpis">
            <Metric label="Gross sales" value={formatIDR(summary.grossSalesMinor)} />
            <Metric label="Gross profit" value={formatIDR(summary.grossProfitMinor)} />
            <Metric label="Provider cost" value={formatIDR(summary.providerCostMinor)} />
            <Metric label="Seller markup" value={formatIDR(summary.sellerMarkupMinor)} />
            <Metric label="Reseller commission" value={formatIDR(summary.resellerCommissionMinor)} />
            <Metric label="Seller revenue" value={formatIDR(summary.sellerRevenueMinor)} />
            <Metric label="Avg. transaction" value={formatIDR(summary.averageTransactionValueMinor)} />
            <Metric label="Repeat rate" value={formatPercent(summary.repeatPurchaseRate)} />
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: '0.75rem' }}>Product revenue</h2>
            {products.length === 0 ? (
              <EmptyState title="No product revenue yet" icon={<Icon name="box" size={32} />} />
            ) : (
              <div className="dash__detail">
                {products.map((p) => (
                  <div key={p.productId} className="dash__detail-row">
                    <span><code>{p.productId.slice(0, 8)}</code> · {p.qty} sold</span>
                    <span>{formatIDR(p.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: '0.75rem' }}>Reseller commissions</h2>
            {resellers.length === 0 ? (
              <EmptyState title="No resellers yet" icon={<Icon name="users" size={32} />} />
            ) : (
              <div className="dash__detail">
                {resellers.map((r) => (
                  <div key={r.id} className="dash__detail-row">
                    <span>{r.name} <Badge tone="neutral">{r.status}</Badge></span>
                    <span>{formatIDR(r.settledCommissionMinor)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="dash__kpi">
      <span className="dash__kpi-label">{label}</span>
      <div className="dash__kpi-value">{value}</div>
    </div>
  );
}
