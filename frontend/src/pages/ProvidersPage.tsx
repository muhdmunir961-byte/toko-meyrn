import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/errors';
import {
  listProviders,
  testProviderConnection,
  type ProviderConfig,
} from '../api/seller';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { SkeletonLine } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { providerHealthTone, humanizeStatus } from '../lib/status';

/**
 * Provider availability & order-routing visibility.
 *
 * `GET /seller/providers` (list + health) and `GET /seller/routing/health`
 * (routing health) drive this view. `POST /seller/providers/:id/test` runs a
 * connection test (MOCK returns ok; DIGIFLAZZ fails closed).
 */
export function ProvidersPage() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setProviders(await listProviders());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load providers.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function test(id: string) {
    setTestingId(id);
    try {
      const res = await testProviderConnection(id);
      toast(res.ok ? 'success' : 'warning', res.ok ? 'Connection OK' : 'Connection failed', res.message);
    } catch (err) {
      toast('error', 'Test failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setTestingId(null);
    }
  }

  return (
    <div className="tpt-page">
      <div className="tpt-page__header">
        <h1 className="tpt-page__title">Providers & routing</h1>
        <p className="tpt-page__subtitle">
          Tenant <code>{session?.tenantId ?? '—'}</code> · provider health and order routing
        </p>
      </div>

      {error && <EmptyState title="Couldn't load providers" description={error} icon={<Icon name="alert" size={32} />} action={<Button onClick={() => void load()}>Retry</Button>} />}

      {loading ? (
        <SkeletonLine lines={5} />
      ) : providers.length === 0 ? (
        <EmptyState
          title="No providers configured"
          description="Connect a provider to route orders. (Set up via onboarding or the providers endpoint.)"
          icon={<Icon name="plug" size={32} />}
        />
      ) : (
        <div className="tpt-table__scroll">
          <table className="tpt-table">
            <thead>
              <tr>
                <th scope="col">Label</th>
                <th scope="col">Type</th>
                <th scope="col">Enabled</th>
                <th scope="col">Health</th>
                <th scope="col" style={{ textAlign: 'right' }}>Priority</th>
                <th scope="col" style={{ textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.id}>
                  <td>{p.label}</td>
                  <td><code>{p.providerType}</code></td>
                  <td><Badge tone={p.enabled ? 'success' : 'neutral'}>{p.enabled ? 'Enabled' : 'Disabled'}</Badge></td>
                  <td>
                    <Badge tone={providerHealthTone(p.health?.status)}>{humanizeStatus(p.health?.status ?? 'CLOSED')}</Badge>
                  </td>
                  <td style={{ textAlign: 'right' }}>{p.priority}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Button size="sm" variant="secondary" loading={testingId === p.id} onClick={() => void test(p.id)}>
                      Test
                    </Button>
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
