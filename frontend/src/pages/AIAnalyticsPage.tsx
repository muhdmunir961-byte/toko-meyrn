import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/errors';
import { aiAnalytics, type AIAnalyticsResponse } from '../api/ai';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonLine } from '../components/ui/Skeleton';
import { formatIDR } from '../lib/money';
import { AI_LABEL } from '../lib/security';

/**
 * AI analytics & business insights — POST /seller/ai/analytics (OWNER/STAFF).
 * Renders an accessible bar chart with a fallback data table. The "explanation"
 * text is AI-generated and clearly labeled non-authoritative.
 */
export function AIAnalyticsPage() {
  const { session } = useAuth();
  const [data, setData] = useState<AIAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      setData(await aiAnalytics());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to generate insights.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void run();
  }, []);

  const bars = data?.metrics
    ? [
        { label: 'Orders', value: data.metrics.orderCount ?? 0, tone: 'var(--color-primary)' },
        { label: 'Successful', value: data.metrics.successfulOrders ?? 0, tone: 'var(--color-success)' },
      ]
    : [];

  const maxVal = Math.max(1, ...bars.map((b) => b.value));

  return (
    <div className="tpt-page">
      <div className="tpt-page__header">
        <h1 className="tpt-page__title">AI insights</h1>
        <p className="tpt-page__subtitle">
          Tenant <code>{session?.tenantId ?? '—'}</code> · <Badge tone="warning">{AI_LABEL}</Badge>
        </p>
      </div>

      {error && <EmptyState title="Couldn't generate insights" description={error} icon={<Icon name="alert" size={32} />} action={<Button onClick={() => void run()}>Retry</Button>} />}

      {loading ? (
        <SkeletonLine lines={5} />
      ) : data?.metrics ? (
        <>
          <div className="dash__kpis">
            <Kpi label="Revenue" value={formatIDR(data.metrics.revenueMinor ?? 0)} />
            <Kpi label="Gross profit (est.)" value={formatIDR(data.metrics.estimatedGrossProfitMinor ?? 0)} />
            <Kpi label="Orders" value={String(data.metrics.orderCount ?? 0)} />
            <Kpi label="Evidence orders" value={String(data.evidence?.length ?? 0)} />
          </div>

          {/* Accessible chart: list-based bars with a fallback table. */}
          <div style={{ marginTop: '1.5rem' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: '0.75rem' }}>Order volume</h2>
            <div role="img" aria-label="Orders vs successful orders bar chart" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {bars.map((b) => (
                <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ width: '6rem', fontSize: 'var(--text-sm)', flexShrink: 0 }}>{b.label}</span>
                  <div style={{ flex: 1, height: '1.25rem', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                    <div style={{ width: `${(b.value / maxVal) * 100}%`, height: '100%', background: b.tone }} />
                  </div>
                  <span style={{ width: '3rem', textAlign: 'right', fontSize: 'var(--text-sm)' }}>{b.value}</span>
                </div>
              ))}
            </div>
            {/* Fallback table for screen readers / text-only. */}
            <table className="tpt-table" style={{ marginTop: '0.75rem' }}>
              <thead><tr><th scope="col">Metric</th><th scope="col" style={{ textAlign: 'right' }}>Value</th></tr></thead>
              <tbody>
                {bars.map((b) => (
                  <tr key={b.label}><td>{b.label}</td><td style={{ textAlign: 'right' }}>{b.value}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sf__notice" style={{ marginTop: '1.5rem' }}>
            <Icon name="spark" size={14} style={{ verticalAlign: '-2px', marginRight: '0.25rem' }} />
            <strong>{AI_LABEL}.</strong> {data.explanation}
          </div>

          <div style={{ marginTop: '1rem' }}>
            <Button variant="secondary" onClick={() => void run()}>Regenerate</Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="dash__kpi">
      <span className="dash__kpi-label">{label}</span>
      <div className="dash__kpi-value">{value}</div>
    </div>
  );
}
