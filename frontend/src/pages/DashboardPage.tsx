import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { SkeletonLine } from '../components/ui/Skeleton';
import { ApiError } from '../api/errors';
import {
  getAnalytics,
  getProductAnalytics,
  listOrders,
  type AnalyticsSummary,
  type ProductAnalytics,
  type SellerOrder,
} from '../api/seller';
import { formatIDR, formatPercent } from '../lib/money';
import { orderStatusTone, humanizeStatus } from '../lib/status';

/**
 * Dashboard overview — KPIs derived from the VERIFIED
 * `GET /seller/analytics/advanced` (server-aggregated) plus a recent-orders
 * preview from `GET /seller/orders`. All monetary figures come from the server.
 */
export function DashboardPage() {
  const { session, logout } = useAuth();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [products, setProducts] = useState<ProductAnalytics[]>([]);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [s, p, o] = await Promise.all([
          getAnalytics(),
          getProductAnalytics(),
          listOrders(),
        ]);
        if (!cancelled) {
          setSummary(s);
          setProducts(p);
          setOrders(o);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Unable to load dashboard.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="tpt-page">
      <div className="tpt-page__header">
        <h1 className="tpt-page__title">Overview</h1>
        <p className="tpt-page__subtitle">
          Signed in as <strong>{session?.role ?? '—'}</strong> · tenant{' '}
          <code style={{ fontSize: 'var(--text-xs)' }}>{session?.tenantId ?? '—'}</code>
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: '1.5rem' }}>
          <EmptyState
            title="Couldn't load your dashboard"
            description={error}
            icon={<Icon name="alert" size={32} />}
            action={<Button onClick={() => window.location.reload()}>Retry</Button>}
          />
        </div>
      )}

      {loading && !summary ? (
        <SkeletonLine lines={5} />
      ) : summary ? (
        <>
          <div className="dash__kpis">
            <Kpi label="Gross sales" value={formatIDR(summary.grossSalesMinor)} />
            <Kpi label="Gross profit" value={formatIDR(summary.grossProfitMinor)} />
            <Kpi label="Seller revenue" value={formatIDR(summary.sellerRevenueMinor)} />
            <Kpi label="Avg. order" value={formatIDR(summary.averageTransactionValueMinor)} />
            <Kpi label="Successful" value={String(summary.successfulTransactions)} />
            <Kpi label="Failed" value={String(summary.failedTransactions)} tone="danger" />
            <Kpi label="Pending" value={String(summary.pendingTransactions)} tone="warning" />
            <Kpi label="Repeat rate" value={formatPercent(summary.repeatPurchaseRate)} />
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <Card>
              <CardHeader
                title="Recent orders"
                subtitle="Latest activity across your store"
                action={
                  <Button asChildLink to="/dash/orders" variant="secondary" size="sm">
                    View all
                  </Button>
                }
              />
              <CardBody>
                {orders.length === 0 ? (
                  <EmptyState title="No orders yet" description="Orders will appear here once customers start buying." icon={<Icon name="cart" size={32} />} />
                ) : (
                  <div className="dash__detail">
                    {orders.slice(0, 5).map((o) => (
                      <div key={o.id} className="dash__detail-row">
                        <span>
                          <code>{o.id.slice(0, 8)}</code>{' '}
                          <Badge tone={orderStatusTone(o.status)}>{humanizeStatus(o.status)}</Badge>
                        </span>
                        <span>{formatIDR(o.totalMinor)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <Card>
              <CardHeader title="Top products" subtitle="By revenue (server-aggregated)" />
              <CardBody>
                {products.length === 0 ? (
                  <EmptyState title="No product data yet" icon={<Icon name="box" size={32} />} />
                ) : (
                  <div className="dash__detail">
                    {products.slice(0, 5).map((p) => (
                      <div key={p.productId} className="dash__detail-row">
                        <span><code>{p.productId.slice(0, 8)}</code> · {p.qty} sold</span>
                        <span>{formatIDR(p.revenue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </>
      ) : null}

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
        <Button asChildLink to="/dash/catalog" variant="secondary">Manage catalog</Button>
        <Button asChildLink to="/dash/analytics" variant="secondary">Analytics</Button>
        <Button variant="ghost" onClick={logout}>Sign out</Button>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'danger' | 'warning' }) {
  return (
    <div className="dash__kpi">
      <span className="dash__kpi-label">{label}</span>
      <div
        className="dash__kpi-value"
        style={{ color: tone === 'danger' ? 'var(--color-danger)' : tone === 'warning' ? 'var(--color-warning)' : undefined }}
      >
        {value}
      </div>
    </div>
  );
}