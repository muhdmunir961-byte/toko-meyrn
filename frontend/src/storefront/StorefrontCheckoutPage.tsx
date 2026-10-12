import { useNavigate, useParams } from 'react-router-dom';
import { useStorefront } from '../storefront/StorefrontContext';
import { useCheckout } from '../storefront/CheckoutContext';
import { useAuth } from '../auth/AuthContext';
import { formatIDR } from '../lib/money';
import { listedPriceMinor } from '../api/storefront';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';

/**
 * Checkout: order confirmation + payment method selection.
 *
 * Authoritative price: we do NOT trust client totals. The confirmation step
 * re-reads the catalog from the server, and the FINAL total is whatever
 * POST /orders returns. The only payment method today is the MOCK gateway.
 */
export function StorefrontCheckoutPage() {
  const { slug = '' } = useParams();
  const { products } = useStorefront();
  const { lines, playerId, serverId, paymentMethod, setPaymentMethod, submitOrder, submitting, error } =
    useCheckout();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const items = lines
    .map((l) => ({ line: l, product: products.find((p) => p.id === l.productId) }))
    .filter((x): x is { line: (typeof lines)[number]; product: NonNullable<typeof x.product> } => !!x.product);

  // Estimated subtotal for display only — NOT authoritative.
  const estimatedMinor = items.reduce(
    (sum, { line, product }) => sum + listedPriceMinor(product) * line.quantity,
    0,
  );

  async function onConfirm() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/${slug}/checkout` } } });
      return;
    }
    const order = await submitOrder();
    if (order) navigate(`/${slug}/order/${order.id}`);
  }

  if (items.length === 0) {
    return (
      <div className="sf__container sf__result">
        <div className="sf__result-icon sf__result-icon--fail">
          <Icon name="alert" size={28} />
        </div>
        <h1>Your cart is empty</h1>
        <div style={{ marginTop: '1rem' }}>
          <Button asChildLink to={`/${slug}`} variant="secondary">Browse catalog</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="sf__container" style={{ maxWidth: '40rem', padding: 'var(--space-10) 0' }}>
      <h1 className="sf__title">Confirm your order</h1>
      <p className="sf__subtitle">
        The final total is computed and confirmed by the store before payment.
      </p>

      <div className="sf__form" style={{ marginTop: '1.5rem' }}>
        {items.map(({ line, product }) => (
          <div
            key={line.productId}
            className="sf__status-row"
            style={{ justifyContent: 'space-between' }}
          >
            <span>
              <strong>{product.masterProduct.name}</strong>
              <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                {line.quantity} × {formatIDR(listedPriceMinor(product))}
              </span>
            </span>
            <span style={{ fontWeight: 'var(--weight-bold)' }}>
              {formatIDR(listedPriceMinor(product) * line.quantity)}
            </span>
          </div>
        ))}

        <div className="sf__status-row" style={{ justifyContent: 'space-between' }}>
          <span>Estimated total</span>
          <span style={{ fontWeight: 'var(--weight-bold)', color: 'var(--color-primary)' }}>
            {formatIDR(estimatedMinor)}
          </span>
        </div>

        {playerId && (
          <div className="sf__notice">
            <Icon name="shield" size={14} style={{ verticalAlign: '-2px', marginRight: '0.25rem' }} />
            Player ID {playerId}
            {serverId ? ` · Server ${serverId}` : ''} — shown for reference; the
            store records the order without a player field today.
          </div>
        )}

        <div>
          <p className="tpt-field__label" style={{ marginBottom: '0.5rem' }}>Payment method</p>
          <div className="sf__payments" role="radiogroup" aria-label="Payment method">
            <button
              type="button"
              className={`sf__payment${paymentMethod === 'MOCK' ? ' sf__payment--active' : ''}`}
              role="radio"
              aria-checked={paymentMethod === 'MOCK'}
              onClick={() => setPaymentMethod('MOCK')}
            >
              <Icon name="credit-card" size={18} />
              <span style={{ flex: 1 }}>Mock gateway</span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                Sandbox only
              </span>
            </button>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginTop: '0.5rem' }}>
            Only the MOCK payment gateway is available — no live payment rails
            exist yet.
          </p>
        </div>

        {error && <p className="sf__error">{error}</p>}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button asChildLink to={`/${slug}`} variant="secondary">Back</Button>
          <Button type="button" variant="primary" size="lg" fullWidth loading={submitting} onClick={onConfirm}>
            {isAuthenticated ? 'Confirm order' : 'Sign in to order'}
          </Button>
        </div>
      </div>
    </div>
  );
}
