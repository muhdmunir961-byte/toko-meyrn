import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/errors';
import { listWebhookDeliveries, replayWebhookDelivery, type WebhookDelivery } from '../api/seller';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { SkeletonLine } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';

/**
 * Notifications & operational alerts.
 *
 * The backend has NO seller-facing notifications/incidents endpoint (the
 * OperationalIncident model is not wired). The closest real "notification" feed
 * is `GET /seller/webhook-deliveries` (delivery status + replay). This page
 * surfaces that feed honestly and labels the gap.
 */
export function AlertsPage() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replayingId, setReplayingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setDeliveries(await listWebhookDeliveries());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function replay(id: string) {
    setReplayingId(id);
    try {
      await replayWebhookDelivery(id);
      toast('success', 'Delivery re-queued');
    } catch (err) {
      toast('error', 'Replay failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setReplayingId(null);
    }
  }

  return (
    <div className="tpt-page">
      <div className="tpt-page__header">
        <h1 className="tpt-page__title">Notifications & alerts</h1>
        <p className="tpt-page__subtitle">
          Tenant <code>{session?.tenantId ?? '—'}</code> · webhook delivery feed
        </p>
      </div>

      <div className="sf__notice" style={{ marginBottom: '1.5rem' }}>
        <Icon name="shield" size={14} style={{ verticalAlign: '-2px', marginRight: '0.25rem' }} />
        There is no seller-facing operational-incidents endpoint yet. This feed
        shows webhook delivery status — the closest real notification surface.
      </div>

      {error && <EmptyState title="Couldn't load notifications" description={error} icon={<Icon name="alert" size={32} />} action={<Button onClick={() => void load()}>Retry</Button>} />}

      {loading ? (
        <SkeletonLine lines={6} />
      ) : deliveries.length === 0 ? (
        <EmptyState
          title="No webhook deliveries"
          description="Deliveries appear here once webhooks fire."
          icon={<Icon name="webhook" size={32} />}
        />
      ) : (
        <div className="tpt-table__scroll">
          <table className="tpt-table">
            <thead>
              <tr>
                <th scope="col">Event</th>
                <th scope="col">Status</th>
                <th scope="col" style={{ textAlign: 'right' }}>Attempts</th>
                <th scope="col">Last error</th>
                <th scope="col" style={{ textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.id}>
                  <td><code>{d.event?.eventType ?? '—'}</code></td>
                  <td><Badge tone={d.status === 'DELIVERED' ? 'success' : d.status === 'FAILED' ? 'danger' : 'warning'}>{d.status}</Badge></td>
                  <td style={{ textAlign: 'right' }}>{d.attemptCount}</td>
                  <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{d.lastError ?? '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Button size="sm" variant="secondary" loading={replayingId === d.id} onClick={() => void replay(d.id)}>Replay</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
