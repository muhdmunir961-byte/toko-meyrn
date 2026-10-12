import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/errors';
import {
  listWhatsApp,
  upsertWhatsApp,
  listWebhookDeliveries,
  replayWebhookDelivery,
  createApiKey,
  revokeApiKey,
  getRoutingHealth,
  type WhatsAppIntegration,
  type WebhookDelivery,
  type ApiKey,
} from '../api/seller';
import { aiWorkflows, type AIWorkflow } from '../api/ai';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { DialogConfirm } from '../components/ui/Dialog';
import { SkeletonLine } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { maskApiKey } from '../lib/security';
import { providerHealthTone, humanizeStatus } from '../lib/status';

/**
 * Automation & intelligence: WhatsApp status, webhook delivery logs + replay,
 * API key management (masked after creation), provider routing health, and
 * automation (AI workflow) events. All backed by verified endpoints.
 */
export function AutomationPage() {
  const { session } = useAuth();
  const { toast } = useToast();

  const [whatsapp, setWhatsapp] = useState<WhatsAppIntegration[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [routing, setRouting] = useState<{ id: string; providerType: string; enabled: boolean; priority: number; health: string; failureCount: number }[]>([]);
  const [workflows, setWorkflows] = useState<AIWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [keyName, setKeyName] = useState('');
  const [keyScopes, setKeyScopes] = useState('orders:read');
  const [createdKey, setCreatedKey] = useState<ApiKey | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [keyBusy, setKeyBusy] = useState(false);
  const [replayingId, setReplayingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [w, d, r, wf] = await Promise.all([
        listWhatsApp().catch(() => [] as WhatsAppIntegration[]),
        listWebhookDeliveries().catch(() => [] as WebhookDelivery[]),
        getRoutingHealth().catch(() => []),
        aiWorkflows().catch(() => [] as AIWorkflow[]),
      ]);
      setWhatsapp(w);
      setDeliveries(d);
      setRouting(r);
      setWorkflows(wf);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load automation.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggleWhatsApp(integration: WhatsAppIntegration) {
    try {
      const updated = await upsertWhatsApp({ connectionType: integration.connectionType, enabled: !integration.enabled });
      setWhatsapp((prev) => prev.map((w) => (w.connectionType === updated.connectionType ? updated : w)));
      toast('success', `WhatsApp ${updated.enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast('error', 'Update failed', err instanceof ApiError ? err.message : undefined);
    }
  }

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

  async function onCreateKey(e: FormEvent) {
    e.preventDefault();
    if (!keyName.trim()) return;
    setKeyBusy(true);
    try {
      const key = await createApiKey({ name: keyName.trim(), scopes: keyScopes.split(',').map((s) => s.trim()).filter(Boolean) });
      setCreatedKey(key);
      setKeyName('');
      toast('success', 'API key created — copy it now');
    } catch (err) {
      toast('error', 'Key creation failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setKeyBusy(false);
    }
  }

  async function onRevoke() {
    if (!revokeId) return;
    const id = revokeId;
    setRevokeId(null);
    try {
      await revokeApiKey(id);
      toast('success', 'API key revoked');
    } catch (err) {
      toast('error', 'Revoke failed', err instanceof ApiError ? err.message : undefined);
    }
  }

  return (
    <div className="tpt-page">
      <div className="tpt-page__header">
        <h1 className="tpt-page__title">Automation & intelligence</h1>
        <p className="tpt-page__subtitle">Tenant <code>{session?.tenantId ?? '—'}</code> · role <Badge tone="primary">{session?.role ?? '—'}</Badge></p>
      </div>

      {error && <p className="sf__error" style={{ marginBottom: '1rem' }}>{error}</p>}

      {loading ? (
        <SkeletonLine lines={8} />
      ) : (
        <>
          <Section title="WhatsApp integration">
            {whatsapp.length === 0 ? (
              <p className="custom__hint">No WhatsApp integrations configured.</p>
            ) : (
              whatsapp.map((w) => (
                <div key={w.id} className="dash__detail-row" style={{ justifyContent: 'space-between' }}>
                  <span>
                    <Badge tone={w.connectionType === 'MOCK' ? 'info' : 'warning'}>{w.connectionType}</Badge>{' '}
                    <Badge tone={w.enabled ? 'success' : 'neutral'}>{w.enabled ? 'Enabled' : 'Disabled'}</Badge>
                  </span>
                  <Button size="sm" variant="secondary" onClick={() => toggleWhatsApp(w)}>{w.enabled ? 'Disable' : 'Enable'}</Button>
                </div>
              ))
            )}
            <p className="custom__hint">
              Connection status shown truthfully: MOCK is functional; OFFICIAL is
              fail-closed until verified credentials exist.
            </p>
          </Section>

          <Section title="Webhook delivery logs">
            {deliveries.length === 0 ? (
              <p className="custom__hint">No webhook deliveries yet.</p>
            ) : (
              <div className="tpt-table__scroll">
                <table className="tpt-table">
                  <thead><tr><th scope="col">Event</th><th scope="col">Status</th><th scope="col" style={{ textAlign: 'right' }}>Attempts</th><th scope="col">Last error</th><th scope="col" style={{ textAlign: 'right' }}></th></tr></thead>
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
          </Section>

          <Section title="API keys">
            <form onSubmit={onCreateKey} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <Input label="Key name" value={keyName} onChange={(e) => setKeyName(e.target.value)} required />
              </div>
              <div style={{ width: '12rem' }}>
                <Select label="Scope" value={keyScopes} onChange={(e) => setKeyScopes(e.target.value)} options={[
                  { value: 'orders:read', label: 'orders:read' },
                  { value: 'orders:read,orders:write', label: 'orders:read,write' },
                  { value: 'products:read', label: 'products:read' },
                  { value: '*', label: '*' },
                ]} />
              </div>
              <Button type="submit" loading={keyBusy}>Create</Button>
            </form>
            {createdKey && (
              <div className="sf__notice" style={{ marginBottom: '0.75rem' }}>
                <Icon name="key" size={14} style={{ verticalAlign: '-2px', marginRight: '0.25rem' }} />
                New key (shown once): <code>{createdKey.key}</code> — masked thereafter:{' '}
                <code>{maskApiKey(createdKey.key)}</code>
              </div>
            )}
            <p className="custom__hint">
              There is no list-keys endpoint, so keys are shown once at creation and
              masked after. Secrets are never persisted in the browser.
            </p>
          </Section>

          <Section title="Provider routing health">
            {routing.length === 0 ? (
              <p className="custom__hint">No providers configured.</p>
            ) : (
              <div className="tpt-table__scroll">
                <table className="tpt-table">
                  <thead><tr><th scope="col">Provider</th><th scope="col">Enabled</th><th scope="col">Health</th><th scope="col" style={{ textAlign: 'right' }}>Failures</th></tr></thead>
                  <tbody>
                    {routing.map((r) => (
                      <tr key={r.id}>
                        <td><code>{r.providerType}</code></td>
                        <td><Badge tone={r.enabled ? 'success' : 'neutral'}>{r.enabled ? 'On' : 'Off'}</Badge></td>
                        <td><Badge tone={providerHealthTone(r.health)}>{humanizeStatus(r.health)}</Badge></td>
                        <td style={{ textAlign: 'right' }}>{r.failureCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section title="Automation events (AI workflows)">
            {workflows.length === 0 ? (
              <p className="custom__hint">No automation workflows yet.</p>
            ) : (
              <div className="dash__detail">
                {workflows.map((w) => (
                  <div key={w.id} className="dash__detail-row">
                    <span>{w.type} <Badge tone="neutral">{w.state}</Badge></span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>{w.errorMessage ?? ''}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      )}

      <DialogConfirm
        open={revokeId !== null}
        onClose={() => setRevokeId(null)}
        onConfirm={onRevoke}
        title="Revoke API key?"
        description="This permanently revokes the key. Existing integrations using it will fail."
        confirmLabel="Revoke"
        danger
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="custom__card" style={{ marginBottom: '1.5rem' }}>
      <div className="custom__card-head"><h2 className="custom__card-title">{title}</h2></div>
      <div className="custom__card-body">{children}</div>
    </section>
  );
}
