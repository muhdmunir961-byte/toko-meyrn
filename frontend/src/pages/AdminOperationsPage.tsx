import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/errors';
import { getOperationsHealth, type OperationsHealth } from '../api/admin';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonLine } from '../components/ui/Skeleton';

/**
 * Infrastructure health — GET /admin/operations/health (SUPER_ADMIN).
 * Shows database health with an accurate "last checked" timestamp.
 */
export function AdminOperationsPage() {
  const { session } = useAuth();
  const [health, setHealth] = useState<OperationsHealth | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setHealth(await getOperationsHealth());
      setCheckedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load health.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const dbOk = health?.components?.database === 'ok';
  const overallOk = health?.status === 'ok';

  return (
    <div className="tpt-page">
      <div className="tpt-page__header">
        <h1 className="tpt-page__title">Operations health</h1>
        <p className="tpt-page__subtitle">
          Tenant <code>{session?.tenantId ?? '—'}</code>
          {checkedAt && <> · last checked <code>{new Date(checkedAt).toLocaleString()}</code></>}
        </p>
      </div>

      {error && <EmptyState title="Couldn't load health" description={error} icon={<Icon name="alert" size={32} />} action={<Button onClick={() => void load()}>Retry</Button>} />}

      {loading ? (
        <SkeletonLine lines={4} />
      ) : health ? (
        <>
          <div className="dash__kpis">
            <div className="dash__kpi">
              <span className="dash__kpi-label">Overall</span>
              <div className="dash__kpi-value"><Badge tone={overallOk ? 'success' : 'danger'}>{health.status}</Badge></div>
            </div>
            <div className="dash__kpi">
              <span className="dash__kpi-label">Database</span>
              <div className="dash__kpi-value"><Badge tone={dbOk ? 'success' : 'danger'}>{health?.components?.database ?? '—'}</Badge></div>
            </div>
          </div>

          <div className="sf__notice" style={{ marginTop: '1.5rem' }}>
            <Icon name="shield" size={14} style={{ verticalAlign: '-2px', marginRight: '0.25rem' }} />
            Backup status and additional infrastructure components are not exposed
            by any backend endpoint — only database health is reported here.
          </div>

          <div style={{ marginTop: '1rem' }}>
            <Button variant="secondary" onClick={() => void load()}>Refresh</Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
