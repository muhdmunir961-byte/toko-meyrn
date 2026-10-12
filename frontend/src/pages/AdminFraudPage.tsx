import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/errors';
import { listFraudEvents, reviewFraudEvent, type FraudRiskEvent } from '../api/admin';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { EmptyState } from '../components/ui/EmptyState';
import { DialogConfirm } from '../components/ui/Dialog';
import { SkeletonLine } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';

const PAGE_SIZE = 10;

/**
 * Fraud review — GET /admin/fraud/events + POST /admin/fraud/events/:id/review.
 * Search/filter/pagination are client-side (endpoint returns latest 200, no
 * query params). Reviewing is a privileged action requiring confirmation.
 */
export function AdminFraudPage() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<FraudRiskEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(0);
  const [pending, setPending] = useState<{ id: string; decision: 'ALLOW' | 'BLOCK' } | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setEvents(await listFraudEvents());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load fraud events.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      const matchesQuery = !q || e.id.toLowerCase().includes(q) || (e.orderId ?? '').toLowerCase().includes(q) || (e.actorId ?? '').toLowerCase().includes(q);
      const matchesAction = !action || e.action === action;
      return matchesQuery && matchesAction;
    });
  }, [events, query, action]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages - 1);
  const rows = filtered.slice(pageClamped * PAGE_SIZE, pageClamped * PAGE_SIZE + PAGE_SIZE);

  async function confirmReview() {
    if (!pending) return;
    const { id, decision } = pending;
    setPending(null);
    try {
      await reviewFraudEvent(id, { decision, reason: 'Admin review' });
      toast('success', `Event ${decision === 'ALLOW' ? 'allowed' : 'blocked'}`);
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, reviews: [...e.reviews, { id: `${Date.now()}`, eventId: id, reviewerId: session?.id ?? '', decision, createdAt: new Date().toISOString() }] } : e)));
    } catch (err) {
      toast('error', 'Review failed', err instanceof ApiError ? err.message : undefined);
    }
  }

  return (
    <div className="tpt-page">
      <div className="tpt-page__header">
        <h1 className="tpt-page__title">Fraud review</h1>
        <p className="tpt-page__subtitle">{events.length} events · privileged action (confirm required)</p>
      </div>

      <div className="dash__filters">
        <div className="dash__filter">
          <Input label="Search" placeholder="ID, order, or actor…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} startAdornment={<Icon name="search" size={16} />} />
        </div>
        <div className="dash__filter">
          <Select label="Action" placeholder="All" value={action} onChange={(e) => { setAction(e.target.value); setPage(0); }} options={[
            { value: 'FLAG', label: 'FLAG' },
            { value: 'ALLOW', label: 'ALLOW' },
            { value: 'REQUIRE_REVIEW', label: 'REQUIRE_REVIEW' },
            { value: 'BLOCK', label: 'BLOCK' },
          ]} />
        </div>
      </div>

      {error && <EmptyState title="Couldn't load fraud events" description={error} icon={<Icon name="alert" size={32} />} action={<Button onClick={() => void load()}>Retry</Button>} />}

      {loading ? (
        <SkeletonLine lines={6} />
      ) : rows.length === 0 ? (
        <EmptyState title="No fraud events" description="No events match your filters." icon={<Icon name="shield" size={32} />} />
      ) : (
        <>
          <div className="tpt-table__scroll">
            <table className="tpt-table">
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">Category</th>
                  <th scope="col">Action</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Score</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Reviews</th>
                  <th scope="col" style={{ textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td><code>{e.id.slice(0, 12)}</code>{e.orderId ? <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>order {e.orderId.slice(0, 10)}</span> : null}</td>
                    <td><Badge tone="neutral">{e.category}</Badge></td>
                    <td><Badge tone={e.action === 'BLOCK' ? 'danger' : e.action === 'FLAG' ? 'warning' : 'info'}>{e.action}</Badge></td>
                    <td style={{ textAlign: 'right' }}>{e.score}</td>
                    <td style={{ textAlign: 'right' }}>{e.reviews.length}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Button size="sm" variant="secondary" onClick={() => setPending({ id: e.id, decision: 'ALLOW' })}>Allow</Button>{' '}
                      <Button size="sm" variant="danger" onClick={() => setPending({ id: e.id, decision: 'BLOCK' })}>Block</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="dash__pagination">
            <span>Page {pageClamped + 1} of {totalPages} ({filtered.length} events)</span>
            <div className="dash__pagination-controls">
              <Button size="sm" variant="secondary" disabled={pageClamped === 0} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <Button size="sm" variant="secondary" disabled={pageClamped >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}

      <DialogConfirm
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={confirmReview}
        title={`${pending?.decision === 'BLOCK' ? 'Block' : 'Allow'} fraud event?`}
        description="This is a privileged, auditable action. It will be recorded with your reviewer identity."
        confirmLabel={pending?.decision === 'BLOCK' ? 'Block' : 'Allow'}
        danger={pending?.decision === 'BLOCK'}
      />
    </div>
  );
}
