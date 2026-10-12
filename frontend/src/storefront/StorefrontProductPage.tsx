import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStorefront } from '../storefront/StorefrontContext';
import { useCheckout } from '../storefront/CheckoutContext';
import { formatIDR } from '../lib/money';
import { listedPriceMinor } from '../api/storefront';
import { Icon } from '../components/ui/Icon';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

/**
 * Product detail: denomination selection + player-info form.
 *
 * The backend has no denomination/stock endpoints and no player-id/target field
 * in the order contract — so denominations are presented as UI-only quantity
 * helpers and player info is UI-only (clearly labeled). The authoritative price
 * is always re-fetched at order confirmation via POST /orders.
 */
export function StorefrontProductPage() {
  const { slug = '', productId = '' } = useParams();
  const { products } = useStorefront();
  const { setLines, setPlayerId, setServerId } = useCheckout();
  const navigate = useNavigate();

  const product = products.find((p) => p.id === productId);

  const [quantity, setQuantity] = useState(1);
  const [playerId, setPlayerIdLocal] = useState('');
  const [serverId, setServerIdLocal] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!product) {
    return (
      <div className="sf__container sf__result">
        <div className="sf__result-icon sf__result-icon--fail">
          <Icon name="alert" size={28} />
        </div>
        <h1>Product unavailable</h1>
        <p style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>
          This product is no longer available or does not exist.
        </p>
        <div style={{ marginTop: '1rem' }}>
          <Button asChildLink to={`/${slug}`} variant="secondary">Back to catalog</Button>
        </div>
      </div>
    );
  }

  const priceMinor = listedPriceMinor(product);
  const productIdResolved = product.id;

  function addToCart() {
    setError(null);
    if (!playerId.trim()) {
      setError('Enter your player ID (user ID).');
      return;
    }
    // Player/server info is UI-only; not persisted by the backend order contract.
    setPlayerId(playerId.trim());
    setServerId(serverId.trim());
    setLines([{ productId: productIdResolved, quantity }]);
    navigate(`/${slug}/checkout`);
  }

  return (
    <div className="sf__container">
      <div className="sf__detail">
        <div className="sf__detail-art" aria-hidden="true">
          <Icon name="zap" size={56} />
        </div>

        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>{product.masterProduct.name}</h1>
          <p className="sf__detail-meta" style={{ marginTop: '0.5rem' }}>
            <span><strong>SKU:</strong> <code>{product.masterProduct.sku}</code></span>
            <span>Seller sets the price; it is re-confirmed at checkout.</span>
          </p>

          <p className="sf__detail-price" style={{ marginTop: '1rem' }}>
            {formatIDR(priceMinor)}
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontWeight: 400 }}>
              {' '}each
            </span>
          </p>

          <div style={{ marginTop: '1.5rem' }}>
            <p className="sf__notice" style={{ marginBottom: '1rem' }}>
              <Icon name="shield" size={14} style={{ verticalAlign: '-2px', marginRight: '0.25rem' }} />
              Denomination selection and player info are for this order only. The
              exact total is confirmed server-side before payment.
            </p>

            <label className="tpt-field__label" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Quantity
            </label>
            <div className="sf__denoms" role="group" aria-label="Quantity">
              {[1, 2, 3, 5, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`sf__denom${quantity === n ? ' sf__denom--active' : ''}`}
                  onClick={() => setQuantity(n)}
                  aria-pressed={quantity === n}
                >
                  ×{n} — {formatIDR(priceMinor * n)}
                </button>
              ))}
            </div>

            <div className="sf__form" style={{ marginTop: '1.5rem' }}>
              <Input
                label="Player ID / User ID"
                required
                placeholder="e.g. 12345678"
                value={playerId}
                onChange={(e) => setPlayerIdLocal(e.target.value)}
                error={error && !playerId.trim() ? error : undefined}
                hint="Used for this order only — not stored."
              />
              <Input
                label="Server / Zone (optional)"
                placeholder="e.g. 2087"
                value={serverId}
                onChange={(e) => setServerIdLocal(e.target.value)}
              />
              {error && playerId.trim() && <p className="sf__error">{error}</p>}
              <Button type="button" variant="primary" size="lg" onClick={addToCart}>
                Continue to checkout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
