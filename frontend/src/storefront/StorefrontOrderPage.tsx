import { useParams } from 'react-router-dom';
import { useCheckout } from '../storefront/CheckoutContext';
import { formatIDR } from '../lib/money';
import { paymentView, fulfillmentView } from '../api/storefront';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

/**
 * Order status — distinguishes PAYMENT state from FULFILLMENT state.
 *
 *  - Payment   -> order.payment.status (PENDING / CONFIRMED / FAILED / EXPIRED)
 *  - Fulfillment -> order.status (AWAITING_PAYMENT / ... / SUCCESS / FAILED / ...)
 *
 * Only states the backend actually emits are handled (no invented REFUNDED).
 * The MOCK gateway's "pay" is POST /orders/:id/mock-payment.
 */
export function StorefrontOrderPage() {
  const { slug = '', orderId = '' } = useParams();
  const { order, paying, pay, error } = useCheckout();

  if (!order || order.id !== orderId) {
    return (
      <div className="sf__container sf__result">
        <div className="sf__result-icon sf__result-icon--fail">
          <Icon name="alert" size={28} />
        </div>
        <h1>Order not found</h1>
        <p style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>
          Start a new order from the catalog. (There is no customer-facing order
          lookup endpoint yet.)
        </p>
        <div style={{ marginTop: '1rem' }}>
          <Button asChildLink to={`/${slug}`} variant="secondary">Back to catalog</Button>
        </div>
      </div>
    );
  }

  const payState = paymentView(order.payment?.status);
  const fulfillState = fulfillmentView(order.status);

  const payBadge =
    payState === 'paid' ? 'success' : payState === 'failed' || payState === 'expired' ? 'danger' : 'warning';
  const fulfillBadge =
    fulfillState === 'fulfilled'
      ? 'success'
      : fulfillState === 'failed' || fulfillState === 'expired' || fulfillState === 'cancelled'
        ? 'danger'
        : fulfillState === 'manual_review'
          ? 'warning'
          : 'info';

  return (
    <div className="sf__container" style={{ maxWidth: '40rem', padding: 'var(--space-10) 0' }}>
      <h1 className="sf__title">Order {order.id.slice(0, 8)}</h1>
      <p className="sf__subtitle" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
        {order.id}
      </p>

      <div className="sf__status" style={{ marginTop: '1.5rem' }}>
        <div className="sf__status-row">
          <Icon name="credit-card" size={18} />
          <span style={{ flex: 1 }}>Payment</span>
          <Badge tone={payBadge}>{payState.replace('_', ' ')}</Badge>
        </div>
        <div className="sf__status-row">
          <Icon name="box" size={18} />
          <span style={{ flex: 1 }}>Fulfillment</span>
          <Badge tone={fulfillBadge}>{fulfillState.replace('_', ' ')}</Badge>
        </div>
      </div>

      <div className="sf__status-row" style={{ marginTop: '1rem', justifyContent: 'space-between' }}>
        <span>Total</span>
        <span style={{ fontWeight: 'var(--weight-bold)', color: 'var(--color-primary)' }}>
          {formatIDR(order.totalMinor)}
        </span>
      </div>

      {order.items.map((it) => (
        <div key={it.id} className="sf__status-row" style={{ justifyContent: 'space-between' }}>
          <span>{it.quantity} × item</span>
          <span>{formatIDR(it.unitPriceMinor * it.quantity)}</span>
        </div>
      ))}

      {error && <p className="sf__error" style={{ marginTop: '1rem' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
        {payState === 'pending' && (
          <Button type="button" variant="primary" loading={paying} onClick={() => void pay()}>
            Pay now (mock)
          </Button>
        )}
        <Button asChildLink to={`/${slug}`} variant="ghost">Continue shopping</Button>
      </div>

      {fulfillState === 'fulfilled' && (
        <div className="sf__notice" style={{ marginTop: '1rem' }}>
          <Icon name="check" size={14} style={{ verticalAlign: '-2px', marginRight: '0.25rem' }} />
          Your order is fulfilled.
        </div>
      )}
    </div>
  );
}
