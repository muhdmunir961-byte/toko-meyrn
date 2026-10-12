import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/errors';
import { listOrders, type SellerOrder } from '../api/seller';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { Dialog } from '../components/ui/Dialog';
import { SkeletonLine } from '../components/ui/Skeleton';
import { formatIDR } from '../lib/money';
import { orderStatusTone, paymentStatusTone, humanizeStatus } from '../lib/status';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  'CREATED', 'AWAITING_PAYMENT', 'PAYMENT_CONFIRMED', 'QUEUED',
  'PROCESSING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED', 'MANUAL_REVIEW',
];

/**
 * Orders table with filters, search, detail drawer, and pagination.
 *
 * The backend `GET /seller/orders` returns ALL orders with no pagination or
 * filtering params, so pagination/filter/search are performed CLIENT-SIDE.
 * This is documented honestly — no server-side pagination contract exists.
 */
export function OrdersPage() {
  const { session } = useAuth();
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<SellerOrder | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listOrders();
        if (!cancelled) setOrders(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Unable to load orders.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      const matchesQuery = !q || o.id.toLowerCase().includes(q) || (o.customerId ?? '').toLowerCase().includes(q);
      const matchesStatus = !status || o.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [orders, query, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(pageClamped * PAGE_SIZE, pageClamped * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="tpt-page">
      <div className="tpt-page__header">
        <h1 className="tpt-page__title">Orders</h1>
        <p className="tpt-page__subtitle">
          Tenant <code>{session?.tenantId ?? '—'}</code> · {orders.length} total
        </p>
      </div>

      <div className="dash__filters">
        <div className="dash__filter">
          <Input
            label="Search"
            placeholder="Order or customer ID…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            startAdornment={<Icon name="search" size={16} />}
          />
        </div>
        <div className="dash__filter">
          <Select
            label="Status"
            placeholder="All statuses"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(0); }}
            options={STATUS_OPTIONS.map((s) => ({ value: s, label: humanizeStatus(s) }))}
          />
        </div>
      </div>

      {error && <EmptyState title="Couldn't load orders" description={error} icon={<Icon name="alert" size={32} />} action={<Button onClick={() => window.location.reload()}>Retry</Button>} />}

      {loading ? (
        <SkeletonLine lines={6} />
      ) : pageRows.length === 0 ? (
        <EmptyState
          title={orders.length === 0 ? 'No orders yet' : 'No matching orders'}
          description={orders.length === 0 ? 'Orders will appear here.' : 'Try adjusting your filters.'}
          icon={<Icon name="cart" size={32} />}
        />
      ) : (
        <>
          <div className="tpt-table__scroll">
            <table className="tpt-table">
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Status</th>
                  <th scope="col">Payment</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Total</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Items</th>
                  <th scope="col" style={{ textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((o) => (
                  <tr key={o.id}>
                    <td><code>{o.id.slice(0, 12)}</code></td>
                    <td><Badge tone={orderStatusTone(o.status)}>{humanizeStatus(o.status)}</Badge></td>
                    <td><Badge tone={paymentStatusTone(o.payment?.status)}>{humanizeStatus(o.payment?.status ?? 'PENDING')}</Badge></td>
                    <td style={{ textAlign: 'right' }}>{formatIDR(o.totalMinor)}</td>
                    <td style={{ textAlign: 'right' }}>{o.items.length}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Button size="sm" variant="secondary" onClick={() => setSelected(o)}>View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="dash__pagination">
            <span>Page {pageClamped + 1} of {totalPages} ({filtered.length} orders)</span>
            <div className="dash__pagination-controls">
              <Button size="sm" variant="secondary" disabled={pageClamped === 0} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <Button size="sm" variant="secondary" disabled={pageClamped >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}

      <Dialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={`Order ${selected?.id.slice(0, 12)}`}
        description="Order detail (tenant-scoped)"
        size="lg"
        footer={
          <div className="tpt-dialog__actions">
            <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
          </div>
        }
      >
        {selected && (
          <dl className="dash__detail">
            <DetailRow label="Status" value={humanizeStatus(selected.status)} />
            <DetailRow label="Payment" value={humanizeStatus(selected.payment?.status ?? 'PENDING')} />
            <DetailRow label="Total" value={formatIDR(selected.totalMinor)} />
            <DetailRow label="Customer" value={selected.customerId ?? '—'} />
            <DetailRow label="Created" value={new Date(selected.createdAt).toLocaleString()} />
            {selected.items.map((it, i) => (
              <DetailRow key={it.id} label={`Item ${i + 1}`} value={`${it.quantity} × ${formatIDR(it.unitPriceMinor)}`} />
            ))}
          </dl>
        )}
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="dash__detail-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
